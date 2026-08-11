import os
import sys
os.environ["VERCEL"] = "1"
# emulate vercel env variables
os.environ["TELNYX_API_KEY"] = "test"
os.environ["ANTHROPIC_API_KEY"] = "test"

# load index.py
try:
    from api.index import app_handler
    print("App loaded successfully")
except Exception as e:
    print(f"Error loading app: {e}")
    import traceback
    traceback.print_exc()
