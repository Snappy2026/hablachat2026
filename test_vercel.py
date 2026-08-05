import os
import sys
os.environ["VERCEL"] = "1"
# emulate vercel env variables
os.environ["TWILIO_ACCOUNT_SID"] = "test"
os.environ["TWILIO_AUTH_TOKEN"] = "test"
os.environ["ANTHROPIC_API_KEY"] = "test"

# load index.py
try:
    from api.index import app_handler
    print("App loaded successfully")
except Exception as e:
    print(f"Error loading app: {e}")
    import traceback
    traceback.print_exc()
