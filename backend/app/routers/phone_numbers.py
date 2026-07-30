import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.schemas import PhoneNumberSearchResult, PhoneNumberPurchaseRequest
from app.services.twilio_numbers import twilio_numbers_service

logger = logging.getLogger("phone_numbers_router")
router = APIRouter(prefix="/api/phone-numbers", tags=["Phone Numbers"])


@router.get("/search", response_model=list[PhoneNumberSearchResult])
def search_available_numbers(
    country: str = Query("GB", description="Country code (GB, US, etc.)"),
    area_code: str = Query(None, description="Area code to filter by"),
    contains: str = Query(None, description="Keyword or digits the number should contain"),
    db: DBSession = Depends(get_db)
):
    """Search Twilio's inventory for available phone numbers."""
    results = twilio_numbers_service.search_available_numbers(
        country_code=country,
        area_code=area_code,
        contains=contains,
        limit=10
    )
    return results


@router.post("/purchase")
def purchase_phone_number(
    payload: PhoneNumberPurchaseRequest,
    db: DBSession = Depends(get_db)
):
    """Purchase a phone number from Twilio and provision it with webhook URLs."""
    result = twilio_numbers_service.purchase_number(
        phone_number=payload.phone_number,
        webhook_base_url="https://your-domain.com"  # Updated when deploying
    )

    return {
        "status": "success",
        "phone_number": result["phone_number"],
        "twilio_sid": result["twilio_sid"],
        "provision_status": result["status"]
    }
