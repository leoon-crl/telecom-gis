"""Modèle Antenne relais — geometry(Point, 4326)."""
from datetime import date, datetime

from geoalchemy2 import Geometry
from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Antenne(Base):
    __tablename__ = "antennes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nom: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    operateur: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(50), nullable=False, default="MACRO_CELL")
    technologie: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    statut: Mapped[str] = mapped_column(String(30), nullable=False, default="ACTIF", index=True)
    hauteur: Mapped[float | None] = mapped_column(Float, nullable=True)
    puissance: Mapped[float | None] = mapped_column(Float, nullable=True)
    date_installation: Mapped[date | None] = mapped_column(Date, nullable=True)
    adresse: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ville: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    region: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    geom = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )



TYPES_ANTENNE = ["MACRO_CELL", "MICRO_CELL", "PICO_CELL", "FEMTO_CELL", "ROOFTOP"]
TECHNOLOGIES = ["2G", "3G", "4G", "5G"]
STATUTS = ["ACTIF", "MAINTENANCE", "PROJET", "HORS_SERVICE"]
OPERATEURS = ["CAMTEL", "MTN Cameroun", "Orange Cameroun", "Nexttel (Viettel)"]
