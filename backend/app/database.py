from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

import os

# Handle SQLite threading requirement
db_url = settings.DATABASE_URL
if os.environ.get("VERCEL") == "1":
    db_url = "sqlite:////tmp/massage_bot.db"

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
