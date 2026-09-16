"""Routes CRUD des centres techniques + endpoint carte GeoJSON."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from geoalchemy2 import Geometry
from sqlalchemy import asc, desc, func
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user, require_write
from app.database import get_db
from app.models import CentreTechnique, Utilisateur
from app.models.centre import TYPES_CENTRE
from app.models.journal import journaliser
from app.schemas import CentreCreate, CentreOut, CentreUpdate, PageResult

router = APIRouter(prefix="/api/centres", tags=["Centres techniques"])


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


@router.get("", response_model=PageResult, summary="Liste paginée des centres techniques")
def liste(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    recherche: str = "",
    operateur: str = "",
    statut: str = "",
    type: str = "",
    region: str = "",
    ville: str = "",
    sort_by: str = Query("nom", pattern="^(nom|operateur|statut|ville|region)$"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(get_current_user),
):
    query = db.query(CentreTechnique)
    if recherche:
        mot = f"%{recherche.lower()}%"
        query = query.filter(
            (CentreTechnique.nom.ilike(mot))
            | (CentreTechnique.code.ilike(mot))
            | (CentreTechnique.ville.ilike(mot))
            | (CentreTechnique.adresse.ilike(mot))
        )
    if operateur:
        query = query.filter(CentreTechnique.operateur == operateur)
    if statut:
        query = query.filter(CentreTechnique.statut == statut)
    if type:
        query = query.filter(CentreTechnique.type == type)
    if region:
        query = query.filter(CentreTechnique.region == region)
    if ville:
        query = query.filter(CentreTechnique.ville == ville)

    total = query.count()
    colonne = getattr(CentreTechnique, sort_by)
    query = query.order_by(desc(colonne) if sort_order == "desc" else asc(colonne))
    items = query.offset((page - 1) * size).limit(size).all()

    return PageResult(
        items=[CentreOut.model_validate(c) for c in items],
        total=total,
        page=page,
        pages=max((total + size - 1) // size, 1),
    )


@router.get("/carte", summary="Centres pour la carte (GeoJSON FeatureCollection)")
def carte(
    operateur: str = "",
    statut: str = "",
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(get_current_user),
):
    query = db.query(
        CentreTechnique.id,
        CentreTechnique.nom,
        CentreTechnique.code,
        CentreTechnique.operateur,
        CentreTechnique.type,
        CentreTechnique.statut,
        CentreTechnique.ville,
        CentreTechnique.region,
        CentreTechnique.capacite,
        CentreTechnique.latitude,
        CentreTechnique.longitude,
    )
    if operateur:
        query = query.filter(CentreTechnique.operateur == operateur)
    if statut:
        query = query.filter(CentreTechnique.statut == statut)

    features = [
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [r.longitude, r.latitude]},
            "properties": {
                "id": r.id,
                "nom": r.nom,
                "code": r.code,
                "operateur": r.operateur,
                "type": r.type,
                "statut": r.statut,
                "ville": r.ville,
                "region": r.region,
                "capacite": r.capacite,
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
        "operateurs": [o for (o,) in db.query(CentreTechnique.operateur).distinct().order_by(CentreTechnique.operateur)],
        "statuts": ["ACTIF", "MAINTENANCE", "PROJET", "HORS_SERVICE"],
        "types": TYPES_CENTRE,
        "regions": [r for (r,) in db.query(CentreTechnique.region).distinct().order_by(CentreTechnique.region)],
    }


@router.get("/{centre_id}", response_model=CentreOut, summary="Détail d'un centre technique")
def detail(centre_id: int, db: Session = Depends(get_db), _: Utilisateur = Depends(get_current_user)):
    centre = db.get(CentreTechnique, centre_id)
    if centre is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Centre technique introuvable.")
    return centre


@router.post("", response_model=CentreOut, status_code=201, summary="Créer un centre technique")
def creer(
    donnees: CentreCreate,
    db: Session = Depends(get_db),
    user: Utilisateur = Depends(require_write),
):
    if db.query(CentreTechnique).filter(CentreTechnique.code == donnees.code).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Le code « {donnees.code} » existe déjà.")
    centre = CentreTechnique(
        **donnees.model_dump(),
        geom=_creer_geom(donnees.latitude, donnees.longitude),
    )
    db.add(centre)
    journaliser(db, user, "CREATION", "centre", f"Centre {centre.code} — {centre.nom}")
    db.commit()
    db.refresh(centre)
    return centre


@router.put("/{centre_id}", response_model=CentreOut, summary="Modifier un centre technique")
def modifier(
    centre_id: int,
    donnees: CentreUpdate,
    db: Session = Depends(get_db),
    user: Utilisateur = Depends(require_write),
):
    centre = db.get(CentreTechnique, centre_id)
    if centre is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Centre technique introuvable.")

    modifications = donnees.model_dump(exclude_none=True)
    if "code" in modifications:
        doublon = (
            db.query(CentreTechnique)
            .filter(CentreTechnique.code == modifications["code"], CentreTechnique.id != centre_id)
            .first()
        )
        if doublon:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Le code « {modifications['code']} » existe déjà.")
    for champ, valeur in modifications.items():
        setattr(centre, champ, valeur)
    if "latitude" in modifications or "longitude" in modifications:
        centre.geom = _creer_geom(centre.latitude, centre.longitude)

    journaliser(db, user, "MODIFICATION", "centre", f"Centre {centre.code} — {centre.nom}")
    db.commit()
    db.refresh(centre)
    return centre


@router.delete("/{centre_id}", status_code=204, summary="Supprimer un centre technique")
def supprimer(
    centre_id: int,
    db: Session = Depends(get_db),
    user: Utilisateur = Depends(require_write),
):
    centre = db.get(CentreTechnique, centre_id)
    if centre is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Centre technique introuvable.")
    journaliser(db, user, "SUPPRESSION", "centre", f"Centre {centre.code} — {centre.nom}")
    db.delete(centre)
    db.commit()
