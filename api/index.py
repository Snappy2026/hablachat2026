import os
import sys
import traceback
import json

# Build version: 2026-08-05T19:00 — force Vercel function rebuild

api_dir = os.path.dirname(os.path.abspath(__file__))
if api_dir not in sys.path:
    sys.path.insert(0, api_dir)

import_error = None
try:
    from app.main import app as main_app
    from app.database import engine, Base
    from app.seed import seed_demo_data

    try:
        Base.metadata.create_all(bind=engine)
        seed_demo_data()
    except Exception as e:
        print(f"[Vercel Init] DB setup note: {e}")
except Exception as e:
    import_error = traceback.format_exc()
    print(f"IMPORT ERROR: {import_error}")

async def app(scope, receive, send):
    if import_error:
        if scope["type"] == "http":
            await send({
                "type": "http.response.start",
                "status": 500,
                "headers": [(b"content-type", b"application/json")]
            })
            await send({
                "type": "http.response.body",
                "body": json.dumps({"error": "import_crash", "trace": import_error}).encode("utf-8")
            })
        return

    try:
        await main_app(scope, receive, send)
    except Exception as e:
        err = traceback.format_exc()
        print(f"ASGI CRASH: {err}")
        if scope["type"] == "http":
            await send({
                "type": "http.response.start",
                "status": 500,
                "headers": [(b"content-type", b"application/json")]
            })
            await send({
                "type": "http.response.body",
                "body": json.dumps({"error": "crash", "trace": err}).encode("utf-8")
            })
