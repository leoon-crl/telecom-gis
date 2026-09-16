"""Point d'entrée FastAPI — ART TELECOM GIS."""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.config import settings
from app.database import Base, engine
from app.models import *  # noqa: F401,F403 — enregistre les modèles dans Base.metadata
from app.routes import (
    analyses,
    antennes,
    auth,
    centres,
    export,
    fibres,
    import_data,
    regions,
    statistiques,
    utilisateurs,
)

REPERTOIRE_FRONTEND = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"


@asynccontextmanager
async def duree_de_vie(app: FastAPI):
    """Prépare la base au démarrage : extension PostGIS, tables, puis amorçage
    des données de démonstration si la base est vide (Render / premier lancement)."""
    import sys

    # 1. Extension PostGIS — idempotent (déjà créée par database/init.sql en Docker)
    try:
        with engine.connect() as connexion:
            connexion.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
            connexion.commit()
    except Exception as exc:  # droits insuffisants ou extension déjà active
        print(f"⚠️  PostGIS : extension non vérifiée au démarrage ({exc.__class__.__name__})")

    # 2. Tables (complète database/init.sql)
    Base.metadata.create_all(bind=engine)

    # 3. Données de démonstration uniquement si aucune antenne n'existe encore —
    #    un redéploiement ne réinitialise jamais les données réelles.
    try:
        try:
            import seed  # Docker : /application/seed.py
        except ImportError:
            sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
            sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "scripts"))
            import seed
        seed.semer_si_vide()
    except Exception as exc:
        print(f"⚠️  Amorçage des données de démonstration impossible : {exc}")

    yield


app = FastAPI(
    title=f"{settings.APP_NAME} — API",
    description=(
        "Plateforme SIG de cartographie et d'analyse des infrastructures de "
        "télécommunications — Agence de Régulation des Télécommunications (ART) Cameroun. "
        "**Prototype académique** : les données de démonstration sont simulées et ne "
        "représentent pas des données officielles de l'ART."
    ),
    version=settings.APP_VERSION,
    lifespan=duree_de_vie,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes API
app.include_router(auth.router)
app.include_router(antennes.router)
app.include_router(fibres.router)
app.include_router(centres.router)
app.include_router(regions.router)
app.include_router(statistiques.router)
app.include_router(analyses.router)
app.include_router(import_data.router)
app.include_router(export.router)
app.include_router(utilisateurs.router)


@app.get("/api/health", tags=["Système"], summary="Sonde de disponibilité")
def health():
    return {
        "statut": "ok",
        "application": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "sig": "PostgreSQL + PostGIS",
    }


# ── Service du frontend React compilé (mode production intégré) ──
if REPERTOIRE_FRONTEND.exists():
    app.mount(
        "/assets",
        StaticFiles(directory=REPERTOIRE_FRONTEND / "assets"),
        name="assets",
    )

    @app.get("/{chemin_complet:path}", include_in_schema=False)
    async def servir_frontend(chemin_complet: str):
        fichier = REPERTOIRE_FRONTEND / chemin_complet
        if chemin_complet and fichier.is_file():
            return FileResponse(fichier)
        return FileResponse(REPERTOIRE_FRONTEND / "index.html")
