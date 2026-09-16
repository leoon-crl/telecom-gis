"""Tests des requêtes spatiales PostGIS : distance, buffer, DWithin, proximité."""
import math

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def entetes(client):
    r = client.post(
        "/api/auth/login",
        json={"email": "admin@art.cm", "password": "Admin@2026"},
    )
    jeton = r.json()["access_token"]
    return {"Authorization": f"Bearer {jeton}"}


def test_distance_postgis(client, entetes):
    """La distance PostGIS (geography) doit correspondre à la formule haversine à ~1 %."""
    r = client.get(
        "/api/analyses/distance?type_a=antenne&id_a=1&type_b=antenne&id_b=2",
        headers=entetes,
    )
    assert r.status_code == 200
    d = r.json()
    assert d["distance_km"] > 0

    # Vérification haversine indépendante
    a, b = d["objet_a"], d["objet_b"]
    lat1, lon1, lat2, lon2 = map(
        math.radians, [a["latitude"], a["longitude"], b["latitude"], b["longitude"]]
    )
    h = 2 * math.asin(
        math.sqrt(
            math.sin((lat2 - lat1) / 2) ** 2
            + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
        )
    )
    haversine_km = 6371.0088 * h
    ecart = abs(haversine_km - d["distance_km"]) / haversine_km
    assert ecart < 0.01, f"Écart PostGIS vs haversine trop grand : {ecart:.4%}"


def test_distance_inexistante_404(client, entetes):
    r = client.get(
        "/api/analyses/distance?type_a=antenne&id_a=999999&type_b=antenne&id_b=2",
        headers=entetes,
    )
    assert r.status_code == 404


def test_couverture_st_buffer(client, entetes):
    r = client.get(
        "/api/analyses/couverture?antenne_id=1&rayon_km=5", headers=entetes
    )
    assert r.status_code == 200
    d = r.json()
    assert d["polygone"]["type"] == "Polygon"
    assert d["rayon_km"] == 5
    assert d["total_dans_zone"] >= 1  # l'antenne elle-même est dans sa zone
    assert "simulation radio" in d["precision"]


def test_recherche_spatiale_st_dwithin(client, entetes):
    """Recherche autour de Yaoundé (3.8667, 11.5217) — rayon 10 km."""
    r = client.get(
        "/api/analyses/recherche-spatiale?lat=3.8667&lng=11.5217&rayon_km=10&type_infra=tous",
        headers=entetes,
    )
    assert r.status_code == 200
    d = r.json()
    assert d["total"] > 0
    assert d["cercle"]["type"] == "Polygon"
    # Les résultats doivent être triés par distance croissante
    distances = [x["distance_km"] for x in d["resultats"]]
    assert distances == sorted(distances)
    # Toutes les distances doivent respecter le rayon
    assert all(x["distance_km"] <= 10 for x in d["resultats"])


def test_proximite(client, entetes):
    r = client.get("/api/analyses/proximite?seuil_km=2&isolement_km=50", headers=entetes)
    assert r.status_code == 200
    d = r.json()
    # Toutes les paires doivent être sous le seuil
    assert all(
        p["distance_km"] <= d["seuil_trop_proches_km"] for p in d["paires_trop_proches"]
    )
    # Toutes les antennes isolées doivent dépasser le seuil d'isolement
    assert all(
        a["distance_min_km"] > d["seuil_isolement_km"] for a in d["antennes_isolees"]
    )
    assert len(d["centres_associes"]) > 0


def test_region_st_within(client, entetes):
    regions = client.get("/api/regions", headers=entetes).json()
    assert len(regions["features"]) == 10
    region_id = regions["features"][0]["properties"]["id"]
    r = client.get(f"/api/analyses/par-region?region_id={region_id}", headers=entetes)
    assert r.status_code == 200
    assert "nb_antennes" in r.json()
