# Build stage
FROM python:3.11-slim-bookworm AS builder
WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip to ensure world-class compatibility
RUN pip install --no-cache-dir --upgrade pip

COPY requirements.txt .
# Install to /install to have a clean copy for the runner stage
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Final runtime stage
FROM python:3.11-slim-bookworm AS runner
WORKDIR /app

# Install runtime library dependencies (only what is strictly needed)
RUN apt-get update && apt-get install -y \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy only the installed packages from builder
COPY --from=builder /install /usr/local
COPY . .

# Setting environment and world-class metadata
ENV PYTHONUNBUFFERED=1
ENV APP_NAME="entrega-api"
ENV VERSION="1.1"

EXPOSE 8080

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
