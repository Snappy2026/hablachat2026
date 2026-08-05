import os
import sys
import json
import traceback

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(root_dir, "backend")

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

# Define the ASGI app at module level so Vercel finds it
async def app_handler(scope, receive, send):
    try:
        from app.main import app
        from app.database import engine, Base
        from app.seed import seed_demo_data
        
        try:
            Base.metadata.create_all(bind=engine)
            seed_demo_data()
        except Exception:
            pass
            
        # Delegate to the real FastAPI app
        await app(scope, receive, send)
    except Exception as e:
        err_str = traceback.format_exc()
        # Fallback error response
        if scope['type'] == 'http':
            await send({
                'type': 'http.response.start',
                'status': 500,
                'headers': [[b'content-type', b'application/json']],
            })
            await send({
                'type': 'http.response.body',
                'body': json.dumps({
                    "error": "Vercel Init Error",
                    "traceback": err_str,
                    "cwd": os.getcwd(),
                    "sys_path": sys.path,
                    "ls_root": os.listdir(root_dir) if os.path.exists(root_dir) else [],
                    "ls_backend": os.listdir(backend_dir) if os.path.exists(backend_dir) else []
                }).encode('utf-8'),
            })

