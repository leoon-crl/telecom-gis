"""Analyses spatiales PostGIS : distance, couverture, recherche spatiale, proximité.

Toutes les requêtes s'appuient sur PostGIS :
- ST_Distance(geography, geography) → distance métrique réelle (WGS84)
- ST_Buffer(geography, rayon)       → zone de couverture théorique
- ST_DWithin(geography, geography, r) → recherche dans un rayon (index GiST)
- ST_Intersects / ST_Within         → sélection par région administrative
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from geoalchemy2 import Geography, Geometry
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.database import get_db
from app.models import Antenne, CentreTechnique, Fibre, Region, Utilisateur

router = APIRouter(prefix="/api/analyses", tags=["Analyses spatiales"])


def _point_geog(lat: float, lon: float):
    return func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326).cast(
        Geography(geometry_type="POINT", srid=4326)
    )


def _geom_geography(col):
    return col.cast(Geography(geometry_type="POINT", srid=4326))


def _fibre_geography(col):
    return col.cast(Geography(geometry_type="LINESTRING", srid=4326))


# ─────────────────────────── CALCUL DE DISTANCE ───────────────────────────
@router.get("/distance", summary="Distance PostGIS entre deux infrastructures (ST_Distance)")
def distance(
    type_a: str = Query("antenne", pattern="^(antenne|centre|fibre)$"),
    id_a: int = Query(..., ge=1),
    type_b: str = Query("antenne", pattern="^(antenne|centre|fibre)$"),
    id_b: int = Query(..., ge=1),
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(get_current_user),
):
    modele = {"antenne": Antenne, "centre": CentreTechnique}
    if type_a not in modele or type_b not in modele:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Le calcul de distance s'applique aux antennes et aux centres techniques (points).",
        )

    obj_a = db.get(modele[type_a], id_a)
    obj_b = db.get(modele[type_b], id_b)
    if obj_a is None or obj_b is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Infrastructure introuvable.")

    distance_m = db.execute(
        text(
            "SELECT ST_Distance(CAST(:pa AS geography), CAST(:pb AS geography)) AS d"
        ),
        {
            "pa": f"POINT({obj_a.longitude} {obj_a.latitude})",
            "pb": f"POINT({obj_b.longitude} {obj_b.latitude})",
        },
    ).scalar()

    distance_km = round((distance_m or 0.0) / 1000.0, 3)
    return {
        "objet_a": {"type": type_a, "id": obj_a.id, "nom": obj_a.nom,
                    "latitude": obj_a.latitude, "longitude": obj_a.longitude},
        "objet_b": {"type": type_b, "id": obj_b.id, "nom": obj_b.nom,
                    "latitude": obj_b.latitude, "longitude": obj_b.longitude},
        "distance_km": distance_km,
        "distance_m": round(distance_m or 0.0, 1),
        "methode": "ST_Distance(geography, geography) — PostGIS, WGS84",
        "ligne": {
            "type": "LineString",
            "coordinates": [
                [obj_a.longitude, obj_a.latitude],
                [obj_b.longitude, obj_b.latitude],
            ],
        },
    }


# ─────────────────────────── ZONE DE COUVERTURE ───────────────────────────
@router.get("/couverture", summary="Zone de couverture théorique d'une antenne (ST_Buffer)")
def couverture(
    antenne_id: int = Query(..., ge=1),
    rayon_km: float = Query(5.0, gt=0, le=50),
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(get_current_user),
):
    antenne = db.get(Antenne, antenne_id)
    if antenne is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Antenne introuvable.")

    # ST_Buffer sur geography → polygone géodésique en WGS84
    geojson = db.execute(
        text(
            "SELECT ST_AsGeoJSON(ST_Buffer("
            "ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, :rayon_m))"
        ),
        {"lon": antenne.longitude, "lat": antenne.latitude, "rayon_m": rayon_km * 1000},
    ).scalar()

    import json

    polygone = json.loads(geojson) if geojson else None

    # Antennes situées dans la zone (ST_DWithin sur geography)
    dans_zone = (
        db.query(
            Antenne.id,
            Antenne.nom,
            Antenne.operateur,
            Antenne.technologie,
            Antenne.statut,
            Antenne.latitude,
            Antenne.longitude,
            func.ST_Distance(
                _geom_geography(Antenne.geom),
                _point_geog(antenne.latitude, antenne.longitude),
            ).label("distance_m"),
        )
        .filter(
            func.ST_DWithin(
                _geom_geography(Antenne.geom),
                _point_geog(antenne.latitude, antenne.longitude),
                rayon_km * 1000,
            )
        )
        .order_by("distance_m")
        .all()
    )

    return {
        "antenne": {"id": antenne.id, "nom": antenne.nom, "operateur": antenne.operateur,
                    "technologie": antenne.technologie, "ville": antenne.ville},
        "rayon_km": rayon_km,
        "polygone": polygone,
        "antennes_dans_zone": [
            {
                "id": a.id,
                "nom": a.nom,
                "operateur": a.operateur,
                "technologie": a.technologie,
                "statut": a.statut,
                "distance_km": round(a.distance_m / 1000.0, 2),
            }
            for a in dans_zone
        ],
        "total_dans_zone": len(dans_zone),
        "precision": (
            "Zone de couverture théorique basée sur un rayon géodésique (ST_Buffer PostGIS). "
            "Il ne s'agit pas d'une simulation radio réelle (atténuation, relief, obstacles non modélisés)."
        ),
    }


# ─────────────────────────── RECHERCHE SPATIALE ───────────────────────────
@router.get("/recherche-spatiale", summary="Recherche d'infrastructures dans un rayon (ST_DWithin)")
def recherche_spatiale(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    rayon_km: float = Query(10.0, gt=0, le=200),
    type_infra: str = Query("antenne", pattern="^(antenne|centre|fibre|tous)$"),
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(get_current_user),
):
    point = _point_geog(lat, lng)
    resultats = []

    if type_infra in ("antenne", "tous"):
        lignes = (
            db.query(
                Antenne.id,
                Antenne.nom,
                Antenne.operateur,
                Antenne.technologie,
                Antenne.statut,
                Antenne.ville,
                Antenne.latitude,
                Antenne.longitude,
                func.ST_Distance(_geom_geography(Antenne.geom), point).label("distance_m"),
            )
            .filter(
                func.ST_DWithin(_geom_geography(Antenne.geom), point, rayon_km * 1000)
            )
            .order_by("distance_m")
            .all()
        )
        resultats.extend(
            {
                "type": "antenne",
                "id": r.id,
                "nom": r.nom,
                "operateur": r.operateur,
                "detail": f"{r.technologie} — {r.statut}",
                "ville": r.ville,
                "latitude": r.latitude,
                "longitude": r.longitude,
                "distance_km": round(r.distance_m / 1000.0, 2),
            }
            for r in lignes
        )

    if type_infra in ("centre", "tous"):
        lignes = (
            db.query(
                CentreTechnique.id,
                CentreTechnique.nom,
                CentreTechnique.operateur,
                CentreTechnique.type,
                CentreTechnique.statut,
                CentreTechnique.ville,
                CentreTechnique.latitude,
                CentreTechnique.longitude,
                func.ST_Distance(_geom_geography(CentreTechnique.geom), point).label("distance_m"),
            )
            .filter(
                func.ST_DWithin(_geom_geography(CentreTechnique.geom), point, rayon_km * 1000)
            )
            .order_by("distance_m")
            .all()
        )
        resultats.extend(
            {
                "type": "centre",
                "id": r.id,
                "nom": r.nom,
                "operateur": r.operateur,
                "detail": f"{r.type} — {r.statut}",
                "ville": r.ville,
                "latitude": r.latitude,
                "longitude": r.longitude,
                "distance_km": round(r.distance_m / 1000.0, 2),
            }
            for r in lignes
        )

    if type_infra in ("fibre", "tous"):
        lignes = (
            db.query(
                Fibre.id,
                Fibre.nom,
                Fibre.operateur,
                Fibre.type,
                Fibre.statut,
                Fibre.origine,
                Fibre.destination,
                Fibre.longueur,
                func.ST_Distance(_fibre_geography(Fibre.geom), point).label("distance_m"),
            )
            .filter(func.ST_DWithin(_fibre_geography(Fibre.geom), point, rayon_km * 1000))
            .order_by("distance_m")
            .all()
        )
        resultats.extend(
            {
                "type": "fibre",
                "id": r.id,
                "nom": r.nom,
                "operateur": r.operateur,
                "detail": f"{r.origine} → {r.destination} ({r.longueur or '?'} km)",
                "ville": None,
                "latitude": None,
                "longitude": None,
                "distance_km": round(r.distance_m / 1000.0, 2),
            }
            for r in lignes
        )

    resultats.sort(key=lambda x: x["distance_km"])

    # Cercle de recherche pour l'affichage cartographique (ST_Buffer géodésique)
    geojson_cercle = db.execute(
        text(
            "SELECT ST_AsGeoJSON(ST_Buffer("
            "ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, :rayon_m))"
        ),
        {"lon": lng, "lat": lat, "rayon_m": rayon_km * 1000},
    ).scalar()
    import json as _json

    cercle = _json.loads(geojson_cercle) if geojson_cercle else None

    return {
        "point": {"latitude": lat, "longitude": lng},
        "rayon_km": rayon_km,
        "type_infra": type_infra,
        "total": len(resultats),
        "resultats": resultats,
        "cercle": cercle,
    }


@router.get("/par-region", summary="Infrastructures d'une région (ST_Contains / ST_Intersects)")
def par_region(
    region_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(get_current_user),
):
    """Sélectionne les infrastructures contenues dans le polygone de la région via ST_Within."""
    region = db.get(Region, region_id)
    if region is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Région introuvable.")

    nb_antennes = (
        db.query(func.count(Antenne.id))
        .filter(
            func.ST_Within(Antenne.geom, _geom_region(db, region.id))
        )
        .scalar()
    )
    nb_centres = (
        db.query(func.count(CentreTechnique.id))
        .filter(
            func.ST_Within(CentreTechnique.geom, _geom_region(db, region.id))
        )
        .scalar()
    )
    nb_fibres = (
        db.query(func.count(Fibre.id))
        .filter(
            func.ST_Intersects(Fibre.geom, _geom_region(db, region.id))
        )
        .scalar()
    )
    return {
        "region": {"id": region.id, "nom": region.nom, "code": region.code},
        "nb_antennes": nb_antennes,
        "nb_centres": nb_centres,
        "nb_fibres": nb_fibres,
        "fonction": "ST_Within (points) et ST_Intersects (lignes) — PostGIS",
    }


def _geom_region(db: Session, region_id: int):
    """Expression SQL de la géométrie d'une région (WGS84, ST_Within/ST_Intersects sur geometry)."""
    return text(f"(SELECT geom FROM regions WHERE id = {int(region_id)})")


# ─────────────────────────── ANALYSE DE PROXIMITÉ ───────────────────────────
@router.get("/proximite", summary="Analyse de proximité entre infrastructures (PostGIS)")
def proximite(
    seuil_km: float = Query(2.0, gt=0, le=50, description="Seuil « trop proches » en km"),
    isolement_km: float = Query(50.0, gt=0, le=300, description="Seuil « isolées » en km"),
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(get_current_user),
):
    # 1) Paires d'antennes trop proches (< seuil) — auto-jointure ST_DWithin
    sql_paires = text(
        """
        SELECT a.id AS a_id, a.nom AS a_nom, a.operateur AS a_operateur, a.ville AS a_ville,
               ST_X(a.geom) AS a_lon, ST_Y(a.geom) AS a_lat,
               b.id AS b_id, b.nom AS b_nom, b.operateur AS b_operateur, b.ville AS b_ville,
               ST_X(b.geom) AS b_lon, ST_Y(b.geom) AS b_lat,
               ST_Distance(a.geom::geography, b.geom::geography) / 1000.0 AS distance_km
        FROM antennes a
        JOIN antennes b
          ON a.id < b.id
         AND ST_DWithin(a.geom::geography, b.geom::geography, :seuil_m)
        ORDER BY distance_km ASC
        LIMIT 40
        """
    )
    paires_proches = [
        {
            "a": {"id": r.a_id, "nom": r.a_nom, "operateur": r.a_operateur, "ville": r.a_ville,
                  "longitude": r.a_lon, "latitude": r.a_lat},
            "b": {"id": r.b_id, "nom": r.b_nom, "operateur": r.b_operateur, "ville": r.b_ville,
                  "longitude": r.b_lon, "latitude": r.b_lat},
            "distance_km": round(r.distance_km, 3),
        }
        for r in db.execute(sql_paires, {"seuil_m": seuil_km * 1000})
    ]

    # 2) Antennes isolées (distance minimale à toute autre antenne > isolement_km)
    sql_isolees = text(
        """
        WITH distances AS (
            SELECT a.id, a.nom, a.operateur, a.ville, a.region,
                   ST_X(a.geom) AS lon, ST_Y(a.geom) AS lat,
                   MIN(ST_Distance(a.geom::geography, b.geom::geography)) AS dmin_m
            FROM antennes a
            JOIN antennes b ON a.id <> b.id
            GROUP BY a.id, a.nom, a.operateur, a.ville, a.region, a.geom
        )
        SELECT * FROM distances WHERE dmin_m > :isolement_m
        ORDER BY dmin_m DESC
        """
    )
    isolees = [
        {
            "id": r.id,
            "nom": r.nom,
            "operateur": r.operateur,
            "ville": r.ville,
            "region": r.region,
            "longitude": r.lon,
            "latitude": r.lat,
            "distance_min_km": round(r.dmin_m / 1000.0, 1),
        }
        for r in db.execute(sql_isolees, {"isolement_m": isolement_km * 1000})
    ]

    # 3) Antenne la plus proche pour chaque centre technique (ST_Distance)
    sql_centres = text(
        """
        SELECT c.id AS c_id, c.nom AS c_nom, c.ville AS c_ville,
               ST_X(c.geom) AS c_lon, ST_Y(c.geom) AS c_lat,
               a.id AS a_id, a.nom AS a_nom, a.operateur AS a_operateur,
               ST_Distance(c.geom::geography, a.geom::geography) / 1000.0 AS distance_km
        FROM centres_techniques c
        CROSS JOIN LATERAL (
            SELECT id, nom, operateur, geom
            FROM antennes
            WHERE statut = 'ACTIF'
            ORDER BY geom <-> c.geom
            LIMIT 1
        ) a
        ORDER BY distance_km ASC
        LIMIT 30
        """
    )
    centres_associes = [
        {
            "centre": {"id": r.c_id, "nom": r.c_nom, "ville": r.c_ville,
                       "longitude": r.c_lon, "latitude": r.c_lat},
            "antenne_proche": {"id": r.a_id, "nom": r.a_nom, "operateur": r.a_operateur},
            "distance_km": round(r.distance_km, 2),
        }
        for r in db.execute(sql_centres)
    ]

    return {
        "seuil_trop_proches_km": seuil_km,
        "seuil_isolement_km": isolement_km,
        "paires_trop_proches": paires_proches,
        "nb_paires_trop_proches": len(paires_proches),
        "antennes_isolees": isolees,
        "nb_antennes_isolees": len(isolees),
        "centres_associes": centres_associes,
        "methodes": "ST_DWithin (auto-jointure), MIN(ST_Distance), KNN geom <-> geom — PostGIS",
    }
