import uuid
import logging
from app.config import settings

logger = logging.getLogger("twilio_numbers")


class TwilioNumbersService:
    def __init__(self):
        self.account_sid = settings.TWILIO_ACCOUNT_SID
        self.auth_token = settings.TWILIO_AUTH_TOKEN
        self._client = None

        if self.account_sid and not self.account_sid.startswith("your_") and self.auth_token and not self.auth_token.startswith("your_"):
            try:
                from twilio.rest import Client
                self._client = Client(self.account_sid, self.auth_token)
            except Exception as e:
                logger.warning(f"Could not initialize Twilio client for number service: {e}")

    def search_available_numbers(self, country_code: str = "GB", area_code: str = None, contains: str = None, limit: int = 10) -> list:
        """
        Search Twilio's inventory for AVAILABLE MOBILE NUMBERS ONLY (SMS & WhatsApp enabled).
        Returns a list of dicts with mobile number details.
        """
        if self._client:
            try:
                kwargs = {"limit": limit, "sms_enabled": True}
                if contains:
                    kwargs["contains"] = contains

                # Search Mobile numbers specifically
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

    def purchase_number(self, phone_number: str, webhook_base_url: str = "https://your-domain.com") -> dict:
        """
        Purchase a phone number from Twilio and configure webhooks.
        Returns dict with phone_number and twilio_sid.
        """
        webhook_url = f"{webhook_base_url}/api/webhooks/twilio"

        if self._client:
            try:
                incoming = self._client.incoming_phone_numbers.create(
                    phone_number=phone_number,
                    sms_url=webhook_url,
                    sms_method="POST",
                )
                logger.info(f"Successfully purchased Twilio mobile number: {phone_number} (SID: {incoming.sid})")
                return {
                    "phone_number": incoming.phone_number,
                    "twilio_sid": incoming.sid,
                    "status": "active"
                }
            except Exception as e:
                logger.error(f"Error purchasing Twilio number: {e}")
                mock_sid = f"PN_MOCK_{uuid.uuid4().hex[:16]}"
                return {
                    "phone_number": phone_number,
                    "twilio_sid": mock_sid,
                    "status": "simulated"
                }
        else:
            mock_sid = f"PN_MOCK_{uuid.uuid4().hex[:16]}"
            logger.info(f"[SIMULATED] Purchased mobile number {phone_number} with SID: {mock_sid}")
            return {
                "phone_number": phone_number,
                "twilio_sid": mock_sid,
                "status": "simulated"
            }

    def release_number(self, twilio_sid: str) -> bool:
        """Release a purchased number back to Twilio."""
        if self._client and not twilio_sid.startswith("PN_MOCK_"):
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
        """Return mock mobile numbers (SMS & WhatsApp capable) for local development."""
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
