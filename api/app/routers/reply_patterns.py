from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.models import ReplyPattern

router = APIRouter(prefix="/api/reply-library", tags=["Reply Library"])

class ReplyPatternSchema(BaseModel):
    id: Optional[int] = None
    category: str = "general"
    keywords: str
    preferred_reply: str
    auto_send: bool = True
    confidence_score: float = 0.98

    class Config:
        from_attributes = True

@router.get("", response_model=List[ReplyPatternSchema])
def get_reply_patterns(db: DBSession = Depends(get_db)):
    """
    List all stored client inquiry simulations and preferred replies.
    """
    return db.query(ReplyPattern).order_by(ReplyPattern.id.asc()).all()

@router.post("", response_model=ReplyPatternSchema)
def create_reply_pattern(payload: ReplyPatternSchema, db: DBSession = Depends(get_db)):
    """
    Add a new client simulation query and preferred response to the library.
    """
    pattern = ReplyPattern(
        category=payload.category,
        keywords=payload.keywords,
        preferred_reply=payload.preferred_reply,
        auto_send=payload.auto_send,
        confidence_score=payload.confidence_score
    )
    db.add(pattern)
    db.commit()
    db.refresh(pattern)
    return pattern

@router.delete("/{pattern_id}")
def delete_reply_pattern(pattern_id: int, db: DBSession = Depends(get_db)):
    """
    Remove a simulation reply pattern from the library.
    """
    pattern = db.query(ReplyPattern).filter(ReplyPattern.id == pattern_id).first()
    if not pattern:
        raise HTTPException(status_code=404, detail="Reply pattern not found")

    db.delete(pattern)
    db.commit()
    return {"status": "success", "deleted_id": pattern_id}
