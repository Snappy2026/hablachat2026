import json
import logging
from typing import List, Dict, Optional
import requests
from app.config import settings
from app.schemas import ClaudeAnalysisOutput, ExtractedBookingData

logger = logging.getLogger("claude_engine")

DEFAULT_SYSTEM_PROMPT = """You are replying directly to your client on WhatsApp/SMS as an independent model (Anna).

STRICT PERSONA RULES:
- **First-Person Only:** ALWAYS write in the first-person singular ("I", "me", "my rates", "my place", "my door").
- **NO CORPORATE JARGON:** NEVER mention "we", "our team", "our studio", "General Manager", "receptionist", or "billing record". You are 1 person speaking 1-on-1 with your client.
- **Tone:** Warm, casual, flirty, direct text message style. Use "Hi babe", "thanks babe x", "hiya babe".
- **Short & Snappy:** Keep replies brief (1 to 2 sentences max).

EXAMPLES:
- Discount: "Sorry babe i dont do discounts, only in person and when you spend more than 1 hour x"
- Complaint: "Hi babe, sorry to hear this x"
- Arrival: "Hi babe, I'm door number 5! Just buzz when you get to the door. thanks babe x"

YOU MUST ALWAYS RESPOND IN VALID JSON WITH THIS EXACT STRUCTURE:
{
  "reply_text": "short casual response message",
  "intent": "booking_inquiry|reschedule|cancellation|pricing|complaint|custom_request|general_faq",
  "confidence": 0.95,
  "requires_human_review": false,
  "review_reason": "Explanation of why human review is required or null",
  "extracted_booking": {
    "client_name": "extracted name or null",
    "service_type": "Massage Session",
    "requested_date": "YYYY-MM-DD or string description",
    "requested_time": "HH:MM AM/PM",
    "duration_minutes": 60,
    "party_size": 1,
    "notes": "any extra notes or null"
  }
}
If no booking is requested, set "extracted_booking": null.
"""

class ClaudeEngine:
    def __init__(self):
        import os
        from dotenv import load_dotenv
        load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"), override=True)
        self.anthropic_key = os.getenv("ANTHROPIC_API_KEY", getattr(settings, "ANTHROPIC_API_KEY", ""))
        self.openai_key = os.getenv("OPENAI_API_KEY", getattr(settings, "OPENAI_API_KEY", ""))
        self.venice_key = os.getenv("VENICE_API_KEY", getattr(settings, "VENICE_API_KEY", ""))
        self.base_url = settings.ANTHROPIC_BASE_URL or "https://api.anthropic.com/v1"
        self.model = getattr(settings, "ANTHROPIC_MODEL", "claude-haiku-4-5-20251001") or "claude-haiku-4-5-20251001"

    def is_api_configured(self) -> bool:
        import os
        anth_key = os.getenv("ANTHROPIC_API_KEY", self.anthropic_key)
        oai_key = os.getenv("OPENAI_API_KEY", self.openai_key)
        ven_key = os.getenv("VENICE_API_KEY", self.venice_key)
        anth = bool(anth_key and not anth_key.startswith("your_"))
        oai = bool(oai_key and not oai_key.startswith("your_"))
        ven = bool(ven_key and not ven_key.startswith("your_"))
        return anth or oai or ven

    def analyze_message(
        self,
        message_body: str,
        history: List[Dict[str, str]] = None,
        custom_prompt: str = None,
        language: str = None,
        tone: str = None,
        signature: str = None
    ) -> ClaudeAnalysisOutput:
        """
        Calls Anthropic Claude (Haiku 4.5), Venice AI (Uncensored), or OpenAI (GPT-4o-mini) API to analyze incoming message.
        """
        system_prompt = custom_prompt if custom_prompt else DEFAULT_SYSTEM_PROMPT

        # Append dynamic language, tone, signature & greeting directives
        extra_directives = []
        extra_directives.append("CONTEXT ANCHORING: You are an individual replying directly to your client. You MUST ONLY use first-person pronouns ('I', 'me', 'my rates', 'my availability'). You MUST NEVER mention 'we', 'our studio', 'our team', or 'our manager'. Speak as yourself.")
        extra_directives.append("TONE & STYLE: Write in a natural, casual SMS text message style. Avoid formal corporate jargon, marketing phrases, or robotic customer service speech.")
        extra_directives.append("STREET ARRIVAL RULE: When the client says they are in the street, outside, or asking where to go now (e.g. 'im in the street where now', 'im outside'): reply directly with the door number and tell them to buzz when at the door (e.g., 'Hi babe, I'm door number 5! Just buzz when you get to the door').")
        extra_directives.append("IMMEDIATE AVAILABILITY RULE: If the client asks if you are free now or in a short timeframe (e.g. 'free in 20 mins', 'are you free now', 'free soon'): confirm availability casually, e.g. 'Yes babe I can be available! Just message when you are in the street, you have my postcode.'")
        extra_directives.append("GREETING RULE: ONLY start your response with 'Hi babe,' (or 'Hi [Name],' if name is known) on the VERY FIRST message of a conversation thread. If there is already chat history (follow-up messages back and forth), DO NOT repeat 'Hi babe' or 'Hi [Name]' at the beginning—jump straight into your reply like a real person texting!")
        extra_directives.append("BOOKING PHRASING RULE: NEVER use phrases like 'locked in', 'you're all set', 'got you down', 'got you booked', or 'booked you in'. Whenever confirming a booking or slot, ALWAYS use personal phrasing with: 'I've noted you now' (e.g., 'Nice to meet you Marcus! I've noted you now for tomorrow at 7pm. Just message when you're in the street and I'll buzz you in x').")
        extra_directives.append("SIGNOFF RULE: End naturally with 'thanks babe x' or 'x'. In quick back-and-forth exchanges, keep signoffs lightweight so it feels completely natural.")
        extra_directives.append("MULTILINGUAL MATCHING: If the client sends a message in Spanish, French, Italian, German, Portuguese, Polish, Romanian, Arabic, etc., compose your entire reply in their exact same language while keeping the warm, casual text message persona!")
        extra_directives.append("CURRENCY RULE: ALWAYS state prices using the host's actual currency symbol (£ GBP by default: 30 mins (£80), 60 mins (£130)). NEVER alter or convert the currency symbol to € or $ when translating into German, French, Spanish, etc.")

        if language and "Auto-detect" not in language:
            extra_directives.append(f"TARGET LANGUAGE: You MUST compose your reply text in {language}.")

        if signature:
            extra_directives.append(f"SIGNATURE: End your message with: '{signature}'")

        if extra_directives:
            system_prompt += "\n\nDYNAMIC MANAGER INSTRUCTIONS:\n" + "\n".join(extra_directives)

        if self.is_api_configured():
            try:
                formatted_messages = []
                if history:
                    for h in history:
                        role = "assistant" if h.get("role") in ["assistant", "bot"] else "user"
                        formatted_messages.append({"role": role, "content": h.get("content", "")})
                
                formatted_messages.append({"role": "user", "content": message_body})

                import os
                anth_key = os.getenv("ANTHROPIC_API_KEY", self.anthropic_key)
                oai_key = os.getenv("OPENAI_API_KEY", self.openai_key)
                ven_key = os.getenv("VENICE_API_KEY", self.venice_key)

                # Check if using Venice AI API key (Uncensored Cloud LLM)
                if ven_key and not ven_key.startswith("your_"):
                    headers = {
                        "Authorization": f"Bearer {ven_key}",
                        "Content-Type": "application/json"
                    }
                    endpoint = f"{settings.VENICE_BASE_URL.rstrip('/')}/chat/completions"
                    venice_messages = [{"role": "system", "content": system_prompt}] + formatted_messages
                    payload = {
                        "model": getattr(settings, "VENICE_MODEL", "llama-3.3-70b") or "llama-3.3-70b",
                        "response_format": {"type": "json_object"},
                        "temperature": 0.3,
                        "messages": venice_messages
                    }
                    response = requests.post(endpoint, headers=headers, json=payload, timeout=15)
                    if response.status_code == 200:
                        resp_data = response.json()
                        content_text = resp_data["choices"][0]["message"]["content"].strip()
                        if "```" in content_text:
                            content_text = content_text.split("```")[1]
                            if content_text.startswith("json"):
                                content_text = content_text[4:].strip()
                        data = json.loads(content_text)
                        return ClaudeAnalysisOutput(**data)

                # Check if using Anthropic API key
                if anth_key and not anth_key.startswith("your_"):
                    headers = {
                        "x-api-key": anth_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json"
                    }
                    endpoint = f"{self.base_url.rstrip('/')}/messages"
                    payload = {
                        "model": self.model,
                        "max_tokens": 1024,
                        "temperature": 0.3,
                        "system": system_prompt,
                        "messages": formatted_messages
                    }
                    response = requests.post(endpoint, headers=headers, json=payload, timeout=15)
                    if response.status_code == 200:
                        resp_data = response.json()
                        content_text = resp_data["content"][0]["text"].strip()
                        if "```" in content_text:
                            content_text = content_text.split("```")[1]
                            if content_text.startswith("json"):
                                content_text = content_text[4:].strip()
                        data = json.loads(content_text)
                        return ClaudeAnalysisOutput(**data)

                # Check if using OpenAI API key
                if self.openai_key and not self.openai_key.startswith("your_"):
                    headers = {
                        "Authorization": f"Bearer {self.openai_key}",
                        "Content-Type": "application/json"
                    }
                    endpoint = "https://api.openai.com/v1/chat/completions"
                    oai_messages = [{"role": "system", "content": system_prompt}] + formatted_messages
                    payload = {
                        "model": "gpt-4o-mini",
                        "response_format": {"type": "json_object"},
                        "temperature": 0.3,
                        "messages": oai_messages
                    }
                    response = requests.post(endpoint, headers=headers, json=payload, timeout=15)
                    if response.status_code == 200:
                        resp_data = response.json()
                        content_text = resp_data["choices"][0]["message"]["content"].strip()
                        data = json.loads(content_text)
                        return ClaudeAnalysisOutput(**data)
            except Exception as e:
                logger.error(f"Error calling Generative AI LLM API: {e}. Switching to rule-based analysis fallback.")

        # Fallback Analysis Engine for local testing / demo without live API Key
        result = self._smart_fallback_analysis(message_body, history=history)
        if signature and signature.lower() not in result.reply_text.lower():
            result.reply_text = f"{result.reply_text}\n\n{signature}"
        return result

    def _smart_fallback_analysis(self, text: str, history: List[Dict[str, str]] = None) -> ClaudeAnalysisOutput:
        lower = text.lower().strip()
        last_bot_msg = ""
        if history:
            for h in reversed(history):
                if h.get("role") in ["assistant", "bot"]:
                    last_bot_msg = h.get("content", "").lower()
                    break

        # Check conversational context: If bot previously asked for time/duration and client gives a time
        time_indicators = ["pm", "am", "o'clock", "oclock", "mins", "hour", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
        if ("what time" in last_bot_msg or "how long" in last_bot_msg or "thinking to book" in last_bot_msg) and any(w in lower for w in time_indicators):
            return ClaudeAnalysisOutput(
                reply_text=f"Sounds good babe! I have noted {text}. Just message me when you are in the street, you have my postcode x",
                intent="booking_inquiry",
                confidence=0.96,
                requires_human_review=False,
                review_reason="Client time preference acknowledged with context memory.",
                extracted_booking=ExtractedBookingData(
                    client_name="Valued Guest",
                    service_type="Massage Session",
                    requested_date="Today",
                    requested_time=text,
                    duration_minutes=60,
                    party_size=1,
                    notes=f"Client requested slot: {text}"
                )
            )

        # 1. Street Arrival & Door Number
        street_arrival_keywords = [
            "in the street", "on the street", "where now", "outside now", "im outside",
            "i am outside", "here now", "im here", "i am here", "which door", "door number", "buzz", "where do i go"
        ]
        if any(w in lower for w in street_arrival_keywords):
            video_note = ""
            try:
                from app.database import SessionLocal
                from app.models import Client
                db = SessionLocal()
                active_client = db.query(Client).filter(Client.status == "active").order_by(Client.id.desc()).first()
                if active_client and active_client.entrance_video_url:
                    video_note = f"\n\nEntrance Video: {active_client.entrance_video_url}"
                db.close()
            except Exception:
                pass

            return ClaudeAnalysisOutput(
                reply_text=f"Hi babe, I'm door number 5! Just buzz when you get to the door{video_note}\n\nthanks babe x",
                intent="general_faq",
                confidence=0.98,
                requires_human_review=False,
                review_reason="Street arrival confirmed; door number and entrance video provided.",
                extracted_booking=None
            )

        # Model Photo Gallery Request
        photo_keywords = ["photo", "photos", "pic", "pics", "picture", "pictures", "send photos", "send pics", "photos of you", "pics of you", "see pics", "see photos"]
        if any(w in lower for w in photo_keywords):
            photo_reply = "Hi babe, here are my photos! x"
            try:
                from app.database import SessionLocal
                from app.models import Client
                import json
                db = SessionLocal()
                active_client = db.query(Client).filter(Client.status == "active").order_by(Client.id.desc()).first()
                if active_client and active_client.photo_urls:
                    urls = json.loads(active_client.photo_urls)
                    if urls and len(urls) > 0:
                        formatted_links = "\n".join([f"• {u}" for u in urls])
                        photo_reply = f"Hi babe, here are my photos:\n{formatted_links}\n\nthanks babe x"
                db.close()
            except Exception:
                pass

            return ClaudeAnalysisOutput(
                reply_text=photo_reply,
                intent="general_faq",
                confidence=0.98,
                requires_human_review=False,
                review_reason="Model photo gallery request answered.",
                extracted_booking=None
            )

        # 21. Return Client Request
        if any(w in lower for w in ["come back", "want to return", "want to come again", "can i come back"]):
            return ClaudeAnalysisOutput(
                reply_text="Ok babe but when, what time x",
                intent="booking_inquiry",
                confidence=0.95,
                requires_human_review=False,
                review_reason="Return client inquiry answered.",
                extracted_booking=None
            )

        # 2. Short-Notice Availability
        short_notice_keywords = [
            "can i come", "come in", "come over", "come now", "come today",
            "can i see you", "see you in", "see you now", "see you soon",
            "free in", "free now", "are you free", "free soon", "available now", "available today",
            "free today", "free in20", "free in 20", "free in 30", "free in 15", "in 15mins", "in 15 mins", "in 20mins", "in 10mins"
        ]
        if any(w in lower for w in short_notice_keywords):
            return ClaudeAnalysisOutput(
                reply_text="Yes babe I can be available! Just message when you are in the street, you have my postcode",
                intent="booking_inquiry",
                confidence=0.96,
                requires_human_review=False,
                review_reason="Immediate availability inquiry confirmed.",
                extracted_booking=ExtractedBookingData(
                    client_name="Valued Guest",
                    service_type="Massage Session",
                    requested_date="Today",
                    requested_time="Short notice / In 15-20 mins",
                    duration_minutes=60,
                    party_size=1,
                    notes="Immediate arrival request"
                )
            )

        # 6. Cancellation
        if any(w in lower for w in ["cancel", "cancel my booking", "dont want to come", "not coming"]):
            return ClaudeAnalysisOutput(
                reply_text="Hi babe, no worries we can do another time",
                intent="cancellation",
                confidence=0.88,
                requires_human_review=True,
                review_reason="Cancellation request flagged for manager review.",
                extracted_booking=None
            )

        # 5. Reschedule / Change Time
        if any(w in lower for w in ["reschedule", "change time", "move appointment", "move my booking", "different time"]):
            return ClaudeAnalysisOutput(
                reply_text="Hi babe, I can definitely help you change or move your booking. Let me know what new time works for you!",
                intent="reschedule",
                confidence=0.94,
                requires_human_review=False,
                review_reason="Reschedule request processed.",
                extracted_booking=None
            )

        # 7. Discount / Negotiation
        if any(w in lower for w in ["discount", "cheap", "price match", "deal", "negotiate"]) or "is it free" in lower or "for free" in lower:
            return ClaudeAnalysisOutput(
                reply_text="Sorry babe i dont do discounts, only in person and when you spend more than 1 hour x",
                intent="custom_request",
                confidence=0.85,
                requires_human_review=True,
                review_reason="Discount / negotiation query flagged for manager review.",
                extracted_booking=None
            )

        # 8. Complaint / Refund
        if any(w in lower for w in ["unhappy", "bad", "terrible", "complain", "refund", "horrible", "disappointed"]):
            return ClaudeAnalysisOutput(
                reply_text="Hi babe, sorry to hear this x",
                intent="complaint",
                confidence=0.80,
                requires_human_review=True,
                review_reason="Complaint or refund request flagged for manager review.",
                extracted_booking=None
            )

        # 9. Location / Address / Postcode
        if any(w in lower for w in ["whereareyou", "address", "postcode", "location", "directions", "howtogetthere", "where are you"]):
            return ClaudeAnalysisOutput(
                reply_text="Hi babe, its [postcode] x",
                intent="general_faq",
                confidence=0.96,
                requires_human_review=False,
                review_reason="Location inquiry answered.",
                extracted_booking=None
            )

        # 10. Opening Hours / Working Days
        if any(w in lower for w in ["whattimedoyouopen", "openinghours", "what days", "whenareyouopen", "hours", "working hours", "closed"]):
            return ClaudeAnalysisOutput(
                reply_text="Babe, im flexible just confirm when you want to come so we can make a booking",
                intent="general_faq",
                confidence=0.95,
                requires_human_review=False,
                review_reason="Opening hours inquiry answered.",
                extracted_booking=None
            )

        # 11. Payment Methods
        if any(w in lower for w in ["howtopay", "cash", "card", "payment", "banktransfer", "doyoutakecard", "bank transfer"]):
            return ClaudeAnalysisOutput(
                reply_text="Yes babe, take cash and transfer x",
                intent="general_faq",
                confidence=0.97,
                requires_human_review=False,
                review_reason="Payment method inquiry answered.",
                extracted_booking=None
            )

        # 12. Parking / Transport
        if any(w in lower for w in ["parking", "wheretopark", "bus", "train", "nearest station", "tube", "transport"]):
            return ClaudeAnalysisOutput(
                reply_text="There is parking in the street and all around, check the postcode babe and let me know x",
                intent="general_faq",
                confidence=0.95,
                requires_human_review=False,
                review_reason="Parking/transport inquiry answered.",
                extracted_booking=None
            )

        # 14. Thank You / Goodbye
        if any(w in lower for w in ["thankyou", "thanks", "cheers", "bye", "seeyoulater", "seeyousoon", "ta", "thank you", "see you later", "see you soon"]):
            return ClaudeAnalysisOutput(
                reply_text="hope to see you soon x",
                intent="general_faq",
                confidence=0.98,
                requires_human_review=False,
                review_reason="Sign-off message.",
                extracted_booking=None
            )

        # 15. Confirmation / On My Way
        if any(w in lower for w in ["onmyway", "comingnow", "betherein", "leaving now", "settingoff", "omw", "nearlythere", "on my way", "coming now", "be there in"]):
            return ClaudeAnalysisOutput(
                reply_text="Ok babe just let me know when you are in the street please, and i will give you the door number x",
                intent="general_faq",
                confidence=0.97,
                requires_human_review=False,
                review_reason="Arrival confirmation processed.",
                extracted_booking=None
            )

        # 16. Running Late
        if any(w in lower for w in ["runninglate", "belate", "stuckintraffic", "delayed", "gonnabelate", "sorryimlate", "running late", "be late", "stuck in traffic", "sorry im late"]):
            return ClaudeAnalysisOutput(
                reply_text="Ok babe just let me know roughly how long and time you be here. x",
                intent="general_faq",
                confidence=0.96,
                requires_human_review=False,
                review_reason="Late arrival notice processed.",
                extracted_booking=None
            )

        # 17. First-Time Client Questions
        if any(w in lower for w in ["firsttime", "neverbeen", "whatdoineedtobring", "whattoexpect", "newclient", "first time", "never been", "what to expect", "new client"]):
            return ClaudeAnalysisOutput(
                reply_text="Well you will enjoy great sexy company, get to know eachother little tease i guess and then move onto more exciting moments you will never forget x",
                intent="general_faq",
                confidence=0.94,
                requires_human_review=False,
                review_reason="First time client inquiry answered.",
                extracted_booking=None
            )

        # 18. Inappropriate / Off-Topic
        if "hardcore" in lower or "anything hardcore" in lower:
            return ClaudeAnalysisOutput(
                reply_text="Babe those things i dont do, anything extra you have to ask in person x",
                intent="custom_request",
                confidence=0.90,
                requires_human_review=True,
                review_reason="Inappropriate query flagged for review.",
                extracted_booking=None
            )

        # 19. Photos / Portfolio Request
        if any(w in lower for w in ["photos", "pictures", "portfolio", "whatdoesitlook", "canisee", "can i see", "what does it look like"]):
            return ClaudeAnalysisOutput(
                reply_text="If we get on well maybe, its not something i do and obviously an extra but those things you talk when we see eachother x",
                intent="general_faq",
                confidence=0.95,
                requires_human_review=False,
                review_reason="Photo request answered.",
                extracted_booking=None
            )

        # 20. Duo / Friend Request
        if "duo" in lower or "have a friend" in lower:
            return ClaudeAnalysisOutput(
                reply_text="Sometimes i have a friend, depends on time and when you come x",
                intent="general_faq",
                confidence=0.95,
                requires_human_review=False,
                review_reason="Duo inquiry answered.",
                extracted_booking=None
            )

        # 22. Full Service List & Rates
        if any(w in lower for w in ["what are your services", "prices", "located", "based"]):
            return ClaudeAnalysisOutput(
                reply_text="Babe here my services and prices,\n15min - £50, 30min £80, 1hr £130\n\nMy services:\nDifferent positions.\n•Best BJ.\n•Erotic tantric massage.\n•Kissing Foreplay.\n•Erotic show.\n•Hand job.\n•Striptease.\n•Boobjob.\n\nLet me know how long you would like and what time pls",
                intent="pricing",
                confidence=0.96,
                requires_human_review=False,
                review_reason="Full service list & rates inquiry answered.",
                extracted_booking=None
            )

        # 13. General Greeting / Hello
        if any(w in lower for w in ["hi", "hello", "hey", "hiya", "goodmorning", "good afternoon", "goodevening", "good morning"]):
            return ClaudeAnalysisOutput(
                reply_text="Hiya Babe thx for the message, do you want to come and see me x",
                intent="general_faq",
                confidence=0.98,
                requires_human_review=False,
                review_reason="Greeting message replied.",
                extracted_booking=None
            )

        # 3. Services & Pricing
        if any(w in lower for w in ["price", "cost", "how much", "rate", "rates", "services", "price list"]):
            return ClaudeAnalysisOutput(
                reply_text="Hi babe, here are my services and prices:\n• 60 mins (£130), 30 mins (£80)\n• Full Body Relaxation & Stretch\n• Aromatherapy & Sensual Care\nLet me know what time you are thinking to book and how long you would like!\nthanks babe x",
                intent="pricing",
                confidence=0.96,
                requires_human_review=False,
                review_reason="Standard pricing inquiry.",
                extracted_booking=None
            )

        # 4. Booking Request
        if any(w in lower for w in ["book", "appointment", "reserve", "schedule", "tomorrow", "today", "slot"]):
            time_str = "3:00 PM"
            if "10" in lower: time_str = "10:00 AM"
            elif "11" in lower: time_str = "11:00 AM"
            elif "2" in lower or "14" in lower: time_str = "2:00 PM"
            elif "4" in lower or "16" in lower: time_str = "4:00 PM"
            elif "5" in lower or "17" in lower: time_str = "5:00 PM"

            date_str = "Tomorrow"
            if "today" in lower: date_str = "Today"
            elif "saturday" in lower: date_str = "Saturday"

            return ClaudeAnalysisOutput(
                reply_text=f"Hi babe, I can do {date_str} at {time_str}! Let me know if that time works for you and how long you'd like.\nthanks babe x",
                intent="booking_inquiry",
                confidence=0.94,
                requires_human_review=False,
                review_reason="Standard booking inquiry within normal confidence limits.",
                extracted_booking=ExtractedBookingData(
                    client_name="Valued Guest",
                    service_type="Massage Session",
                    requested_date=date_str,
                    requested_time=time_str,
                    duration_minutes=60,
                    party_size=1,
                    notes="Requested via SMS/WhatsApp"
                )
            )

        # Default catch-all
        return ClaudeAnalysisOutput(
            reply_text="Hi babe, here are my services and prices:\n• 60 mins (£130), 30 mins (£80)\n• Full Body Relaxation & Stretch\n• Aromatherapy & Sensual Care\nLet me know what time you are thinking to book and how long you would like!\nthanks babe x",
            intent="general_faq",
            confidence=0.82,
            requires_human_review=True,
            review_reason="Low confidence score or ambiguous client query.",
            extracted_booking=None
        )

claude_engine = ClaudeEngine()
