"""Modèle Tronçon de fibre optique — geometry(LineString, 4326)."""
from datetime import date, datetime

from geoalchemy2 import Geometry
from sqlalchemy import (
    Date,
    DateTime,
    Float,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Fibre(Base):
    __tablename__ = "fibres"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nom: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    operateur: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(50), nullable=False, default="SOUTERRAIN")
    capacite: Mapped[str | None] = mapped_column(String(50), nullable=True)
    longueur: Mapped[float | None] = mapped_column(Float, nullable=True)  # km
    statut: Mapped[str] = mapped_column(String(30), nullable=False, default="ACTIF", index=True)
    date_installation: Mapped[date | None] = mapped_column(Date, nullable=True)
    origine: Mapped[str] = mapped_column(String(100), nullable=False)
    destination: Mapped[str] = mapped_column(String(100), nullable=False)
    geom = mapped_column(Geometry(geometry_type="LINESTRING", srid=4326), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )



TYPES_FIBRE = ["SOUTERRAIN", "AERIEN", "IMMERGE", "MIXTE"]
CAPACITES = ["24 fibres", "48 fibres", "96 fibres", "144 fibres", "288 fibres"]
