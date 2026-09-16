# ─────────────────────────────────────────────────────────────────────────────
# ART TELECOM GIS — Backend FastAPI pour Hugging Face Spaces (SDK Docker)
# Contexte de build : racine du Space (ce dossier).
# 100 % gratuit, sans carte bancaire. La base PostgreSQL/PostGIS est externe
# (Neon) — fournie via le secret DATABASE_URL.
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /application

# Dépendances d'abord (cache des couches Docker)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Code applicatif + générateur des données de démonstration (seed idempotent)
COPY app ./app
COPY seed.py ./seed.py

# Le port d'écoute est déclaré dans le README du Space (app_port: 8000).
# Au démarrage : activation PostGIS + tables + données de démo si base vide.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
