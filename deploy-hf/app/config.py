"""Configuration de l'application via variables d'environnement (.env)."""
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# .env situé dans le dossier backend/ — résolu indépendamment du répertoire courant
_CHEMIN_ENV = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_CHEMIN_ENV), env_file_encoding="utf-8", extra="ignore"
    )

    @classmethod
    def settings_customise_sources(
        cls, settings_cls, init_settings, env_settings, dotenv_settings, file_secret_settings
    ):
        # Le fichier .env du backend est prioritaire sur les variables
        # d'environnement globales du système (ex. DATABASE_URL du hôte).
        return (init_settings, dotenv_settings, env_settings, file_secret_settings)

    # Base de données PostgreSQL + PostGIS
    DATABASE_URL: str = "postgresql+psycopg2://telecom:telecom2026@localhost:5432/telecom_gis"

    # Sécurité / JWT
    SECRET_KEY: str = "CHANGEZ-MOI-cle-secrete-jwt-a-definir-dans-le-fichier-env"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://localhost:4173"

    # Application
    APP_NAME: str = "ART TELECOM GIS"
    APP_VERSION: str = "1.0.0"
    PORT: int = 8000

    @field_validator("DATABASE_URL", mode="after")
    @classmethod
    def _normaliser_url_base(cls, valeur: str) -> str:
        """Compatibilité hébergeurs (Render) : convertit postgres:// en
        postgresql:// (schéma SQLAlchemy psycopg2)."""
        if valeur.startswith("postgres://"):
            return valeur.replace("postgres://", "postgresql://", 1)
        return valeur

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def url_base_dialecte(self) -> str:
        """URL garantie avec le dialecte psycopg2 pour SQLAlchemy."""
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
        return url


settings = Settings()
