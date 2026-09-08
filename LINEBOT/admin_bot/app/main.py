from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import webhook
from .config import settings

app = FastAPI(
    title="Admin LINE Bot Webhook Service",
    description="LINE Bot backend for concert booking queue management (Admin Facing - Ren)",
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
        "service": "Admin LINE Bot (Ren)",
        "endpoints": [
            "GET /api/line-admin-webhook (Healthcheck & Diagnostics)",
            "POST /api/line-admin-webhook (LINE Webhook)",
            "POST /webhook",
        ],
    }

