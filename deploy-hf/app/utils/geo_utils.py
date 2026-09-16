"""Utilitaires géospatiaux : conversion GeoJSON, colonnes geography, helpers PostGIS."""
from geoalchemy2 import Geometry
from geoalchemy2.functions import ST_GeomFromGeoJSON, ST_SetSRID
from shapely.geometry import shape
from sqlalchemy import func, text

from app.models import Antenne, CentreTechnique, Fibre


def expr_geography_point(lat: float, lon: float):
    """Point geography WGS84 à partir de latitude/longitude (pour ST_Distance, ST_DWithin)."""
    return func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326).cast(Geography(geometry_type="POINT", srid=4326))


def expr_geom_point(lat: float, lon: float):
    """Point geometry WGS84."""
    return func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326)


def geom_point_wkt(lat: float, lon: float) -> str:
    """WKT d'un point."""
    return f"POINT({lon} {lat})"


def geom_linestring_wkt(coordonnees: list[list[float]]) -> str:
    """WKT LineString à partir d'une liste [[lon, lat], ...]."""
    points = ", ".join(f"{c[0]} {c[1]}" for c in coordonnees)
    return f"LINESTRING({points})"


def calculer_longueur_km(db, coordonnees: list[list[float]]) -> float:
    """Calcule la longueur d'un tracé en km via PostGIS (geography)."""
    sql = text(
        "SELECT ST_Length(ST_GeogFromText(:wkt, 4326)) / 1000.0 AS km"
    )
    points = ", ".join(f"{c[0]} {c[1]}" for c in coordonnees)
    wkt = f"LINESTRING({points})"
    return round(db.execute(sql, {"wkt": wkt}).scalar() or 0.0, 3)


def depuis_geojson(geojson: dict):
    """Construit une géométrie PostGIS à partir d'un dict GeoJSON (SRID 4326 forcé)."""
    return ST_SetSRID(ST_GeomFromGeoJSON(geojson), 4326)


MODELE_PAR_TYPE = {"antenne": Antenne, "fibre": Fibre, "centre": CentreTechnique}
