import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.models import Session, Message
from app.schemas import SessionOut, MessageOut, MessageCreate
from app.services.telnyx_service import telnyx_service
from app.services.websocket_mgr import ws_manager

router = APIRouter(prefix="/api/sessions", tags=["Customer Conversations"])

@router.get("", response_model=List[SessionOut])
def get_sessions(db: DBSession = Depends(get_db)):
    """
    List all active conversation sessions sorted by most recent activity.
    """
    return db.query(Session).order_by(Session.last_message_at.desc()).all()

@router.get("/{session_id}/messages", response_model=List[MessageOut])
def get_session_messages(session_id: int, db: DBSession = Depends(get_db)):
    """
    Get full chat history for a session and mark unread count as zero.
    """
    session_obj = db.query(Session).filter(Session.id == session_id).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")

    session_obj.unread_count = 0
    db.commit()

    return db.query(Message).filter(Message.session_id == session_id).order_by(Message.timestamp.asc()).all()

@router.post("/{session_id}/reply")
async def send_manual_reply(
    session_id: int,
    payload: MessageCreate,
    db: DBSession = Depends(get_db)
):
    """
    Manager manual override response to client.
    """
    session_obj = db.query(Session).filter(Session.id == session_id).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")

    session_obj.last_message_at = datetime.datetime.utcnow()

    # Create Manager Message
    msg = Message(
        session_id=session_obj.id,
        sender="manager",
        content=payload.content,
        intent="manual_override",
        confidence=1.0,
        status="sent"
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    # Dispatch via Telnyx
    twilio_sid = telnyx_service.send_message(
        to_number=session_obj.phone_number,
        body=payload.content
    )
    msg.twilio_sid = twilio_sid
    db.commit()

    await ws_manager.broadcast("MESSAGE_SENT", {
        "session_id": session_obj.id,
        "content": payload.content,
        "sender": "manager",
        "twilio_sid": twilio_sid
    })

    return {
        "status": "success",
        "message_id": msg.id,
        "twilio_sid": twilio_sid
    }
