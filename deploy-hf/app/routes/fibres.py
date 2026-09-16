"""Routes CRUD des tronçons de fibre optique + endpoint carte GeoJSON."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from geoalchemy2 import Geometry
from sqlalchemy import asc, desc, func
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user, require_write
from app.database import get_db
from app.models import Fibre, Utilisateur
from app.models.fibre import CAPACITES, TYPES_FIBRE
from app.models.journal import journaliser
from app.schemas import FibreCreate, FibreOut, FibreUpdate, PageResult
from app.utils.geo_utils import calculer_longueur_km, geom_linestring_wkt

router = APIRouter(prefix="/api/fibres", tags=["Fibres optiques"])


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


def _creer_geom(coordonnees: list[list[float]]):
    wkt = geom_linestring_wkt(coordonnees)
    return func.ST_SetSRID(func.ST_GeomFromText(wkt), 4326)


def _coordonnees(db: Session, fibre: Fibre) -> list:
    """Récupère les coordonnées [lon, lat] du LineString via PostGIS."""
    lignes = db.execute(
        func.ST_AsGeoJSON(fibre.geom)
    ).scalar()
    import json

    if not lignes:
        return []
    geo = json.loads(lignes)
    return geo.get("coordinates", [])


def _vers_out(db: Session, fibre: Fibre) -> FibreOut:
    data = {
        c: getattr(fibre, c)
        for c in ("id", "nom", "code", "operateur", "type", "capacite",
                  "longueur", "statut", "origine", "destination")
    }
    data["date_installation"] = (
        fibre.date_installation.isoformat() if fibre.date_installation else None
    )
    data["coordonnees"] = _coordonnees(db, fibre)
    return FibreOut(**data)


@router.get("", response_model=PageResult, summary="Liste paginée des tronçons de fibre")
def liste(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    recherche: str = "",
    operateur: str = "",
    statut: str = "",
    type: str = "",
    sort_by: str = Query("nom", pattern="^(nom|operateur|statut|type|longueur|origine|destination)$"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(get_current_user),
):
    query = db.query(Fibre)
    if recherche:
        mot = f"%{recherche.lower()}%"
        query = query.filter(
            (Fibre.nom.ilike(mot))
            | (Fibre.code.ilike(mot))
            | (Fibre.origine.ilike(mot))
            | (Fibre.destination.ilike(mot))
        )
    if operateur:
        query = query.filter(Fibre.operateur == operateur)
    if statut:
        query = query.filter(Fibre.statut == statut)
    if type:
        query = query.filter(Fibre.type == type)

    total = query.count()
    colonne = getattr(Fibre, sort_by)
    query = query.order_by(desc(colonne) if sort_order == "desc" else asc(colonne))
    items = query.offset((page - 1) * size).limit(size).all()

    return PageResult(
        items=[_vers_out(db, f) for f in items],
        total=total,
        page=page,
        pages=max((total + size - 1) // size, 1),
    )


@router.get("/carte", summary="Tronçons pour la carte (GeoJSON FeatureCollection)")
def carte(
    operateur: str = "",
    statut: str = "",
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(get_current_user),
):
    query = db.query(
        Fibre.id,
        Fibre.nom,
        Fibre.code,
        Fibre.operateur,
        Fibre.type,
        Fibre.statut,
        Fibre.origine,
        Fibre.destination,
        Fibre.longueur,
        Fibre.capacite,
        func.ST_AsGeoJSON(Fibre.geom).label("geojson"),
    )
    if operateur:
        query = query.filter(Fibre.operateur == operateur)
    if statut:
        query = query.filter(Fibre.statut == statut)

    import json

    features = []
    for r in query.all():
        geometry = json.loads(r.geojson) if r.geojson else None
        if geometry is None:
            continue
        features.append(
            {
                "type": "Feature",
                "geometry": geometry,
                "properties": {
                    "id": r.id,
                    "nom": r.nom,
                    "code": r.code,
                    "operateur": r.operateur,
                    "type": r.type,
                    "statut": r.statut,
                    "origine": r.origine,
                    "destination": r.destination,
                    "longueur": r.longueur,
                    "capacite": r.capacite,
                },
            }
        )
    return {"type": "FeatureCollection", "features": features}


@router.get("/filtres", summary="Valeurs distinctes pour les filtres")
def filtres(
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(get_current_user),
):
    return {
        "operateurs": [o for (o,) in db.query(Fibre.operateur).distinct().order_by(Fibre.operateur)],
        "statuts": ["ACTIF", "MAINTENANCE", "PROJET", "HORS_SERVICE"],
        "types": TYPES_FIBRE,
        "capacites": CAPACITES,
    }


@router.get("/{fibre_id}", response_model=FibreOut, summary="Détail d'un tronçon")
def detail(fibre_id: int, db: Session = Depends(get_db), _: Utilisateur = Depends(get_current_user)):
    fibre = db.get(Fibre, fibre_id)
    if fibre is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tronçon de fibre introuvable.")
    return _vers_out(db, fibre)


@router.post("", response_model=FibreOut, status_code=201, summary="Créer un tronçon")
def creer(
    donnees: FibreCreate,
    db: Session = Depends(get_db),
    user: Utilisateur = Depends(require_write),
):
    if db.query(Fibre).filter(Fibre.code == donnees.code).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Le code « {donnees.code} » existe déjà.")
    if donnees.coordonnees is None or len(donnees.coordonnees) < 2:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Coordonnées du tracé obligatoires (au moins 2 points [longitude, latitude]).",
        )

    longueur = donnees.longueur or calculer_longueur_km(db, donnees.coordonnees)
    fibre = Fibre(
        nom=donnees.nom,
        code=donnees.code,
        operateur=donnees.operateur,
        type=donnees.type,
        capacite=donnees.capacite,
        longueur=longueur,
        statut=donnees.statut,
        date_installation=_valider_date(donnees.date_installation),
        origine=donnees.origine,
        destination=donnees.destination,
        geom=_creer_geom(donnees.coordonnees),
    )
    db.add(fibre)
    journaliser(db, user, "CREATION", "fibre", f"Tronçon {fibre.code} — {fibre.nom}")
    db.commit()
    db.refresh(fibre)
    return _vers_out(db, fibre)


@router.put("/{fibre_id}", response_model=FibreOut, summary="Modifier un tronçon")
def modifier(
    fibre_id: int,
    donnees: FibreUpdate,
    db: Session = Depends(get_db),
    user: Utilisateur = Depends(require_write),
):
    fibre = db.get(Fibre, fibre_id)
    if fibre is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tronçon de fibre introuvable.")

    modifications = donnees.model_dump(exclude_none=True)
    if "code" in modifications:
        doublon = (
            db.query(Fibre)
            .filter(Fibre.code == modifications["code"], Fibre.id != fibre_id)
            .first()
        )
        if doublon:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Le code « {modifications['code']} » existe déjà.")
    if "coordonnees" in modifications:
        coordonnees = modifications.pop("coordonnees")
        fibre.geom = _creer_geom(coordonnees)
        if donnees.longueur is None:
            fibre.longueur = calculer_longueur_km(db, coordonnees)
    if "date_installation" in modifications:
        modifications["date_installation"] = _valider_date(donnees.date_installation)

    for champ, valeur in modifications.items():
        setattr(fibre, champ, valeur)

    journaliser(db, user, "MODIFICATION", "fibre", f"Tronçon {fibre.code} — {fibre.nom}")
    db.commit()
    db.refresh(fibre)
    return _vers_out(db, fibre)


@router.delete("/{fibre_id}", status_code=204, summary="Supprimer un tronçon")
def supprimer(
    fibre_id: int,
    db: Session = Depends(get_db),
    user: Utilisateur = Depends(require_write),
):
    fibre = db.get(Fibre, fibre_id)
    if fibre is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tronçon de fibre introuvable.")
    journaliser(db, user, "SUPPRESSION", "fibre", f"Tronçon {fibre.code} — {fibre.nom}")
    db.delete(fibre)
    db.commit()
