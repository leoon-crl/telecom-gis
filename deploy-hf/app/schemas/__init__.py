"""Schémas Pydantic — antennes, fibres, centres, régions, utilisateurs, analyses."""
from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


def date_vers_chaine(v):
    """Convertit date/datetime en chaîne ISO pour la sérialisation JSON."""
    if isinstance(v, (date, datetime)):
        return v.isoformat()
    return v


# ───────────────────────────── AUTH ─────────────────────────────
class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=4)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UtilisateurOut"


# ───────────────────────── UTILISATEURS ─────────────────────────
class UtilisateurBase(BaseModel):
    nom: str = Field(min_length=2, max_length=120)
    email: EmailStr
    role: str = Field(pattern="^(ADMIN|AGENT)$")

    @field_validator("role")
    @classmethod
    def role_valide(cls, v: str) -> str:
        return v.upper()


class UtilisateurCreate(UtilisateurBase):
    password: str = Field(min_length=6)


class UtilisateurUpdate(BaseModel):
    nom: str | None = Field(default=None, min_length=2, max_length=120)
    email: EmailStr | None = None
    role: str | None = Field(default=None, pattern="^(ADMIN|AGENT)$")
    actif: bool | None = None
    password: str | None = Field(default=None, min_length=6)


class UtilisateurOut(BaseModel):
    id: int
    nom: str
    email: str
    role: str
    actif: bool

    model_config = {"from_attributes": True}


# ─────────────────────────── ANTENNES ───────────────────────────
class AntenneBase(BaseModel):
    nom: str = Field(min_length=2, max_length=150)
    code: str = Field(min_length=2, max_length=50)
    operateur: str = Field(min_length=2, max_length=80)
    type: str = "MACRO_CELL"
    technologie: str = Field(pattern="^(2G|3G|4G|5G)$")
    statut: str = Field(pattern="^(ACTIF|MAINTENANCE|PROJET|HORS_SERVICE)$")
    hauteur: float | None = Field(default=None, gt=0, le=300)
    puissance: float | None = Field(default=None, gt=0, le=500)
    date_installation: str | None = None
    adresse: str | None = Field(default=None, max_length=255)
    ville: str = Field(min_length=2, max_length=100)
    region: str = Field(min_length=2, max_length=100)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)

    @field_validator("date_installation", mode="before")
    @classmethod
    def date_valide(cls, v):
        if v in ("", None):
            return None
        return v


class AntenneCreate(AntenneBase):
    pass


class AntenneUpdate(BaseModel):
    nom: str | None = Field(default=None, min_length=2, max_length=150)
    code: str | None = Field(default=None, min_length=2, max_length=50)
    operateur: str | None = Field(default=None, min_length=2, max_length=80)
    type: str | None = None
    technologie: str | None = Field(default=None, pattern="^(2G|3G|4G|5G)$")
    statut: str | None = Field(default=None, pattern="^(ACTIF|MAINTENANCE|PROJET|HORS_SERVICE)$")
    hauteur: float | None = Field(default=None, gt=0, le=300)
    puissance: float | None = Field(default=None, gt=0, le=500)
    date_installation: str | None = None
    adresse: str | None = None
    ville: str | None = Field(default=None, min_length=2, max_length=100)
    region: str | None = Field(default=None, min_length=2, max_length=100)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


class AntenneOut(BaseModel):
    id: int
    nom: str
    code: str
    operateur: str
    type: str
    technologie: str
    statut: str
    hauteur: float | None
    puissance: float | None
    date_installation: str | None
    adresse: str | None
    ville: str
    region: str
    latitude: float
    longitude: float

    @field_validator("date_installation", mode="before")
    @classmethod
    def _normaliser_date(cls, v):
        return date_vers_chaine(v)

    model_config = {"from_attributes": True}


# ─────────────────────────── FIBRES ────────────────────────────
class FibreBase(BaseModel):
    nom: str = Field(min_length=2, max_length=150)
    code: str = Field(min_length=2, max_length=50)
    operateur: str = Field(min_length=2, max_length=80)
    type: str = "SOUTERRAIN"
    capacite: str | None = None
    longueur: float | None = Field(default=None, gt=0)
    statut: str = Field(pattern="^(ACTIF|MAINTENANCE|PROJET|HORS_SERVICE)$")
    date_installation: str | None = None
    origine: str = Field(min_length=2, max_length=100)
    destination: str = Field(min_length=2, max_length=100)
    # Géométrie : [[lon, lat], ...] pour créer le LineString
    coordonnees: list[list[float]] | None = None

    @field_validator("coordonnees")
    @classmethod
    def coords_valides(cls, v):
        if v is None:
            return v
        if len(v) < 2:
            raise ValueError("Un tronçon de fibre nécessite au moins 2 points.")
        for c in v:
            if len(c) != 2 or not (-180 <= c[0] <= 180) or not (-90 <= c[1] <= 90):
                raise ValueError(
                    f"Coordonnée invalide : {c} (longitude entre -180 et 180, latitude entre -90 et 90)."
                )
        return v


class FibreCreate(FibreBase):
    pass


class FibreUpdate(BaseModel):
    nom: str | None = Field(default=None, min_length=2, max_length=150)
    code: str | None = Field(default=None, min_length=2, max_length=50)
    operateur: str | None = None
    type: str | None = None
    capacite: str | None = None
    longueur: float | None = Field(default=None, gt=0)
    statut: str | None = Field(default=None, pattern="^(ACTIF|MAINTENANCE|PROJET|HORS_SERVICE)$")
    date_installation: str | None = None
    origine: str | None = None
    destination: str | None = None
    coordonnees: list[list[float]] | None = None


class FibreOut(BaseModel):
    id: int
    nom: str
    code: str
    operateur: str
    type: str
    capacite: str | None
    longueur: float | None
    statut: str
    date_installation: str | None
    origine: str
    destination: str
    coordonnees: list | None = None

    @field_validator("date_installation", mode="before")
    @classmethod
    def _normaliser_date(cls, v):
        return date_vers_chaine(v)

    model_config = {"from_attributes": True}


# ──────────────────────── CENTRES TECHNIQUES ─────────────────────
class CentreBase(BaseModel):
    nom: str = Field(min_length=2, max_length=150)
    code: str = Field(min_length=2, max_length=50)
    operateur: str = Field(min_length=2, max_length=80)
    type: str = "NŒUD DE COMMUTATION"
    statut: str = Field(pattern="^(ACTIF|MAINTENANCE|PROJET|HORS_SERVICE)$")
    adresse: str | None = Field(default=None, max_length=255)
    ville: str = Field(min_length=2, max_length=100)
    region: str = Field(min_length=2, max_length=100)
    capacite: str | None = None
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class CentreCreate(CentreBase):
    pass


class CentreUpdate(BaseModel):
    nom: str | None = Field(default=None, min_length=2, max_length=150)
    code: str | None = Field(default=None, min_length=2, max_length=50)
    operateur: str | None = None
    type: str | None = None
    statut: str | None = Field(default=None, pattern="^(ACTIF|MAINTENANCE|PROJET|HORS_SERVICE)$")
    adresse: str | None = None
    ville: str | None = None
    region: str | None = None
    capacite: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


class CentreOut(BaseModel):
    id: int
    nom: str
    code: str
    operateur: str
    type: str
    statut: str
    adresse: str | None
    ville: str
    region: str
    capacite: str | None
    latitude: float
    longitude: float

    model_config = {"from_attributes": True}


# ─────────────────────────── PAGINATION ──────────────────────────
class PageResult(BaseModel):
    items: list
    total: int
    page: int
    pages: int


TokenResponse.model_rebuild()
