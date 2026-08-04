from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, Field

# Claude (Haiku 4.5) Structured Output Model
class ExtractedBookingData(BaseModel):
    client_name: Optional[str] = None
    service_type: Optional[str] = None
    requested_date: Optional[str] = None
    requested_time: Optional[str] = None
    duration_minutes: Optional[int] = 60
    party_size: Optional[int] = 1
    notes: Optional[str] = None

class ClaudeAnalysisOutput(BaseModel):
    reply_text: str = Field(description="The suggested polite, casual WhatsApp/SMS response text to send to the client.")
    intent: str = Field(description="Intent category: booking_inquiry, reschedule, cancellation, pricing, complaint, custom_request, or general_faq")
    confidence: float = Field(description="Confidence score from 0.0 to 1.0")
    requires_human_review: bool = Field(description="True if human review is required due to low confidence, pricing negotiation, complaint, or complex custom request.")
    review_reason: Optional[str] = Field(default="Standard AI review", description="Explanation of why human review is required.")
    extracted_booking: Optional[ExtractedBookingData] = None

KimiAnalysisOutput = ClaudeAnalysisOutput

# API Request / Response Models
class MessageBase(BaseModel):
    sender: str
    content: str
    intent: Optional[str] = None
    confidence: Optional[float] = None
    status: Optional[str] = "sent"

class MessageCreate(MessageBase):
    pass

class MessageOut(MessageBase):
    id: int
    session_id: int
    twilio_sid: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

class SessionOut(BaseModel):
    id: int
    phone_number: str
    channel: str
    client_name: Optional[str] = None
    unread_count: int
    last_message_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True

class ReviewItemOut(BaseModel):
    id: int
    message_id: int
    session_id: int
    proposed_reply: str
    review_reason: str
    confidence: float
    intent: str
    status: str
    created_at: datetime
    session: Optional[SessionOut] = None
    message: Optional[MessageOut] = None

    class Config:
        from_attributes = True

class ApproveReviewRequest(BaseModel):
    custom_reply: Optional[str] = None

class BookingOut(BaseModel):
    id: int
    session_id: int
    client_name: str
    phone_number: str
    service_name: str
    booking_date: str
    booking_time: str
    duration_minutes: int
    party_size: int
    status: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class SimulatorRequest(BaseModel):
    phone_number: str = "+14155552671"
    channel: str = "whatsapp" # "sms" or "whatsapp"
    client_name: Optional[str] = "Sarah Jenkins"
    message_body: str

class SettingsOut(BaseModel):
    auto_reply_enabled: bool
    confidence_threshold: float
    system_prompt: str
    language: str = "Auto-detect (Match Client)"
    tone: str = "Warm & Luxurious Spa"
    custom_signature: Optional[str] = "thanks babe x"
    anthropic_api_key_configured: bool = False
    moonshot_api_key_configured: bool = False
    twilio_configured: bool

class SettingsUpdate(BaseModel):
    auto_reply_enabled: Optional[bool] = None
    confidence_threshold: Optional[float] = None
    system_prompt: Optional[str] = None
    language: Optional[str] = None
    tone: Optional[str] = None
    custom_signature: Optional[str] = None
    photo_urls: Optional[List[str]] = None
    entrance_video_url: Optional[str] = None

# Client Onboarding Models
class ClientRegister(BaseModel):
    model_name: str
    email: str
    address: str
    postcode: str

class ClientOut(BaseModel):
    id: int
    model_name: str
    email: str
    address: str
    postcode: str
    entrance_video_url: Optional[str] = None
    photo_urls: Optional[str] = None
    phone_number: Optional[str] = None
    twilio_number_sid: Optional[str] = None
    country_code: str = "GB"
    weekly_charge: float = 0.0
    status: str = "active"
    onboarded_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class OnboardingStatusOut(BaseModel):
    is_onboarded: bool
    client: Optional[ClientOut] = None

class PhoneNumberSearchResult(BaseModel):
    phone_number: str
    friendly_name: str
    locality: Optional[str] = None
    region: Optional[str] = None
    country_code: str = "GB"
    monthly_cost: str = "£1.00"

class PhoneNumberPurchaseRequest(BaseModel):
    phone_number: str
    country_code: str = "GB"

class OnboardingCompleteRequest(BaseModel):
    entrance_video_url: Optional[str] = None
    photo_urls: Optional[List[str]] = None
    phone_number: Optional[str] = None
    twilio_number_sid: Optional[str] = None
    country_code: str = "GB"
