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

    def _get_or_create_messaging_profile(self, webhook_url: str) -> str:
        """
        Retrieves or creates a Messaging Profile with the given webhook URL.
        """
        if not self.is_configured():
            return ""
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        try:
            # 1. Search for existing messaging profiles
            url = f"{self.base_url}/messaging_profiles"
            res = requests.get(url, headers=headers, timeout=10)
            if res.status_code == 200:
                profiles = res.json().get("data", [])
                for profile in profiles:
                    if profile.get("name") == "Massage Bot Profile":
                        profile_id = profile.get("id")
                        # Update webhook if it changed
                        if profile.get("webhook_url") != webhook_url:
                            patch_url = f"{self.base_url}/messaging_profiles/{profile_id}"
                            requests.patch(patch_url, headers=headers, json={"webhook_url": webhook_url}, timeout=10)
                        return profile_id

            # 2. Create profile if not found
            payload = {
                "name": "Massage Bot Profile",
                "webhook_url": webhook_url
            }
            res = requests.post(url, headers=headers, json=payload, timeout=10)
            if res.status_code in (200, 201):
                return res.json().get("data", {}).get("id", "")
        except Exception as e:
            logger.error(f"Error managing Telnyx messaging profile: {e}")
        return ""

    def purchase_number(self, phone_number: str, webhook_base_url: str = None) -> dict:
        """
        Purchase a number using Telnyx and assign to the messaging profile.
        """
        def _get_webhook_base_url() -> str:
            vercel_url = os.getenv("VERCEL_URL")
            if vercel_url:
                return f"https://{vercel_url}"
            return "https://hablachat.app"

        base_url = webhook_base_url or _get_webhook_base_url()
        webhook_url = f"{base_url.rstrip('/')}/api/webhooks/telnyx"

        clean_number = phone_number.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")

        if not self.is_configured():
            # Return simulator mock success if not configured (like twilio)
            mock_sid = f"TELNYX_PN_MOCK_{uuid.uuid4().hex[:12]}"
            return {
                "phone_number": clean_number,
                "twilio_sid": mock_sid, # use this for compatible DB column mapping
                "status": "active",
                "webhook_configured": True
            }

        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        try:
            # 1. Get or create Messaging Profile
            profile_id = self._get_or_create_messaging_profile(webhook_url)

            # 2. Order number
            order_url = f"{self.base_url}/number_orders"
            payload = {
                "phone_numbers": [{"phone_number": clean_number}]
            }
            res = requests.post(order_url, headers=headers, json=payload, timeout=15)
            if res.status_code not in (200, 201):
                error_msg = res.json().get("errors", [{}])[0].get("detail", res.text)
                return {
                    "phone_number": clean_number,
                    "twilio_sid": "",
                    "status": "failed",
                    "error": f"Telnyx order failed: {error_msg}",
                    "webhook_configured": False
                }

            order_data = res.json().get("data", {})
            order_id = order_data.get("id", "")
            
            # 3. Associate phone number with Messaging Profile (if profile_id exists)
            if profile_id:
                # Patch messaging settings for the purchased number
                patch_url = f"{self.base_url}/messaging_phone_numbers/{clean_number}"
                patch_payload = {"messaging_profile_id": profile_id}
                requests.patch(patch_url, headers=headers, json=patch_payload, timeout=10)

            return {
                "phone_number": clean_number,
                "twilio_sid": order_id, # map order id to the sid column
                "status": "active",
                "webhook_configured": bool(profile_id)
            }
        except Exception as e:
            return {
                "phone_number": clean_number,
                "twilio_sid": "",
                "status": "failed",
                "error": str(e),
                "webhook_configured": False
            }

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
