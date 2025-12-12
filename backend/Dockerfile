FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy feature engineering module
COPY ../feature_engineering /app/feature_engineering

# Copy backend code
COPY main.py .

# Expose port (Railway will use $PORT environment variable)
EXPOSE 8080

# Run the application
# Note: Use $PORT for Railway/Render, defaults to 8080
# Using sh -c to support environment variable substitution
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
