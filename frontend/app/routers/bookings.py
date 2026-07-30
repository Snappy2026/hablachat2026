from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.models import Booking
from app.schemas import BookingOut

router = APIRouter(prefix="/api/bookings", tags=["Massage Bookings"])

@router.get("", response_model=List[BookingOut])
def get_bookings(db: DBSession = Depends(get_db)):
    """
    List all extracted massage appointment bookings.
    """
    return db.query(Booking).order_by(Booking.created_at.desc()).all()

@router.post("/{booking_id}/status")
def update_booking_status(
    booking_id: int,
    status: str,
    db: DBSession = Depends(get_db)
):
    """
    Update booking status (pending, confirmed, cancelled).
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking.status = status
    db.commit()
    return {"status": "success", "booking_id": booking.id, "new_status": booking.status}
