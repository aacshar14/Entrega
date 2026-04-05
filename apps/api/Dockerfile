# Use light but full-fat Python image for stable production environment
FROM python:3.11-slim-bookworm
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    libpq5 \
    libffi-dev \
    libssl-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip and install requirements
RUN pip install --no-cache-dir --upgrade pip
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Set world-class metadata
ENV PYTHONUNBUFFERED=1
ENV ENVIRONMENT=production
ENV APP_NAME="Entrega"
ENV VERSION="1.1"
ENV PYTHONPATH=/app

# Expose port (metadata)
EXPOSE 8080

# Execute uvicorn using the PORT environment variable provided by Cloud Run
# Falling back to 8080 for world-class local testing
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}
