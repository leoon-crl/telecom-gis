"""Exportation des données filtrées en CSV et GeoJSON."""
import csv
import io
import json

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.database import get_db
from app.models import Antenne, CentreTechnique, Fibre, Utilisateur

router = APIRouter(prefix="/api/export", tags=["Exportation"])


def _csv_response(en_tetes: list[str], lignes: list[list], nom_fichier: str) -> StreamingResponse:
    tampon = io.StringIO()
    ecrivain = csv.writer(tampon, delimiter=";", quoting=csv.QUOTE_MINIMAL)
    ecrivain.writerow(en_tetes)
    ecrivain.writerows(lignes)
    tampon.seek(0)
    return StreamingResponse(
        iter([tampon.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{nom_fichier}"'},
    )


@router.get("/antennes", summary="Exporter les antennes (CSV ou GeoJSON)")
def export_antennes(
    format: str = Query("csv", pattern="^(csv|geojson)$"),
    operateur: str = "",
    technologie: str = "",
    statut: str = "",
    region: str = "",
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(get_current_user),
):
    query = db.query(Antenne)
    if operateur:
        query = query.filter(Antenne.operateur == operateur)
    if technologie:
        query = query.filter(Antenne.technologie == technologie)
    if statut:
        query = query.filter(Antenne.statut == statut)
    if region:
        query = query.filter(Antenne.region == region)
    antennes = query.order_by(Antenne.nom).all()

    if format == "csv":
        lignes = [
            [
                a.id, a.nom, a.code, a.operateur, a.type, a.technologie, a.statut,
                a.hauteur or "", a.puissance or "",
                a.date_installation.isoformat() if a.date_installation else "",
                a.adresse or "", a.ville, a.region,
                f"{a.latitude:.6f}", f"{a.longitude:.6f}",
            ]
            for a in antennes
        ]
        en_tetes = ["id", "nom", "code", "operateur", "type", "technologie", "statut",
                    "hauteur_m", "puissance_w", "date_installation", "adresse", "ville",
                    "region", "latitude", "longitude"]
        return _csv_response(en_tetes, lignes, "antennes_art.csv")

    features = [
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [a.longitude, a.latitude]},
            "properties": {
                "id": a.id, "nom": a.nom, "code": a.code, "operateur": a.operateur,
                "type": a.type, "technologie": a.technologie, "statut": a.statut,
                "hauteur_m": a.hauteur, "puissance_w": a.puissance,
                "date_installation": a.date_installation.isoformat() if a.date_installation else None,
                "adresse": a.adresse, "ville": a.ville, "region": a.region,
            },
        }
        for a in antennes
    ]
    return StreamingResponse(
        iter([json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False, indent=2)]),
        media_type="application/geo+json; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="antennes_art.geojson"'},
    )


@router.get("/centres", summary="Exporter les centres techniques (CSV ou GeoJSON)")
def export_centres(
    format: str = Query("csv", pattern="^(csv|geojson)$"),
    operateur: str = "",
    statut: str = "",
    region: str = "",
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(get_current_user),
):
    query = db.query(CentreTechnique)
    if operateur:
        query = query.filter(CentreTechnique.operateur == operateur)
    if statut:
        query = query.filter(CentreTechnique.statut == statut)
    if region:
        query = query.filter(CentreTechnique.region == region)
    centres = query.order_by(CentreTechnique.nom).all()

    if format == "csv":
        lignes = [
            [
                c.id, c.nom, c.code, c.operateur, c.type, c.statut,
                c.adresse or "", c.ville, c.region, c.capacite or "",
                f"{c.latitude:.6f}", f"{c.longitude:.6f}",
            ]
            for c in centres
        ]
        en_tetes = ["id", "nom", "code", "operateur", "type", "statut",
                    "adresse", "ville", "region", "capacite", "latitude", "longitude"]
        return _csv_response(en_tetes, lignes, "centres_techniques_art.csv")

    features = [
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [c.longitude, c.latitude]},
            "properties": {
                "id": c.id, "nom": c.nom, "code": c.code, "operateur": c.operateur,
                "type": c.type, "statut": c.statut, "adresse": c.adresse,
                "ville": c.ville, "region": c.region, "capacite": c.capacite,
            },
        }
        for c in centres
    ]
    return StreamingResponse(
        iter([json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False, indent=2)]),
        media_type="application/geo+json; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="centres_techniques_art.geojson"'},
    )


@router.get("/fibres", summary="Exporter les tronçons de fibre (CSV ou GeoJSON)")
def export_fibres(
    format: str = Query("csv", pattern="^(csv|geojson)$"),
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
        Fibre.capacite,
        Fibre.longueur,
        Fibre.statut,
        Fibre.date_installation,
        Fibre.origine,
        Fibre.destination,
        func.ST_AsGeoJSON(Fibre.geom).label("geojson"),
    )
    if operateur:
        query = query.filter(Fibre.operateur == operateur)
    if statut:
        query = query.filter(Fibre.statut == statut)
    fibres = query.order_by(Fibre.nom).all()

    if format == "csv":
        lignes = [
            [
                f.id, f.nom, f.code, f.operateur, f.type, f.capacite or "",
                f.longueur or "", f.statut,
                f.date_installation.isoformat() if f.date_installation else "",
                f.origine, f.destination,
            ]
            for f in fibres
        ]
        en_tetes = ["id", "nom", "code", "operateur", "type", "capacite",
                    "longueur_km", "statut", "date_installation", "origine", "destination"]
        return _csv_response(en_tetes, lignes, "fibres_optiques_art.csv")

    features = []
    for f in fibres:
        if not f.geojson:
            continue
        features.append(
            {
                "type": "Feature",
                "geometry": json.loads(f.geojson),
                "properties": {
                    "id": f.id, "nom": f.nom, "code": f.code, "operateur": f.operateur,
                    "type": f.type, "capacite": f.capacite, "longueur_km": f.longueur,
                    "statut": f.statut,
                    "date_installation": f.date_installation.isoformat() if f.date_installation else None,
                    "origine": f.origine, "destination": f.destination,
                },
            }
        )
    return StreamingResponse(
        iter([json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False, indent=2)]),
        media_type="application/geo+json; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="fibres_optiques_art.geojson"'},
    )
