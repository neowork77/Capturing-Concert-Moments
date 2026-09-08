#!/usr/bin/env python3
"""
Launcher script to run both Customer LINE Bot and Admin LINE Bot concurrently.
Customer Bot -> Port 8000
Admin Bot    -> Port 8001
"""
import sys
import subprocess
import signal
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
CUSTOMER_DIR = BASE_DIR / "customer_bot"
ADMIN_DIR = BASE_DIR / "admin_bot"


def main():
    print("==================================================")
    print("  🚀 Starting All LINE Bots (Python / FastAPI)   ")
    print("==================================================")
    print("🤖 Customer Bot: http://localhost:8000/api/line-webhook")
    print("👑 Admin Bot:    http://localhost:8001/api/line-admin-webhook")
    print("--------------------------------------------------")
    print("Press Ctrl+C to stop both bots.")
    print("==================================================\n")

    p1 = subprocess.Popen(
        [sys.executable, "run.py"],
        cwd=CUSTOMER_DIR,
    )

    p2 = subprocess.Popen(
        [sys.executable, "run.py"],
        cwd=ADMIN_DIR,
    )

    def signal_handler(sig, frame):
        print("\n🛑 Stopping both bots...")
        p1.terminate()
        p2.terminate()
        p1.wait()
        p2.wait()
        print("✅ Both bots stopped cleanly.")
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    try:
        p1.wait()
        p2.wait()
    except KeyboardInterrupt:
        signal_handler(None, None)


if __name__ == "__main__":
    main()

