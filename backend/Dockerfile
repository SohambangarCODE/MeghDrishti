FROM python:3.13-slim
WORKDIR /app
COPY backend/requirements.lock.txt /app/backend/requirements.lock.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.lock.txt
COPY backend/app /app/backend/app
COPY config /app/config
COPY frontend/src/fixtures/reference.json /app/frontend/src/fixtures/reference.json
COPY data/normalized /app/data/normalized
RUN useradd --uid 10001 --create-home appuser && chown -R appuser:appuser /app
USER appuser
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "app.main:app", "--app-dir", "backend", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
