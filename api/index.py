import os
import sys

# Add the 'api' directory to sys.path so 'app' can be imported natively
api_dir = os.path.dirname(os.path.abspath(__file__))
if api_dir not in sys.path:
    sys.path.insert(0, api_dir)

from app.main import app
from app.database import engine, Base
from app.seed import seed_demo_data

try:
    Base.metadata.create_all(bind=engine)
    seed_demo_data()
except Exception as e:
    print(f"[Vercel Init] DB setup note: {e}")
