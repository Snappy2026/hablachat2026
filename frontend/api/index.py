import os
import sys
from mangum import Mangum

# Ensure frontend directory is in sys.path
frontend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if frontend_dir not in sys.path:
    sys.path.insert(0, frontend_dir)

from app.main import app
from app.database import engine, Base
from app.seed import seed_demo_data

# Initialize DB tables and seed data
try:
    Base.metadata.create_all(bind=engine)
    seed_demo_data()
except Exception as e:
    print(f"[Vercel Init] DB setup note: {e}")

# Export Mangum handler for Vercel Serverless
app_handler = Mangum(app)
handler = Mangum(app)
