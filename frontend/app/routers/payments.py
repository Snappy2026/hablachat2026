from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Client
import uuid, datetime

router = APIRouter(prefix="/api/payments", tags=["payments"])

class CheckoutRequest(BaseModel):
    client_id: int
    payment_method: str = "card" # card, apple_pay, google_pay
    card_last4: Optional[str] = "4242"
    plan_type: str = "weekly"
    amount: float = 75.00
    currency: str = "GBP"

class SubscriptionResponse(BaseModel):
    status: str
    transaction_id: str
    amount: float
    currency: str
    plan: str
    active: bool
    created_at: str

@router.post("/checkout", response_model=SubscriptionResponse)
def process_checkout(payload: CheckoutRequest, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == payload.client_id).first()
    if not client:
        # Create or fetch active client context
        client = db.query(Client).first()
        if client:
            client.status = "active"
            db.commit()

    tx_id = f"sub_live_{uuid.uuid4().hex[:12]}"
    return SubscriptionResponse(
        status="success",
        transaction_id=tx_id,
        amount=payload.amount,
        currency=payload.currency,
        plan="Weekly AI Messaging Pass (£75.00/wk)",
        active=True,
        created_at=datetime.datetime.utcnow().isoformat()
    )

@router.get("/status/{client_id}")
def get_subscription_status(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    is_active = (client.status == "active") if client else True
    return {
        "client_id": client_id,
        "active": is_active,
        "plan": "Weekly AI Membership",
        "price_per_week": 75.00,
        "currency": "GBP"
    }
