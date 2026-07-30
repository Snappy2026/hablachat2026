import datetime
import logging
from typing import Optional
from fastapi import APIRouter, Depends, Form, Request, HTTPException
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.models import Session, Message, ReviewItem, Booking, BotSetting
from app.schemas import SimulatorRequest
from app.services.claude_engine import claude_engine
from app.services.twilio_service import twilio_service
from app.services.websocket_mgr import ws_manager

logger = logging.getLogger("webhooks_router")
router = APIRouter(prefix="/api/webhooks", tags=["Webhooks & Simulator"])

def get_setting(db: DBSession, key: str, default: str) -> str:
    setting = db.query(BotSetting).filter(BotSetting.key == key).first()
    return setting.value if setting else default

async def process_inbound_message(
    db: DBSession,
    phone_number: str,
    message_body: str,
    channel: str = "sms",
    client_name: Optional[str] = None
):
    # Normalize phone number
    clean_phone = phone_number.replace("whatsapp:", "").strip()
    
    # 1. Lookup or Create Session
    session_obj = db.query(Session).filter(Session.phone_number == clean_phone).first()
    if not session_obj:
        session_obj = Session(
            phone_number=clean_phone,
            channel=channel,
            client_name=client_name or f"Client ({clean_phone[-4:]})",
            unread_count=0
        )
        db.add(session_obj)
        db.commit()
        db.refresh(session_obj)

    session_obj.unread_count += 1
    session_obj.last_message_at = datetime.datetime.utcnow()
    if client_name and not session_obj.client_name:
        session_obj.client_name = client_name

    # 2. Record Customer Inbound Message
    client_msg = Message(
        session_id=session_obj.id,
        sender="client",
        content=message_body,
        status="received"
    )
    db.add(client_msg)
    db.commit()
    db.refresh(client_msg)

    # 3. Fetch Settings
    auto_reply_setting = get_setting(db, "auto_reply_enabled", "true").lower() == "true"
    threshold_setting = float(get_setting(db, "confidence_threshold", "0.85"))
    system_prompt = get_setting(db, "system_prompt", "")
    language_setting = get_setting(db, "language", "Auto-detect (Match Client)")
    tone_setting = get_setting(db, "tone", "Warm & Luxurious Spa")
    signature_setting = get_setting(db, "custom_signature", "thanks babe x")

    # Retrieve conversation history
    history_msgs = db.query(Message).filter(Message.session_id == session_obj.id).order_by(Message.timestamp.desc()).limit(6).all()
    formatted_history = []
    for m in reversed(history_msgs[:-1]):
        role = "assistant" if m.sender in ["bot", "manager"] else "user"
        formatted_history.append({"role": role, "content": m.content})

    # 4. Claude (Haiku 4.5) Analysis
    analysis = claude_engine.analyze_message(
        message_body=message_body,
        history=formatted_history,
        custom_prompt=system_prompt if system_prompt else None,
        language=language_setting,
        tone=tone_setting,
        signature=signature_setting
    )

    client_msg.intent = analysis.intent
    client_msg.confidence = analysis.confidence

    # Determine if review is needed
    needs_review = (
        analysis.requires_human_review
        or not auto_reply_setting
        or (analysis.confidence < threshold_setting)
    )

    if needs_review:
        # Create Review Item
        client_msg.status = "pending_review"
        db.commit()

        review_item = ReviewItem(
            message_id=client_msg.id,
            session_id=session_obj.id,
            proposed_reply=analysis.reply_text,
            review_reason=analysis.review_reason or ("Low confidence score" if analysis.confidence < threshold_setting else "Manual review policy active"),
            confidence=analysis.confidence,
            intent=analysis.intent,
            status="pending"
        )
        db.add(review_item)
        db.commit()
        db.refresh(review_item)

        # Broadcast via WebSocket to PWA
        await ws_manager.broadcast("NEW_REVIEW_ITEM", {
            "review_id": review_item.id,
            "session_id": session_obj.id,
            "client_name": session_obj.client_name,
            "phone_number": session_obj.phone_number,
            "client_message": message_body,
            "proposed_reply": analysis.reply_text,
            "review_reason": review_item.review_reason,
            "intent": analysis.intent,
            "confidence": analysis.confidence
        })

        return {
            "status": "queued_for_review",
            "review_id": review_item.id,
            "proposed_reply": analysis.reply_text,
            "intent": analysis.intent
        }

    else:
        # Auto Send AI Reply
        client_msg.status = "processed"
        
        bot_msg = Message(
            session_id=session_obj.id,
            sender="bot",
            content=analysis.reply_text,
            intent=analysis.intent,
            confidence=analysis.confidence,
            status="sent"
        )
        db.add(bot_msg)
        db.commit()
        db.refresh(bot_msg)

        # Send via Twilio
        twilio_sid = twilio_service.send_message(
            to_number=session_obj.phone_number,
            body=analysis.reply_text,
            channel=session_obj.channel
        )
        bot_msg.twilio_sid = twilio_sid
        db.commit()

        # Handle Extracted Booking if present
        if analysis.extracted_booking:
            eb = analysis.extracted_booking
            booking = Booking(
                session_id=session_obj.id,
                client_name=eb.client_name or session_obj.client_name or "Valued Guest",
                phone_number=session_obj.phone_number,
                service_name=eb.service_type or "Deep Tissue Massage",
                booking_date=eb.requested_date or "Tomorrow",
                booking_time=eb.requested_time or "3:00 PM",
                duration_minutes=eb.duration_minutes or 60,
                party_size=eb.party_size or 1,
                status="pending",
                notes=eb.notes
            )
            db.add(booking)
            db.commit()
            
            await ws_manager.broadcast("BOOKING_CREATED", {
                "booking_id": booking.id,
                "client_name": booking.client_name,
                "service_name": booking.service_name,
                "booking_date": booking.booking_date,
                "booking_time": booking.booking_time
            })

        # Broadcast message to PWA
        await ws_manager.broadcast("MESSAGE_RECEIVED", {
            "session_id": session_obj.id,
            "client_message": message_body,
            "bot_reply": analysis.reply_text,
            "status": "auto_sent"
        })

        return {
            "status": "auto_replied",
            "reply_text": analysis.reply_text,
            "twilio_sid": twilio_sid
        }

@router.post("/twilio")
@router.post("/sms")
async def twilio_webhook(
    request: Request,
    From: str = Form(...),
    Body: str = Form(...),
    ProfileName: Optional[str] = Form(None),
    db: DBSession = Depends(get_db)
):
    """
    Standard Twilio Webhook Receiver for SMS & WhatsApp.
    """
    channel = "whatsapp" if From.startswith("whatsapp:") else "sms"
    res = await process_inbound_message(
        db=db,
        phone_number=From,
        message_body=Body,
        channel=channel,
        client_name=ProfileName
    )
    return {"status": "ok", "result": res}

@router.post("/telnyx")
async def telnyx_webhook(
    request: Request,
    db: DBSession = Depends(get_db)
):
    """
    Telnyx Webhook Receiver for Instant SMS.
    """
    try:
        data = await request.json()
        payload = data.get("data", {}).get("payload", {})
        from_num = payload.get("from", {}).get("phone_number", "")
        text_body = payload.get("text", "")
        if from_num and text_body:
            res = await process_inbound_message(
                db=db,
                phone_number=from_num,
                message_body=text_body,
                channel="sms"
            )
            return {"status": "ok", "result": res}
    except Exception as e:
        logger.error(f"Telnyx webhook parse error: {e}")
    return {"status": "ok"}

@router.post("/simulator")
async def simulator_webhook(
    payload: SimulatorRequest,
    db: DBSession = Depends(get_db)
):
    """
    Simulator endpoint to test customer messages from the PWA Admin UI.
    """
    res = await process_inbound_message(
        db=db,
        phone_number=payload.phone_number,
        message_body=payload.message_body,
        channel=payload.channel,
        client_name=payload.client_name
    )
    return {"status": "success", "result": res}
