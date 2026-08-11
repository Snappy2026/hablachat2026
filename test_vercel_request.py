import os
import sys
import asyncio
os.environ["VERCEL"] = "1"
os.environ["TELNYX_API_KEY"] = "test"
os.environ["ANTHROPIC_API_KEY"] = "test"

root_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(root_dir, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# Use Telnyx webhook payload structure
payload = {
    "data": {
        "event_type": "message.received",
        "payload": {
            "from": {
                "phone_number": "+12345"
            },
            "text": "Hello"
        }
    }
}
response = client.post("/api/webhooks/telnyx", json=payload)
print(response.status_code)
print(response.text)
