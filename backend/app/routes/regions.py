"""Routes des régions administratives (limites pour la carte + filtres)."""
import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.database import get_db
from app.models import Region, Utilisateur
from sqlalchemy import func

router = APIRouter(prefix="/api/regions", tags=["Régions"])


@router.get("", summary="Liste des régions (limites GeoJSON MultiPolygon)")
def liste(
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(get_current_user),
):
    lignes = db.query(
        Region.id,
        Region.nom,
        Region.code,
        Region.chef_lieu,
        func.ST_AsGeoJSON(Region.geom).label("geojson"),
    ).order_by(Region.nom).all()

    features = []
    for r in lignes:
        geometry = json.loads(r.geojson) if r.geojson else None
        features.append(
            {
                "type": "Feature",
                "geometry": geometry,
                "properties": {
                    "id": r.id,
                    "nom": r.nom,
                    "code": r.code,
                    "chef_lieu": r.chef_lieu,
                },
            }
        )
    return {"type": "FeatureCollection", "features": features}


@router.get("/noms", summary="Noms des régions (pour les filtres et formulaires)")
def noms(db: Session = Depends(get_db), _: Utilisateur = Depends(get_current_user)):
    regions = db.query(Region.nom).order_by(Region.nom).all()
    return [r[0] for r in regions]
