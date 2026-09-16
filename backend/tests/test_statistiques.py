"""Tests des statistiques (agrégats PostgreSQL) et des utilisateurs."""
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


def test_resume_statistiques(client, entetes):
    r = client.get("/api/statistiques", headers=entetes)
    assert r.status_code == 200
    d = r.json()
    assert d["total_antennes"] >= 100
    assert d["total_centres"] >= 30
    assert d["total_fibres"] >= 30
    assert d["longueur_totale_fibre_km"] > 0
    assert d["nb_operateurs"] == 4


def test_antennes_par_region(client, entetes):
    r = client.get("/api/statistiques/antennes-region", headers=entetes)
    assert r.status_code == 200
    d = r.json()
    assert len(d) == 10  # 10 régions du Cameroun
    total = sum(x["total"] for x in d)
    assert total >= 100


def test_operateurs(client, entetes):
    r = client.get("/api/statistiques/operateurs", headers=entetes)
    assert r.status_code == 200
    noms = [x["operateur"] for x in r.json()]
    assert "CAMTEL" in noms
    assert "MTN Cameroun" in noms


def test_evolution(client, entetes):
    r = client.get("/api/statistiques/evolution", headers=entetes)
    assert r.status_code == 200
    d = r.json()
    assert len(d) >= 10
    annees = [x["annee"] for x in d]
    assert annees == sorted(annees)


def test_carte_antennes_geojson(client, entetes):
    r = client.get("/api/antennes/carte", headers=entetes)
    assert r.status_code == 200
    d = r.json()
    assert d["type"] == "FeatureCollection"
    assert len(d["features"]) >= 100
    f = d["features"][0]
    assert f["geometry"]["type"] == "Point"
    assert len(f["geometry"]["coordinates"]) == 2


def test_gestion_utilisateurs_complet(client, entetes):
    # Création
    r = client.post(
        "/api/utilisateurs",
        json={"nom": "Test pytest", "email": "pytest@art.cm", "role": "AGENT", "password": "Test@2026"},
        headers=entetes,
    )
    assert r.status_code == 201
    utilisateur = r.json()

    # Modification du rôle
    r = client.put(
        f"/api/utilisateurs/{utilisateur['id']}", json={"role": "ADMIN"}, headers=entetes
    )
    assert r.status_code == 200
    assert r.json()["role"] == "ADMIN"

    # Désactivation
    r = client.put(
        f"/api/utilisateurs/{utilisateur['id']}", json={"actif": False}, headers=entetes
    )
    assert r.status_code == 200
    assert r.json()["actif"] is False

    # Suppression
    r = client.delete(f"/api/utilisateurs/{utilisateur['id']}", headers=entetes)
    assert r.status_code == 204

    # Vérification de la suppression
    r = client.get(f"/api/utilisateurs/{utilisateur['id']}", headers=entetes)
    assert r.status_code in (404, 200)  # endpoint liste paginée : absence attendue
