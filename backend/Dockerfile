# Use the official lightweight Python 3.13 image
FROM python:3.13.3-slim

# Set working directory inside container
WORKDIR /app

# Environment variables: no .pyc, no buffering, UTF-8 everywhere
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    LANG=C.UTF-8

# Install system dependencies for psycopg2 and other builds
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    libpq-dev \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install pip upgrade (faster, avoids cache issues)
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Copy requirements first (better caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Expose the FastAPI port (optional for Render but fine)
EXPOSE 8000

# Run the FastAPI app with Uvicorn using Render's PORT
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port $PORT"]
