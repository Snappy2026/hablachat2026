import os
import sys
import json

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(root_dir, "backend")

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

try:
    from app.main import app
    from app.database import engine, Base
    from app.seed import seed_demo_data

    try:
        Base.metadata.create_all(bind=engine)
        seed_demo_data()
    except Exception as e:
        print(f"[Vercel Init] DB setup note: {e}")

    app_handler = app
except Exception as e:
    import traceback
    err_str = traceback.format_exc()
    # Create a dummy ASGI app to return the error
    async def app_handler(scope, receive, send):
        assert scope['type'] == 'http'
        await send({
            'type': 'http.response.start',
            'status': 500,
            'headers': [[b'content-type', b'application/json']],
        })
        await send({
            'type': 'http.response.body',
            'body': json.dumps({"error": err_str}).encode('utf-8'),
        })

