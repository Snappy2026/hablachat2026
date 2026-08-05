import os
import sys
import asyncio
os.environ["VERCEL"] = "1"
os.environ["TWILIO_ACCOUNT_SID"] = "test"
os.environ["TWILIO_AUTH_TOKEN"] = "test"
os.environ["ANTHROPIC_API_KEY"] = "test"

root_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(root_dir, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

response = client.post("/api/webhooks/twilio", data={"From": "+12345", "Body": "Hello"})
print(response.status_code)
print(response.text)
