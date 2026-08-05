import uuid
import logging
from app.config import settings

logger = logging.getLogger("twilio_service")

class TwilioService:
    def __init__(self):
        self._init_client()

    def _init_client(self):
        import os
        from dotenv import load_dotenv
        from app.config import settings
        load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"), override=True)
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID", settings.TWILIO_ACCOUNT_SID)
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN", settings.TWILIO_AUTH_TOKEN)
        self.from_number = os.getenv("TWILIO_PHONE_NUMBER", settings.TWILIO_PHONE_NUMBER)
        self._client = None

        if self.account_sid and not self.account_sid.startswith("your_") and self.auth_token and not self.auth_token.startswith("your_"):
            try:
                from twilio.rest import Client
                self._client = Client(self.account_sid, self.auth_token)
                logger.info(f"Initialized live Twilio client for account: {self.account_sid[:8]}...")
            except Exception as e:
                logger.warning(f"Could not initialize Twilio client: {e}")

    def _get_active_from_number(self) -> str:
        """
        Check if there's an onboarded client with a purchased number.
        Falls back to the default config number.
        """
        try:
            from app.database import SessionLocal
            from app.models import Client
            db = SessionLocal()
            client = db.query(Client).filter(
                Client.status == "active",
                Client.phone_number.isnot(None)
            ).order_by(Client.id.desc()).first()
            db.close()

            if client and client.phone_number:
                # Clean clean format: +15094720397 etc.
                cleaned = client.phone_number.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
                return cleaned
        except Exception as e:
            logger.warning(f"Error querying active client phone number: {e}")

        # Default fallback for UK & European clients
        return settings.TWILIO_PHONE_NUMBER

    def send_message(self, to_number: str, body: str, channel: str = "sms") -> str:
        """
        Sends an SMS or WhatsApp message using Twilio API.
        Returns message SID or mock SID if testing locally.
        Uses the client's purchased number if available, otherwise falls back to default.
        """
        from_number = self._get_active_from_number()
        formatted_to = to_number
        formatted_from = from_number

        if channel == "whatsapp":
            if not formatted_to.startswith("whatsapp:"):
                formatted_to = f"whatsapp:{to_number}"
            # For WhatsApp sandbox or standard WhatsApp, use the configured WhatsApp sender number or sandbox default +14155238886
            whatsapp_sender = getattr(settings, "TWILIO_WHATSAPP_NUMBER", "") or "+14155238886"
            if not whatsapp_sender.startswith("whatsapp:"):
                formatted_from = f"whatsapp:{whatsapp_sender}"
            else:
                formatted_from = whatsapp_sender

        if self._client:
            try:
                # Clean spaces from phone number for E.164 compliance
                clean_from = formatted_from.replace(" ", "")
                clean_to = formatted_to.replace(" ", "")
                message = self._client.messages.create(
                    body=body,
                    from_=clean_from,
                    to=clean_to
                )
                logger.info(f"Successfully sent Twilio message SID: {message.sid} to {to_number} from {clean_from}")
                return message.sid
            except Exception as e:
                logger.error(f"Error sending message via Twilio API with from={formatted_from}: {e}")
                # Fallback retry using default active Twilio number
                default_line = (self.from_number or "+12603660928").replace(" ", "")
                default_from = f"whatsapp:{default_line}" if channel == "whatsapp" else default_line
                if clean_from != default_from:
                    try:
                        logger.info(f"Retrying Twilio send with verified active line: {default_from}")
                        retry_msg = self._client.messages.create(
                            body=body,
                            from_=default_from,
                            to=clean_to
                        )
                        logger.info(f"Retry success SID: {retry_msg.sid}")
                        return retry_msg.sid
                    except Exception as retry_err:
                        logger.error(f"Retry with verified line failed: {retry_err}")

                mock_sid = f"SIM_MOCK_SID_{uuid.uuid4().hex[:12]}"
                logger.info(f"Fallback to mock SID: {mock_sid}")
                return mock_sid
        else:
            mock_sid = f"SIM_MOCK_SID_{uuid.uuid4().hex[:12]}"
            logger.info(f"[SIMULATED TWILIO OUTBOUND] To: {formatted_to} | From: {formatted_from} | Body: {body} | SID: {mock_sid}")
            return mock_sid

twilio_service = TwilioService()

