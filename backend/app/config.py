import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Anthropic AI (Claude Haiku 4.5) API Settings
    ANTHROPIC_API_KEY: str = "your_anthropic_api_key_here"
    ANTHROPIC_BASE_URL: str = "https://api.anthropic.com/v1"
    ANTHROPIC_MODEL: str = "claude-haiku-4-5-20251001"

    # Legacy alias support
    MOONSHOT_API_KEY: str = ""
    MOONSHOT_BASE_URL: str = ""
    MOONSHOT_MODEL: str = ""

    # Twilio Messaging Settings
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_PHONE_NUMBER: str = os.getenv("TWILIO_PHONE_NUMBER", "+18005550199")

    # Telnyx Messaging Settings (Instant UK & EU numbers)
    TELNYX_API_KEY: str = os.getenv("TELNYX_API_KEY", "")
    STRIPE_PUBLISHABLE_KEY: str = os.getenv("STRIPE_PUBLISHABLE_KEY", "pk_live_51SzkD5FBujpvbBXm92Ip2lz7GSeYnQmE62kgp4VFICpKqGBYbHCNEqaBuymgUU1BJtzrfLNXxuom6e9ay2hj6upy00YHFvCIQi")
    STRIPE_SECRET_KEY: str = os.getenv("STRIPE_SECRET_KEY", "")

    # Database and Application Settings
    DATABASE_URL: str = "sqlite:////tmp/massage_bot.db"
    AUTO_REPLY_DEFAULT: bool = True
    CONFIDENCE_THRESHOLD: float = 0.85
    SECRET_KEY: str = "super-secret-massage-bot-key-2026"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
