import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.database import engine, Base
from app.seed import seed_demo_data
from app.routers import webhooks, reviews, sessions, bookings, settings, ws, reply_patterns, uploads, onboarding, phone_numbers, payments

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("main")

# Ensure uploads directory exists
UPLOADS_DIR = "/tmp/uploads" if os.environ.get("VERCEL") == "1" else os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(os.path.join(UPLOADS_DIR, "videos"), exist_ok=True)
os.makedirs(os.path.join(UPLOADS_DIR, "photos"), exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Database Tables
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    # Seed initial demo data
    seed_demo_data()
    yield
    logger.info("Shutting down application...")

app = FastAPI(
    title="Claude (Haiku 4.5) Massage Bot & Admin API",
    description="Backend API for Telnyx SMS bot powered by Anthropic Claude (Haiku 4.5) with PWA Admin Dashboard",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for local PWA frontend dev & production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static file serving for uploaded videos
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# Register Routers
app.include_router(webhooks.router)
app.include_router(reviews.router)
app.include_router(sessions.router)
app.include_router(bookings.router)
app.include_router(settings.router)
app.include_router(reply_patterns.router)
app.include_router(uploads.router)
app.include_router(onboarding.router)
app.include_router(phone_numbers.router)
app.include_router(payments.router)
app.include_router(ws.router)

@app.get("/healthcheck", tags=["Health Check"])
def healthcheck():
    return {
        "status": "healthy",
        "service": "Claude (Haiku 4.5) Messaging Engine",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8085, reload=True)

