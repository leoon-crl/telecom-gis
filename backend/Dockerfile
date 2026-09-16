# ─────────────────────────────────────────────────────────────
# ART TELECOM GIS — Backend FastAPI (Python 3.12)
# Contexte de build : racine du projet (voir docker-compose.yml)
# ─────────────────────────────────────────────────────────────
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /application

# Dépendances d'abord (cache des couches Docker)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Code applicatif + script de génération des données de démonstration
COPY backend/app ./app
COPY scripts/seed.py ./seed.py

EXPOSE 8000

# .env fourni par docker-compose (variables d'environnement)
# Render injecte PORT (défaut 10000) ; en local/Docker : 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
