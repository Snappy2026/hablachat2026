import datetime
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession, joinedload

from app.database import get_db
from app.models import ReviewItem, Message, Session, Booking
from app.schemas import ReviewItemOut, ApproveReviewRequest
from app.services.twilio_service import twilio_service
from app.services.websocket_mgr import ws_manager

logger = logging.getLogger("reviews_router")
router = APIRouter(prefix="/api/reviews", tags=["Review Queue"])

@router.get("/pending", response_model=List[ReviewItemOut])
def get_pending_reviews(db: DBSession = Depends(get_db)):
    """
    Get all pending manager review queue items.
    """
    reviews = (
        db.query(ReviewItem)
        .options(joinedload(ReviewItem.session), joinedload(ReviewItem.message))
        .filter(ReviewItem.status == "pending")
        .order_by(ReviewItem.created_at.desc())
        .all()
    )
    return reviews

@router.post("/{review_id}/approve")
async def approve_review(
    review_id: int,
    payload: Optional[ApproveReviewRequest] = None,
    db: DBSession = Depends(get_db)
):
    """
    Approve proposed AI draft (or edited version) and send via Twilio.
    """
    review = db.query(ReviewItem).filter(ReviewItem.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review item not found")

    if review.status != "pending":
        raise HTTPException(status_code=400, detail="Review item is already processed")

    session_obj = db.query(Session).filter(Session.id == review.session_id).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")

    send_text = (payload.custom_reply if payload and payload.custom_reply else review.proposed_reply).strip()

    # Update review item status
    review.status = "edited" if (payload and payload.custom_reply) else "approved"
    review.reviewed_at = datetime.datetime.utcnow()

    # Create Bot/Manager Reply Message
    outbound_msg = Message(
        session_id=session_obj.id,
        sender="bot" if not (payload and payload.custom_reply) else "manager",
        content=send_text,
        intent=review.intent,
        confidence=review.confidence,
        status="sent"
    )
    db.add(outbound_msg)
    db.commit()
    db.refresh(outbound_msg)

    # Dispatch via Twilio
    twilio_sid = twilio_service.send_message(
        to_number=session_obj.phone_number,
        body=send_text,
        channel=session_obj.channel
    )
    outbound_msg.twilio_sid = twilio_sid
    db.commit()

    # Broadcast real-time update
    await ws_manager.broadcast("REVIEW_RESOLVED", {
        "review_id": review.id,
        "action": review.status,
        "sent_text": send_text,
        "session_id": session_obj.id
    })

    return {
        "status": "success",
        "action": review.status,
        "sent_text": send_text,
        "twilio_sid": twilio_sid
    }

@router.post("/{review_id}/reject")
async def reject_review(review_id: int, db: DBSession = Depends(get_db)):
    """
    Reject AI draft. Message remains in history, allowing manager to manual takeover.
    """
    review = db.query(ReviewItem).filter(ReviewItem.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review item not found")

    review.status = "rejected"
    review.reviewed_at = datetime.datetime.utcnow()
    db.commit()

    await ws_manager.broadcast("REVIEW_RESOLVED", {
        "review_id": review.id,
        "action": "rejected",
        "session_id": review.session_id
    })

    return {"status": "success", "action": "rejected"}
