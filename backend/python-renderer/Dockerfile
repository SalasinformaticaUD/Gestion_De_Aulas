FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    REPORT_TEMPLATES_DIR=/app/templates/reportes \
    SOFFICE_PATH=/usr/bin/soffice

RUN apt-get update \
    && apt-get install -y --no-install-recommends libreoffice-calc fonts-dejavu \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY python-renderer/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY python-renderer/app ./app
COPY templates/reportes ./templates/reportes

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
