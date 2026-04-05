# Build and Runtime stage
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

# Upgrade pip and install requirements directly
RUN pip install --no-cache-dir --upgrade pip
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Setting environment and world-class metadata
ENV PYTHONUNBUFFERED=1
ENV APP_NAME="Entrega"
ENV VERSION="1.1"

EXPOSE 8080

# Using direct uvicorn command for world-class container hygiene
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
