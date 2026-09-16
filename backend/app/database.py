"""Connexion SQLAlchemy à PostgreSQL / PostGIS."""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

engine = create_engine(
    settings.url_base_dialecte,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dépendance FastAPI : session de base de données par requête."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
