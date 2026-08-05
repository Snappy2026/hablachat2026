from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

import os

db_url = settings.DATABASE_URL
if os.environ.get("VERCEL") == "1" and "sqlite" in db_url:
    db_url = "sqlite:////tmp/massage_bot_v2.db"

# Use pg8000 (pure python driver) for Vercel Serverless safety
if db_url.startswith("postgres://") or db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgres://", "postgresql+pg8000://", 1)
    db_url = db_url.replace("postgresql://", "postgresql+pg8000://", 1)

connect_args = {"check_same_thread": False} if "sqlite" in db_url else {}

engine = create_engine(
    db_url,
    connect_args=connect_args,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print("DB table creation warning:", e)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
