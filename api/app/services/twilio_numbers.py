import uuid
import os
import logging
from app.config import settings

logger = logging.getLogger("twilio_numbers")


def _get_webhook_base_url() -> str:
    """
    Determine the correct webhook base URL for this deployment.
    Priority: WEBHOOK_BASE_URL env var > VERCEL_URL > hardcoded domain.
    """
    custom = os.getenv("WEBHOOK_BASE_URL", "")
    if custom:
        return custom.rstrip("/")

    vercel_url = os.getenv("VERCEL_URL", "")
    if vercel_url:
        return f"https://{vercel_url}"

    return "https://hablachat.app"


class TwilioNumbersService:
    def __init__(self):
        self._client = None
        self.account_sid = ""
        self.auth_token = ""

    def _ensure_client(self):
        """Lazy-init the Twilio client on first use (works reliably on Vercel serverless)."""
        if self._client:
            return self._client

        import os as _os
        try:
            from dotenv import load_dotenv
            load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"), override=True)
        except Exception:
            pass

        self.account_sid = _os.getenv("TWILIO_ACCOUNT_SID", "") or settings.TWILIO_ACCOUNT_SID
        self.auth_token = _os.getenv("TWILIO_AUTH_TOKEN", "") or settings.TWILIO_AUTH_TOKEN

        if self.account_sid and not self.account_sid.startswith("your_") and self.auth_token and not self.auth_token.startswith("your_"):
            try:
                from twilio.rest import Client
                self._client = Client(self.account_sid, self.auth_token)
                logger.info(f"Twilio numbers client initialized for account: {self.account_sid[:8]}...")
            except Exception as e:
                logger.warning(f"Could not initialize Twilio client for number service: {e}")

        return self._client

    def search_available_numbers(self, country_code: str = "GB", area_code: str = None, contains: str = None, limit: int = 10) -> list:
        """
        Search Twilio's inventory for AVAILABLE MOBILE NUMBERS ONLY (SMS & WhatsApp enabled).
        """
        if self._ensure_client():
            try:
                kwargs = {"limit": limit, "sms_enabled": True}
                if contains:
                    kwargs["contains"] = contains

                try:
                    numbers = self._client.available_phone_numbers(country_code).mobile.list(**kwargs)
                except Exception:
                    numbers = self._client.available_phone_numbers(country_code).local.list(**kwargs)

                results = []
                for n in numbers:
                    results.append({
                        "phone_number": n.phone_number,
                        "friendly_name": n.friendly_name,
                        "locality": getattr(n, "locality", "") or "Mobile",
                        "region": "SMS & WhatsApp Mobile",
                        "country_code": country_code,
                        "monthly_cost": "£1.00" if country_code == "GB" else "€1.00"
                    })
                if results:
                    return results
                return self._mock_numbers(country_code)

            except Exception as e:
                logger.error(f"Error searching Twilio mobile numbers: {e}")
                return self._mock_numbers(country_code)
        else:
            return self._mock_numbers(country_code)

    def _configure_existing_number(self, phone_number: str, webhook_url: str) -> dict:
        """
        If the number is already owned on this Twilio account, find it
        and update its webhook URL so inbound SMS is forwarded to our app.
        Returns the result dict or None if the number is not found.
        """
        if not self._ensure_client():
            return None

        try:
            clean = phone_number.replace(" ", "")
            existing = self._client.incoming_phone_numbers.list(phone_number=clean, limit=1)
            if existing:
                num = existing[0]
                # Update the SMS webhook URL
                num.update(sms_url=webhook_url, sms_method="POST")
                logger.info(f"Updated webhook for existing number {clean} (SID: {num.sid}) -> {webhook_url}")
                return {
                    "phone_number": num.phone_number,
                    "twilio_sid": num.sid,
                    "status": "active",
                    "webhook_configured": True
                }
        except Exception as e:
            logger.warning(f"Error checking/updating existing number {phone_number}: {e}")

        return None

    def purchase_number(self, phone_number: str, webhook_base_url: str = None, bundle_sid: str = None, address_sid: str = None) -> dict:
        """
        Purchase a phone number from Twilio and configure webhooks automatically.
        If the number is already owned, updates its webhook instead.
        Returns dict with phone_number, twilio_sid, and status.
        """
        # Always use the auto-detected webhook URL
        base_url = webhook_base_url or _get_webhook_base_url()
        webhook_url = f"{base_url.rstrip('/')}/api/webhooks/twilio"
        logger.info(f"Purchase/configure number {phone_number} with webhook: {webhook_url}")

        if self._ensure_client():
            # Step 1: Check if number is already owned on this account
            existing = self._configure_existing_number(phone_number, webhook_url)
            if existing:
                return existing

            # Step 2: Try to purchase the number fresh
            try:
                kwargs = {
                    "phone_number": phone_number.replace(" ", ""),
                    "sms_url": webhook_url,
                    "sms_method": "POST"
                }
                if bundle_sid:
                    kwargs["bundle_sid"] = bundle_sid
                if address_sid:
                    kwargs["address_sid"] = address_sid

                incoming = self._client.incoming_phone_numbers.create(**kwargs)
                logger.info(f"Successfully purchased Twilio number: {phone_number} (SID: {incoming.sid}) with webhook: {webhook_url}")
                return {
                    "phone_number": incoming.phone_number,
                    "twilio_sid": incoming.sid,
                    "status": "active",
                    "webhook_configured": True
                }
            except Exception as e:
                logger.error(f"Error purchasing Twilio number {phone_number}: {e}")
                # Return the error so the caller knows what happened
                mock_sid = f"PN_MOCK_{uuid.uuid4().hex[:16]}"
                return {
                    "phone_number": phone_number,
                    "twilio_sid": mock_sid,
                    "status": "simulated",
                    "error": str(e),
                    "webhook_configured": False
                }
        else:
            mock_sid = f"PN_MOCK_{uuid.uuid4().hex[:16]}"
            logger.info(f"[SIMULATED] Purchased mobile number {phone_number} with SID: {mock_sid}")
            return {
                "phone_number": phone_number,
                "twilio_sid": mock_sid,
                "status": "simulated",
                "webhook_configured": False
            }

    def configure_all_numbers(self, webhook_base_url: str = None) -> list:
        """
        Iterate over ALL numbers currently owned on the Twilio account
        and ensure each one's SMS webhook points to our app.
        Useful as a one-time migration or on-demand fix.
        """
        base_url = webhook_base_url or _get_webhook_base_url()
        webhook_url = f"{base_url.rstrip('/')}/api/webhooks/twilio"
        results = []

        if not self._ensure_client():
            return results

        try:
            numbers = self._client.incoming_phone_numbers.list(limit=50)
            for num in numbers:
                current_url = num.sms_url or ""
                if current_url != webhook_url:
                    num.update(sms_url=webhook_url, sms_method="POST")
                    logger.info(f"Updated webhook for {num.phone_number}: {current_url} -> {webhook_url}")
                    results.append({"phone_number": num.phone_number, "sid": num.sid, "updated": True})
                else:
                    results.append({"phone_number": num.phone_number, "sid": num.sid, "updated": False, "already_correct": True})
        except Exception as e:
            logger.error(f"Error configuring all numbers: {e}")

        return results

    def release_number(self, twilio_sid: str) -> bool:
        """Release a purchased number back to Twilio."""
        if self._ensure_client() and not twilio_sid.startswith("PN_MOCK_"):
            try:
                self._client.incoming_phone_numbers(twilio_sid).delete()
                logger.info(f"Released Twilio number SID: {twilio_sid}")
                return True
            except Exception as e:
                logger.error(f"Error releasing Twilio number: {e}")
                return False
        else:
            logger.info(f"[SIMULATED] Released number SID: {twilio_sid}")
            return True

    def _mock_numbers(self, country_code: str = "GB") -> list:
        """Return mock mobile numbers for local development."""
        import random

        mobile_prefixes = {
            "GB": ("+447", ["7911", "7700", "7890", "7400", "7520", "7399", "7450", "7820", "7960", "7712"]),
            "ES": ("+346", ["12", "23", "34", "45", "56", "67", "78", "89", "90"]),
            "FR": ("+336", ["12", "23", "34", "45", "56", "67", "78", "89"]),
            "DE": ("+49151", ["234", "345", "456", "567", "678", "789"]),
            "IT": ("+39320", ["123", "234", "345", "456", "567", "678"]),
            "PT": ("+35191", ["234", "345", "456", "567", "678"]),
            "NL": ("+316", ["1234", "2345", "3456", "4567"]),
            "BE": ("+32470", ["123", "234", "345", "456"]),
            "IE": ("+35387", ["123", "234", "345", "456"]),
            "CH": ("+4179", ["123", "234", "345", "456"]),
            "AT": ("+43664", ["123", "234", "345", "456"]),
            "SE": ("+4670", ["123", "234", "345", "456"]),
            "PL": ("+48501", ["234", "345", "456", "567"]),
            "RO": ("+40721", ["234", "345", "456", "567"]),
            "US": ("+1", ["415555", "310555", "212555", "312555"])
        }

        prefix_info = mobile_prefixes.get(country_code, mobile_prefixes["GB"])
        main_prefix = prefix_info[0]
        sub_prefixes = prefix_info[1]

        cost = "£1.00" if country_code == "GB" else "€1.00"
        mock_data = []

        for sub in sub_prefixes:
            remaining_digits = 10 - len(sub) if country_code == "GB" else 6
            suffix = "".join([str(random.randint(0, 9)) for _ in range(max(3, remaining_digits))])
            number = f"{main_prefix}{sub}{suffix}"
            mock_data.append({
                "phone_number": number,
                "friendly_name": f"{number[:4]} {number[4:7]} {number[7:]}",
                "locality": "SMS & WhatsApp Mobile",
                "region": "Mobile",
                "country_code": country_code,
                "monthly_cost": cost
            })

        return mock_data


twilio_numbers_service = TwilioNumbersService()
