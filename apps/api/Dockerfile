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

# Force cache invalidation for app source (CI passes git SHA)
ARG CACHE_BUST=dev
RUN echo "Cache bust: $CACHE_BUST"
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

# Execute using shell to ensure PORT expansion and gunicorn for production
CMD ["sh", "-c", "gunicorn -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:${PORT:-8080} --workers 1 --timeout 0"]
