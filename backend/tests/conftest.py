"""Configuration pytest — session de base dédiée aux tests."""
import os

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg2://telecom:telecom2026@localhost:5432/telecom_gis",
)
