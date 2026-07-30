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
    TWILIO_ACCOUNT_SID: str = "your_twilio_account_sid_here"
    TWILIO_AUTH_TOKEN: str = "your_twilio_auth_token_here"
    TWILIO_PHONE_NUMBER: str = "+18005550199"

    # Stripe Payment Gateway Settings (Loaded from environment)
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_SECRET_KEY: str = ""

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
