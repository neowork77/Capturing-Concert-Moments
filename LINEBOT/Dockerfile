FROM python:3.11-slim

# Prevent python from buffering stdout/stderr and writing .pyc
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    RELOAD=false

WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies (both bots use the same requirements)
COPY customer_bot/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy bot source codes and runner
COPY customer_bot customer_bot/
COPY admin_bot admin_bot/
COPY run_all.py .

EXPOSE 8000 8001

# Healthcheck checks both bot ports
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health && curl -f http://localhost:8001/health || exit 1

CMD ["python", "run_all.py"]

