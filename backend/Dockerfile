# backend/Dockerfile
FROM python:3.11-slim

# Install system dependencies required for OpenCV and other packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements file first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code into /app/backend
# This structure ensures 'backend' package is importable
COPY . /app/backend

# Expose port 8000
EXPOSE 8000

# Set environment variable to ensure Python output is unbuffered
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Command to run the application
# We run from /app so that "backend.api" is importable as a package
CMD ["uvicorn", "backend.api:app", "--host", "0.0.0.0", "--port", "8000"]