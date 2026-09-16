"""Tests CRUD des antennes (création, lecture, modification, suppression)."""
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


def _antenne_test(nom="Site Test pytest", code="ANT-PYT-0001"):
    return {
        "nom": nom,
        "code": code,
        "operateur": "CAMTEL",
        "type": "MACRO_CELL",
        "technologie": "4G",
        "statut": "ACTIF",
        "hauteur": 40,
        "puissance": 50,
        "date_installation": "2024-05-01",
        "ville": "Yaoundé",
        "region": "Centre",
        "latitude": 3.86,
        "longitude": 11.50,
    }


def test_liste_antennes(client, entetes):
    r = client.get("/api/antennes", headers=entetes)
    assert r.status_code == 200
    corps = r.json()
    assert corps["total"] >= 100
    assert len(corps["items"]) > 0


def test_pagination_et_filtres(client, entetes):
    r = client.get("/api/antennes?page=1&size=10&technologie=5G", headers=entetes)
    assert r.status_code == 200
    corps = r.json()
    assert all(a["technologie"] == "5G" for a in corps["items"])


def test_creation_antenne(client, entetes):
    r = client.post("/api/antennes", json=_antenne_test(), headers=entetes)
    assert r.status_code == 201
    antenne = r.json()
    assert antenne["code"] == "ANT-PYT-0001"
    assert 3.8 < antenne["latitude"] < 3.9

    # Nettoyage
    client.delete(f"/api/antennes/{antenne['id']}", headers=entetes)


def test_creation_code_duplique_refusee(client, entetes):
    client.post("/api/antennes", json=_antenne_test(), headers=entetes)
    r = client.post("/api/antennes", json=_antenne_test(), headers=entetes)
    assert r.status_code == 400
    # Nettoyage
    liste = client.get(
        "/api/antennes?recherche=ANT-PYT-0001", headers=entetes
    ).json()
    for a in liste["items"]:
        client.delete(f"/api/antennes/{a['id']}", headers=entetes)


def test_creation_latitude_invalide(client, entetes):
    donnees = _antenne_test(code="ANT-PYT-0002")
    donnees["latitude"] = 120  # hors limites
    r = client.post("/api/antennes", json=donnees, headers=entetes)
    assert r.status_code == 422


def test_modification_antenne(client, entetes):
    creation = client.post(
        "/api/antennes", json=_antenne_test(code="ANT-PYT-0003"), headers=entetes
    )
    antenne = creation.json()
    r = client.put(
        f"/api/antennes/{antenne['id']}",
        json={"statut": "MAINTENANCE", "hauteur": 55},
        headers=entetes,
    )
    assert r.status_code == 200
    assert r.json()["statut"] == "MAINTENANCE"
    assert r.json()["hauteur"] == 55
    client.delete(f"/api/antennes/{antenne['id']}", headers=entetes)


def test_suppression_antenne(client, entetes):
    creation = client.post(
        "/api/antennes", json=_antenne_test(code="ANT-PYT-0004"), headers=entetes
    )
    antenne = creation.json()
    r = client.delete(f"/api/antennes/{antenne['id']}", headers=entetes)
    assert r.status_code == 204
    assert client.get(f"/api/antennes/{antenne['id']}", headers=entetes).status_code == 404
