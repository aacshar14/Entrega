# Build and Runtime stage
FROM python:3.11-slim-bookworm
WORKDIR /app

# Install system dependencies (including security and runtime essentials)
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    libpq5 \
    libffi-dev \
    libssl-dev \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip and install requirements directly
RUN pip install --no-cache-dir --upgrade pip
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Set world-class environment variables
ENV PYTHONUNBUFFERED=1
ENV ENVIRONMENT=production
ENV APP_NAME="Entrega"
ENV VERSION="1.1"
ENV PYTHONPATH=/app

# Expose port 8080 (Cloud Run default)
EXPOSE 8080

# Using exec form for world-class signaling and robust startup
# We listen on 0.0.0.0:8080 correctly as per Cloud Run standards
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--proxy-headers", "--forwarded-allow-ips", "*"]
