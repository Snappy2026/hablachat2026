import datetime
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.models import Client, BotSetting, ReviewItem, Booking, Message, Session
from app.schemas import (
    ClientRegister, ClientOut, OnboardingStatusOut, OnboardingCompleteRequest
)

logger = logging.getLogger("onboarding_router")
router = APIRouter(prefix="/api/onboarding", tags=["Client Onboarding"])


def get_setting(db: DBSession, key: str, default: str) -> str:
    s = db.query(BotSetting).filter(BotSetting.key == key).first()
    return s.value if s else default


@router.get("/status", response_model=OnboardingStatusOut)
def get_onboarding_status(db: DBSession = Depends(get_db)):
    """Check if any client has completed onboarding."""
    client = db.query(Client).filter(Client.status == "active").first()

    if client and client.onboarded_at:
        return OnboardingStatusOut(
            is_onboarded=True,
            client=ClientOut.model_validate(client)
        )

    # Check for partially registered (not yet completed)
    if client and not client.onboarded_at:
        return OnboardingStatusOut(
            is_onboarded=False,
            client=ClientOut.model_validate(client)
        )

    return OnboardingStatusOut(is_onboarded=False, client=None)


@router.get("/weekly-charge")
def get_weekly_charge(db: DBSession = Depends(get_db)):
    """Get the admin-configured weekly subscription charge."""
    charge = get_setting(db, "weekly_charge", "0.50")
    return {"weekly_charge": float(charge), "currency": "GBP", "symbol": "£"}


@router.post("/weekly-charge")
def update_weekly_charge(payload: dict, db: DBSession = Depends(get_db)):
    """Master Admin: Set weekly subscription charge."""
    new_charge = str(payload.get("weekly_charge", "0.50"))
    setting = db.query(BotSetting).filter(BotSetting.key == "weekly_charge").first()
    if not setting:
        setting = BotSetting(key="weekly_charge", value=new_charge)
        db.add(setting)
    else:
        setting.value = new_charge
    db.commit()
    return {"status": "ok", "weekly_charge": float(new_charge)}


@router.post("/register", response_model=ClientOut)
def register_business(payload: ClientRegister, db: DBSession = Depends(get_db)):
    """
    Step 1: Register basic business details.
    Creates or updates the client record.
    """
    # Check if email already registered
    existing = db.query(Client).filter(Client.email == payload.email).first()
    if existing:
        # Update existing registration
        existing.model_name = payload.model_name
        existing.address = payload.address
        existing.postcode = payload.postcode
        db.commit()
        db.refresh(existing)
        return existing

    weekly_charge = float(get_setting(db, "weekly_charge", "29.99"))

    try:
        client = Client(
            model_name=payload.model_name,
            email=payload.email,
            address=payload.address,
            postcode=payload.postcode,
            weekly_charge=weekly_charge,
            status="active"
        )
        db.add(client)
        db.commit()
        db.refresh(client)

        logger.info(f"New client registered: {client.model_name} ({client.email})")
        return client
    except Exception as err:
        db.rollback()
        logger.warning(f"Registration DB save warning: {err}")
        existing = db.query(Client).filter(Client.email == payload.email).first()
        if existing:
            return existing
        raise HTTPException(status_code=500, detail=str(err))


@router.post("/complete", response_model=ClientOut)
def complete_onboarding(payload: OnboardingCompleteRequest, db: DBSession = Depends(get_db)):
    """
    Final step: Mark client as fully onboarded.
    Saves video URL, phone number, and sets onboarded_at timestamp.
    Purges any previous demo conversations / review items for a clean slate.
    """
    client = db.query(Client).filter(Client.status == "active").order_by(Client.id.desc()).first()
    if not client:
        raise HTTPException(status_code=404, detail="No registered client found. Please complete Step 1 first.")

    import json
    if payload.entrance_video_url:
        client.entrance_video_url = payload.entrance_video_url

    if payload.photo_urls is not None:
        client.photo_urls = json.dumps(payload.photo_urls)

    if payload.phone_number:
        client.phone_number = payload.phone_number
        client.twilio_number_sid = payload.twilio_number_sid
        client.country_code = payload.country_code

    client.onboarded_at = datetime.datetime.utcnow()

    # Ensure complete clean slate for the newly onboarded user
    try:
        db.query(ReviewItem).delete()
        db.query(Booking).delete()
        db.query(Message).delete()
        db.query(Session).delete()
    except Exception as e:
        logger.warning(f"Clean slate purge notice: {e}")

    db.commit()
    db.refresh(client)

    logger.info(f"Client onboarding complete: {client.model_name} → {client.phone_number}")
    return client


@router.get("/client", response_model=ClientOut)
def get_current_client(db: DBSession = Depends(get_db)):
    """Get the current active client profile."""
    client = db.query(Client).filter(Client.status == "active").order_by(Client.id.desc()).first()
    if not client:
        raise HTTPException(status_code=404, detail="No client profile found.")
    return client


@router.get("/clients")
def get_all_clients(db: DBSession = Depends(get_db)):
    """Master Admin: Get list of all registered clients and models."""
    clients = db.query(Client).order_by(Client.id.desc()).all()
    return [
        {
            "id": c.id,
            "model_name": c.model_name,
            "email": c.email,
            "phone_number": c.phone_number or "+1 (260) 366-0928",
            "status": c.status,
            "onboarded_at": c.onboarded_at.isoformat() if c.onboarded_at else "Pending Payment",
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "passcode": c.passcode or "197666666"
        }
        for c in clients
    ]


@router.post("/clients/{client_id}/status")
def update_client_status(client_id: int, payload: dict, db: DBSession = Depends(get_db)):
    """Master Admin: Suspend or Reactivate a model account."""
    new_status = payload.get("status", "active")
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found.")
    client.status = new_status
    db.commit()
    return {"status": "ok", "client_id": client_id, "new_status": new_status}


@router.post("/clients/{client_id}/phone")
def update_client_phone(client_id: int, payload: dict, db: DBSession = Depends(get_db)):
    """Master Admin: Reassign or update Twilio line for a model."""
    new_phone = payload.get("phone_number")
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found.")
    client.phone_number = new_phone
    db.commit()
    return {"status": "ok", "client_id": client_id, "new_phone": new_phone}


@router.post("/clients/{client_id}/passcode")
def update_client_passcode(client_id: int, payload: dict, db: DBSession = Depends(get_db)):
    """Master Admin: Set or update passcode/PIN for a model account."""
    new_passcode = payload.get("passcode", "197666666")
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found.")
    client.passcode = new_passcode
    db.commit()
    return {"status": "ok", "client_id": client_id, "new_passcode": new_passcode}
