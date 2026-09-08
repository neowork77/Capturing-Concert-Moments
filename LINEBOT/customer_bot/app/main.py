from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import webhook
from .config import settings

app = FastAPI(
    title="Customer LINE Bot Webhook Service",
    description="LINE Bot backend for concert photo booth booking (Customer Facing)",
    version="1.0.0",
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include webhook routes
app.include_router(webhook.router)


@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "Customer LINE Bot",
        "endpoints": [
            "POST /api/line-webhook",
            "POST /webhook",
            "GET /health (Database & Env Diagnostics)",
        ],
    }


@app.get("/health")
async def health_check():
    db_status = "untested"
    details = ""
    try:
        from .database import SessionLocal
        from .models import Schedule
        if SessionLocal is not None:
            db = SessionLocal()
            try:
                count = db.query(Schedule).count()
                db_status = "connected"
                details = f"Successfully queried schedules table ({count} records found)"
            finally:
                db.close()
        else:
            db_status = "not_configured"
            details = "DATABASE_URL is not set"
    except Exception as e:
        db_status = "error"
        details = str(e)

    return {
        "status": "online",
        "service": "Customer LINE Bot",
        "database": {
            "status": db_status,
            "details": details,
        },
        "hasDatabaseUrl": bool(settings.DATABASE_URL),
        "hasLineSecret": bool(settings.LINE_CHANNEL_SECRET),
        "hasLineToken": bool(settings.LINE_CHANNEL_ACCESS_TOKEN),
    }

