# Use full Python image to ensure all system libraries are present for version 1.1
FROM python:3.11-bookworm
WORKDIR /app

# Install production-ready components (Gunicorn + Uvicorn)
RUN pip install --no-cache-dir --upgrade pip
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir gunicorn

# Copy application source
COPY . .

# Set world-class environment and metadata
ENV PYTHONUNBUFFERED=1
ENV ENVIRONMENT=production
ENV APP_NAME="Entrega"
ENV VERSION="1.1"
ENV PYTHONPATH=/app

# Expose port (metadata)
EXPOSE 8080

# Using Gunicorn with Uvicorn worker for world-class production stability in Cloud Run
# This ensures robust port binding and signal handling
CMD ["gunicorn", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8080", "--workers", "1", "--timeout", "120", "app.main:app"]
