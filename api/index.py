import json
import traceback

async def app(scope, receive, send):
    try:
        from app.main import app as main_app
        from app.database import engine, Base
        from app.seed import seed_demo_data
        
        try:
            Base.metadata.create_all(bind=engine)
            seed_demo_data()
        except Exception:
            pass
            
        await main_app(scope, receive, send)
    except Exception as e:
        err_str = traceback.format_exc()
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
                    "traceback": err_str
                }).encode('utf-8'),
            })

