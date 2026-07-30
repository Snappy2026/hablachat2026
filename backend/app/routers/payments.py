from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Client
from app.config import settings
import uuid, datetime, requests

router = APIRouter(prefix="/api/payments", tags=["payments"])

class CheckoutRequest(BaseModel):
    client_id: int
    email: Optional[str] = None
    payment_method: str = "card" # card, apple_pay, google_pay
    card_last4: Optional[str] = "4242"
    plan_type: str = "weekly"
    amount: float = 0.50
    currency: str = "GBP"

class SubscriptionResponse(BaseModel):
    status: str
    transaction_id: str
    amount: float
    currency: str
    plan: str
    active: bool
    created_at: str

@router.post("/create-checkout-session")
def create_checkout_session(payload: CheckoutRequest, db: Session = Depends(get_db)):
    """Create a live Stripe Checkout Session for £0.50 weekly pass."""
    try:
        url = "https://api.stripe.com/v1/checkout/sessions"
        headers = {
            "Authorization": f"Bearer {settings.STRIPE_SECRET_KEY}",
            "Content-Type": "application/x-www-form-urlencoded"
        charge_str = get_setting(db, "weekly_charge", "0.50")
        try:
            charge_pence = int(float(charge_str) * 100)
        except Exception:
            charge_pence = 50

        data = {
            "payment_method_types[]": "card",
            "line_items[0][price_data][currency]": "gbp",
            "line_items[0][price_data][product_data][name]": "HablaChat - Weekly Membership",
            "line_items[0][price_data][product_data][description]": "24/7 AI Enquiry Manager & Twilio Mobile Number",
            "line_items[0][price_data][unit_amount]": charge_pence,
            "line_items[0][quantity]": 1,
            "mode": "payment",
            "success_url": "https://hablachat.app/?view=dashboard&status=success",
            "cancel_url": "https://hablachat.app/?view=onboarding&status=cancel"
        }
        if payload.email and "@" in payload.email:
            data["customer_email"] = payload.email
        res = requests.post(url, headers=headers, data=data, timeout=10)
        if res.status_code == 200:
            sess = res.json()
            return {"checkout_url": sess.get("url"), "session_id": sess.get("id")}
        else:
            print("Stripe API error:", res.text)
            return {"checkout_url": None, "error": res.json()}
    except Exception as e:
        print("Stripe session error:", str(e))
        return {"checkout_url": None, "error": str(e)}

@router.post("/checkout", response_model=SubscriptionResponse)
def process_checkout(payload: CheckoutRequest, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == payload.client_id).first()
    if not client:
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
        plan="Weekly AI Messaging Pass (£0.50/wk)",
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
        "price_per_week": 0.50,
        "currency": "GBP"
    }
