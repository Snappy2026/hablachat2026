import datetime
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String(50), unique=True, index=True, nullable=False)
    channel = Column(String(20), default="sms") # "sms" or "whatsapp"
    client_name = Column(String(100), nullable=True)
    unread_count = Column(Integer, default=0)
    last_message_at = Column(DateTime, default=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    messages = relationship("Message", back_populates="session", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="session", cascade="all, delete-orphan")
    review_items = relationship("ReviewItem", back_populates="session", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    sender = Column(String(20), nullable=False) # "client", "bot", "manager"
    content = Column(Text, nullable=False)
    intent = Column(String(50), nullable=True)
    confidence = Column(Float, nullable=True)
    status = Column(String(30), default="received") # "received", "pending_review", "sent", "rejected", "failed"
    twilio_sid = Column(String(100), nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("Session", back_populates="messages")
    review_item = relationship("ReviewItem", back_populates="message", uselist=False, cascade="all, delete-orphan")

class ReviewItem(Base):
    __tablename__ = "review_items"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    proposed_reply = Column(Text, nullable=False)
    review_reason = Column(String(255), nullable=False)
    confidence = Column(Float, default=0.0)
    intent = Column(String(50), default="general_faq")
    status = Column(String(20), default="pending") # "pending", "approved", "edited", "rejected"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)

    message = relationship("Message", back_populates="review_item")
    session = relationship("Session", back_populates="review_items")

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    client_name = Column(String(100), nullable=False)
    phone_number = Column(String(50), nullable=False)
    service_name = Column(String(100), nullable=False)
    booking_date = Column(String(30), nullable=False)
    booking_time = Column(String(30), nullable=False)
    duration_minutes = Column(Integer, default=60)
    party_size = Column(Integer, default=1)
    status = Column(String(20), default="pending") # "pending", "confirmed", "cancelled"
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("Session", back_populates="bookings")

class BotSetting(Base):
    __tablename__ = "bot_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class ReplyPattern(Base):
    __tablename__ = "reply_patterns"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(50), default="general") # arrival, pricing, booking, discount
    keywords = Column(Text, nullable=False) # comma-separated keywords or intent trigger
    preferred_reply = Column(Text, nullable=False)
    auto_send = Column(Boolean, default=True)
    confidence_score = Column(Float, default=0.98)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(100), nullable=False)
    email = Column(String(200), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    passcode = Column(String(50), default="197666666")
    address = Column(Text, nullable=False)
    postcode = Column(String(20), nullable=False)
    entrance_video_url = Column(Text, nullable=True)
    photo_urls = Column(Text, nullable=True)  # JSON array string of model photo URLs
    phone_number = Column(String(50), nullable=True)  # Purchased Twilio number (E.164)
    twilio_number_sid = Column(String(100), nullable=True)  # Twilio PN SID
    country_code = Column(String(10), default="GB")
    weekly_charge = Column(Float, default=0.50)
    status = Column(String(20), default="active")  # "pending", "active", "cancelled", "suspended"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    onboarded_at = Column(DateTime, nullable=True)
