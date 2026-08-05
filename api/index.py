from app.main import app
from app.database import engine, Base
from app.seed import seed_demo_data

try:
    Base.metadata.create_all(bind=engine)
    seed_demo_data()
except Exception as e:
    print(f"[Vercel Init] DB setup note: {e}")

