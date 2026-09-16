"""Routes CRUD des antennes relais + endpoint carte GeoJSON."""
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from geoalchemy2 import Geometry
from sqlalchemy import asc, desc, func, text
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user, require_write
from app.database import get_db
from app.models import Antenne, Utilisateur
from app.models.antenne import STATUTS, TECHNOLOGIES, TYPES_ANTENNE
from app.models.journal import journaliser
from app.schemas import AntenneCreate, AntenneOut, AntenneUpdate, PageResult
from app.utils.geo_utils import geom_point_wkt

router = APIRouter(prefix="/api/antennes", tags=["Antennes"])


def _valider_date(v: str | None):
    if v in (None, ""):
        return None
    try:
        return datetime.strptime(v[:10], "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Format de date invalide (attendu : AAAA-MM-JJ).",
        )


def _creer_geom(lat: float, lon: float):
    return func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326)


@router.get("", response_model=PageResult, summary="Liste paginée des antennes")
def liste(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    recherche: str = "",
    operateur: str = "",
    technologie: str = "",
    statut: str = "",
    region: str = "",
    ville: str = "",
    sort_by: str = Query("nom", pattern="^(nom|operateur|technologie|statut|ville|region|date_installation)$"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(get_current_user),
):
    query = db.query(Antenne)
    if recherche:
        mot = f"%{recherche.lower()}%"
        query = query.filter(
            (Antenne.nom.ilike(mot))
            | (Antenne.code.ilike(mot))
            | (Antenne.ville.ilike(mot))
            | (Antenne.adresse.ilike(mot))
        )
    if operateur:
        query = query.filter(Antenne.operateur == operateur)
    if technologie:
        query = query.filter(Antenne.technologie == technologie)
    if statut:
        query = query.filter(Antenne.statut == statut)
    if region:
        query = query.filter(Antenne.region == region)
    if ville:
        query = query.filter(Antenne.ville == ville)

    total = query.count()
    colonne = getattr(Antenne, sort_by)
    query = query.order_by(desc(colonne) if sort_order == "desc" else asc(colonne))
    items = query.offset((page - 1) * size).limit(size).all()

    return PageResult(
        items=[AntenneOut.model_validate(a) for a in items],
        total=total,
        page=page,
        pages=max((total + size - 1) // size, 1),
    )


@router.get("/carte", summary="Données allégées pour la carte (GeoJSON FeatureCollection)")
def carte(
    operateur: str = "",
    technologie: str = "",
    statut: str = "",
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(get_current_user),
):
    """Endpoint optimisé pour Leaflet : uniquement les attributs utiles à l'affichage."""
    query = db.query(
        Antenne.id,
        Antenne.nom,
        Antenne.code,
        Antenne.operateur,
        Antenne.technologie,
        Antenne.statut,
        Antenne.type,
        Antenne.ville,
        Antenne.region,
        Antenne.latitude,
        Antenne.longitude,
    )
    if operateur:
        query = query.filter(Antenne.operateur == operateur)
    if technologie:
        query = query.filter(Antenne.technologie == technologie)
    if statut:
        query = query.filter(Antenne.statut == statut)

    features = [
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [r.longitude, r.latitude]},
            "properties": {
                "id": r.id,
                "nom": r.nom,
                "code": r.code,
                "operateur": r.operateur,
                "technologie": r.technologie,
                "statut": r.statut,
                "type": r.type,
                "ville": r.ville,
                "region": r.region,
            },
        }
        for r in query.all()
    ]
    return {"type": "FeatureCollection", "features": features}


@router.get("/filtres", summary="Valeurs distinctes pour les filtres")
def filtres(
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(get_current_user),
):
    return {
        "operateurs": [o for (o,) in db.query(Antenne.operateur).distinct().order_by(Antenne.operateur)],
        "technologies": TECHNOLOGIES,
        "statuts": STATUTS,
        "types": TYPES_ANTENNE,
        "regions": [r for (r,) in db.query(Antenne.region).distinct().order_by(Antenne.region)],
        "villes": [v for (v,) in db.query(Antenne.ville).distinct().order_by(Antenne.ville)],
    }


@router.get("/{antenne_id}", response_model=AntenneOut, summary="Détail d'une antenne")
def detail(antenne_id: int, db: Session = Depends(get_db), _: Utilisateur = Depends(get_current_user)):
    antenne = db.get(Antenne, antenne_id)
    if antenne is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Antenne introuvable.")
    return antenne


@router.post("", response_model=AntenneOut, status_code=201, summary="Créer une antenne")
def creer(
    donnees: AntenneCreate,
    db: Session = Depends(get_db),
    user: Utilisateur = Depends(require_write),
):
    if db.query(Antenne).filter(Antenne.code == donnees.code).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Le code « {donnees.code} » existe déjà.")

    antenne = Antenne(
        **donnees.model_dump(exclude={"date_installation"}),
        date_installation=_valider_date(donnees.date_installation),
        geom=_creer_geom(donnees.latitude, donnees.longitude),
    )
    db.add(antenne)
    journaliser(db, user, "CREATION", "antenne", f"Antenne {antenne.code} — {antenne.nom}")
    db.commit()
    db.refresh(antenne)
    return antenne


@router.put("/{antenne_id}", response_model=AntenneOut, summary="Modifier une antenne")
def modifier(
    antenne_id: int,
    donnees: AntenneUpdate,
    db: Session = Depends(get_db),
    user: Utilisateur = Depends(require_write),
):
    antenne = db.get(Antenne, antenne_id)
    if antenne is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Antenne introuvable.")

    modifications = donnees.model_dump(exclude_none=True)
    if "code" in modifications:
        doublon = (
            db.query(Antenne)
            .filter(Antenne.code == modifications["code"], Antenne.id != antenne_id)
            .first()
        )
        if doublon:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Le code « {modifications['code']} » existe déjà.")

    if "date_installation" in donnees.model_dump(exclude_none=True) or donnees.date_installation is not None:
        modifications["date_installation"] = _valider_date(donnees.date_installation)

    for champ, valeur in modifications.items():
        setattr(antenne, champ, valeur)

    if "latitude" in modifications or "longitude" in modifications:
        antenne.geom = _creer_geom(antenne.latitude, antenne.longitude)

    journaliser(db, user, "MODIFICATION", "antenne", f"Antenne {antenne.code} — {antenne.nom}")
    db.commit()
    db.refresh(antenne)
    return antenne


@router.delete("/{antenne_id}", status_code=204, summary="Supprimer une antenne")
def supprimer(
    antenne_id: int,
    db: Session = Depends(get_db),
    user: Utilisateur = Depends(require_write),
):
    antenne = db.get(Antenne, antenne_id)
    if antenne is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Antenne introuvable.")
    journaliser(db, user, "SUPPRESSION", "antenne", f"Antenne {antenne.code} — {antenne.nom}")
    db.delete(antenne)
    db.commit()
