# PCBuilder AI Service Placeholder Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Injected dependencies from context root
COPY docker/ai/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source from context root
COPY docker/ai/main.py .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
