import os
import uvicorn
from app.config import settings

if __name__ == "__main__":
    port = settings.PORT or 8001
    reload_enabled = os.getenv("RELOAD", "true").lower() in ("true", "1", "yes")
    print(f"🚀 Starting Admin LINE Bot (Ren) on port {port} (reload={reload_enabled})...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=reload_enabled)

