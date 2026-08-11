import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.models import BotSetting
from app.schemas import SettingsOut, SettingsUpdate
from app.config import settings as env_settings
from app.services.claude_engine import DEFAULT_SYSTEM_PROMPT

router = APIRouter(prefix="/api/settings", tags=["Bot Settings"])

def get_db_setting(db: DBSession, key: str, default: str) -> str:
    s = db.query(BotSetting).filter(BotSetting.key == key).first()
    return s.value if s else default

def set_db_setting(db: DBSession, key: str, value: str):
    s = db.query(BotSetting).filter(BotSetting.key == key).first()
    if s:
        s.value = value
        s.updated_at = datetime.datetime.utcnow()
    else:
        s = BotSetting(key=key, value=value)
        db.add(s)
    db.commit()

@router.get("", response_model=SettingsOut)
def get_settings(db: DBSession = Depends(get_db)):
    auto_reply = get_db_setting(db, "auto_reply_enabled", "true").lower() == "true"
    threshold = float(get_db_setting(db, "confidence_threshold", "0.85"))
    prompt = get_db_setting(db, "system_prompt", DEFAULT_SYSTEM_PROMPT)
    lang = get_db_setting(db, "language", "Auto-detect (Match Client)")
    tone_val = get_db_setting(db, "tone", "Warm & Luxurious Spa")
    sig = get_db_setting(db, "custom_signature", "thanks babe x")

    anthropic_ok = bool(env_settings.ANTHROPIC_API_KEY and not env_settings.ANTHROPIC_API_KEY.startswith("your_"))
    venice_ok = bool(env_settings.VENICE_API_KEY and not env_settings.VENICE_API_KEY.startswith("your_"))
    moonshot_ok = bool(env_settings.MOONSHOT_API_KEY and not env_settings.MOONSHOT_API_KEY.startswith("your_"))
    telnyx_ok = bool(env_settings.TELNYX_API_KEY and not env_settings.TELNYX_API_KEY.startswith("your_"))

    return SettingsOut(
        auto_reply_enabled=auto_reply,
        confidence_threshold=threshold,
        system_prompt=prompt,
        language=lang,
        tone=tone_val,
        custom_signature=sig,
        anthropic_api_key_configured=anthropic_ok,
        venice_api_key_configured=venice_ok,
        moonshot_api_key_configured=moonshot_ok,
        telnyx_configured=telnyx_ok
    )

@router.put("", response_model=SettingsOut)
def update_settings(payload: SettingsUpdate, db: DBSession = Depends(get_db)):
    if payload.auto_reply_enabled is not None:
        set_db_setting(db, "auto_reply_enabled", str(payload.auto_reply_enabled).lower())

    if payload.confidence_threshold is not None:
        set_db_setting(db, "confidence_threshold", str(payload.confidence_threshold))

    if payload.system_prompt is not None:
        set_db_setting(db, "system_prompt", payload.system_prompt)

    if payload.language is not None:
        set_db_setting(db, "language", payload.language)

    if payload.tone is not None:
        set_db_setting(db, "tone", payload.tone)

    if payload.custom_signature is not None:
        set_db_setting(db, "custom_signature", payload.custom_signature)

    return get_settings(db)
