import os
import logging
import requests
import uuid
from app.config import settings

logger = logging.getLogger("telnyx_service")


class TelnyxService:
    def __init__(self):
        self.api_key = os.getenv("TELNYX_API_KEY", "")
        self.base_url = "https://api.telnyx.com/v2"

    def is_configured(self) -> bool:
        return bool(self.api_key and not self.api_key.startswith("your_"))

    def search_numbers(self, country_code: str = "GB", limit: int = 10) -> list:
        """Search Telnyx inventory for instant UK & European mobile lines."""
        if not self.is_configured():
            return []
        try:
            url = f"{self.base_url}/available_phone_numbers"
            headers = {"Authorization": f"Bearer {self.api_key}"}
            params = {
                "filter[country_code]": country_code,
                "filter[limit]": limit,
                "filter[phone_number_type]": "mobile"
            }
            res = requests.get(url, headers=headers, params=params, timeout=10)
            if res.status_code == 200:
                data = res.json().get("data", [])
                results = []
                for item in data:
                    phone = item.get("phone_number") or ""
                    friendly = phone
                    if country_code == "GB" and phone.startswith("+447"):
                        friendly = f"0{phone[3:]}"
                    results.append({
                        "phone_number": phone,
                        "friendly_name": f"{friendly} (UK Mobile)" if country_code == "GB" else f"{friendly} (Mobile)",
                        "locality": item.get("region", country_code),
                        "country": country_code
                    })
                return results
        except Exception as e:
            logger.error(f"Error searching Telnyx numbers: {e}")
        return []

    def send_message(self, to_number: str, body: str, from_number: str = None) -> str:
        """Send SMS via Telnyx API."""
        if not self.is_configured():
            mock_sid = f"TELNYX_MOCK_{uuid.uuid4().hex[:12]}"
            logger.info(f"[MOCK TELNYX SEND] To: {to_number} | Body: {body}")
            return mock_sid
        try:
            url = f"{self.base_url}/messages"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            clean_from = (from_number or "+447791126970").replace(" ", "")
            clean_to = to_number.replace(" ", "")
            payload = {
                "from": clean_from,
                "to": clean_to,
                "text": body
            }
            res = requests.post(url, headers=headers, json=payload, timeout=10)
            if res.status_code in (200, 201):
                msg_data = res.json().get("data", {})
                logger.info(f"Successfully sent Telnyx SMS ID: {msg_data.get('id')} to {to_number}")
                return msg_data.get("id", f"telnyx_{uuid.uuid4().hex[:8]}")
            else:
                logger.error(f"Telnyx send error: {res.text}")
        except Exception as e:
            logger.error(f"Exception sending Telnyx SMS: {e}")
        return f"TELNYX_MOCK_{uuid.uuid4().hex[:12]}"


telnyx_service = TelnyxService()
