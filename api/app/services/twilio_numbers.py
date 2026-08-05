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
        self._bundle_sid = None  # Cached regulatory bundle SID

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

    def _get_regulatory_bundle_sid(self) -> str:
        """
        Auto-discover the approved Regulatory Bundle SID from Twilio.
        Checks env var first, then queries the Twilio API for an approved bundle.
        Caches the result so it's only looked up once per cold start.
        """
        # Check env var first
        env_bundle = os.getenv("TWILIO_BUNDLE_SID", "")
        if env_bundle:
            return env_bundle

        # Use cached value
        if self._bundle_sid:
            return self._bundle_sid

        if not self._ensure_client():
            return ""

        try:
            bundles = self._client.numbers.v2.regulatory_compliance.bundles.list(
                status="twilio-approved",
                limit=5
            )
            for bundle in bundles:
                logger.info(f"Found approved regulatory bundle: {bundle.sid} ({bundle.friendly_name})")
                self._bundle_sid = bundle.sid
                return bundle.sid

            logger.warning("No approved regulatory bundles found on this Twilio account.")
        except Exception as e:
            logger.warning(f"Error fetching regulatory bundles: {e}")

        return ""

    def search_available_numbers(self, country_code: str = "GB", area_code: str = None, contains: str = None, limit: int = 10) -> list:
        """
        Search Twilio's inventory for MOBILE NUMBERS ONLY.
        Never falls back to landline/geographic numbers.
        """
        if self._ensure_client():
            try:
                kwargs = {"limit": limit, "sms_enabled": True}
                if contains:
                    kwargs["contains"] = contains

                # MOBILE ONLY — no fallback to local/landline
                numbers = self._client.available_phone_numbers(country_code).mobile.list(**kwargs)

                results = []
                for n in numbers:
                    phone = n.phone_number
                    # Format UK mobile numbers as 07xxx for display
                    friendly = n.friendly_name
                    if country_code == "GB" and phone.startswith("+447"):
                        friendly = f"0{phone[3:]}"  # +447xxx -> 07xxx

                    results.append({
                        "phone_number": phone,
                        "friendly_name": f"{friendly} (UK Mobile)" if country_code == "GB" else f"{friendly} (Mobile)",
                        "locality": getattr(n, "locality", "") or "Mobile",
                        "region": "SMS & WhatsApp Mobile",
                        "country_code": country_code,
                        "monthly_cost": "£1.00" if country_code == "GB" else "€1.00"
                    })

                if results:
                    return results

                logger.warning(f"No mobile numbers available from Twilio for country: {country_code}")
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
        """
        if not self._ensure_client():
            return None

        try:
            clean = phone_number.replace(" ", "")
            existing = self._client.incoming_phone_numbers.list(phone_number=clean, limit=1)
            if existing:
                num = existing[0]
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
        Purchase a MOBILE number from Twilio with:
        1. Automatic webhook configuration
        2. Automatic regulatory bundle attachment (for UK/EU numbers)
        If the number is already owned, updates its webhook instead.
        """
        base_url = webhook_base_url or _get_webhook_base_url()
        webhook_url = f"{base_url.rstrip('/')}/api/webhooks/twilio"

        if self._ensure_client():
            # Step 1: Check if number is already owned
            existing = self._configure_existing_number(phone_number, webhook_url)
            if existing:
                return existing

            # Step 2: Auto-discover regulatory bundle if not provided
            regulatory_bundle = bundle_sid or self._get_regulatory_bundle_sid()

            # Step 3: Purchase the number
            try:
                kwargs = {
                    "phone_number": phone_number.replace(" ", ""),
                    "sms_url": webhook_url,
                    "sms_method": "POST"
                }

                # Attach regulatory bundle for UK/EU compliance
                if regulatory_bundle:
                    kwargs["bundle_sid"] = regulatory_bundle
                    logger.info(f"Attaching regulatory bundle {regulatory_bundle} to purchase of {phone_number}")

                if address_sid:
                    kwargs["address_sid"] = address_sid

                incoming = self._client.incoming_phone_numbers.create(**kwargs)
                logger.info(f"Successfully purchased mobile number: {phone_number} (SID: {incoming.sid}) with webhook: {webhook_url}")
                return {
                    "phone_number": incoming.phone_number,
                    "twilio_sid": incoming.sid,
                    "status": "active",
                    "webhook_configured": True
                }
            except Exception as e:
                error_msg = str(e)
                logger.error(f"PURCHASE FAILED for {phone_number}: {error_msg}")
                return {
                    "phone_number": phone_number,
                    "twilio_sid": "",
                    "status": "failed",
                    "error": error_msg,
                    "webhook_configured": False
                }
        else:
            return {
                "phone_number": phone_number,
                "twilio_sid": "",
                "status": "failed",
                "error": "Twilio credentials not configured. Add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to environment variables.",
                "webhook_configured": False
            }

    def configure_all_numbers(self, webhook_base_url: str = None) -> list:
        """
        Iterate over ALL numbers currently owned on the Twilio account
        and ensure each one's SMS webhook points to our app.
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
        """Return mock MOBILE numbers for local development."""
        import random

        mobile_prefixes = {
            "GB": ("+447", ["911", "700", "890", "400", "520", "399", "450", "820", "960", "712"]),
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
            suffix = "".join([str(random.randint(0, 9)) for _ in range(6)])
            number = f"{main_prefix}{sub}{suffix}"
            # Format UK as 07xxx for display
            if country_code == "GB":
                friendly = f"0{number[3:]}"
            else:
                friendly = number
            mock_data.append({
                "phone_number": number,
                "friendly_name": f"{friendly} (Mobile)",
                "locality": "SMS & WhatsApp Mobile",
                "region": "Mobile",
                "country_code": country_code,
                "monthly_cost": cost
            })

        return mock_data


twilio_numbers_service = TwilioNumbersService()
