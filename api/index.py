import os
import sys

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(root_dir, "backend")

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from backend.app.main import app
from backend.app.database import engine, Base
from backend.app.seed import seed_demo_data

try:
    Base.metadata.create_all(bind=engine)
    seed_demo_data()
except Exception as e:
    print(f"[Vercel Init] DB setup note: {e}")

