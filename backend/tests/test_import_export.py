"""Tests de l'import CSV / GeoJSON et de l'exportation."""
import io

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


CSV_VALIDE = (
    "nom;latitude;longitude;operateur;technologie;statut;ville;region\n"
    "Import pytest 1;3.90;11.48;Orange Cameroun;5G;ACTIF;Yaoundé;Centre\n"
    "Import pytest 2;4.05;9.72;MTN Cameroun;4G;ACTIF;Douala;Littoral\n"
)


def test_import_csv_apercu(client, entetes):
    fichiers = {"fichier": ("test.csv", io.BytesIO(CSV_VALIDE.encode()), "text/csv")}
    r = client.post(
        "/api/import/csv",
        data={"type_infra": "antennes", "confirmer": "false"},
        files=fichiers,
        headers=entetes,
    )
    assert r.status_code == 200
    d = r.json()
    assert d["total_lignes"] == 2
    assert d["lignes_valides"] == 2
    assert d["nb_erreurs"] == 0
    assert d["inserte"] is False


def test_import_csv_coordonnees_invalides(client, entetes):
    csv_invalide = "nom;latitude;longitude\nMauvais;999;999\n"
    fichiers = {"fichier": ("bad.csv", io.BytesIO(csv_invalide.encode()), "text/csv")}
    r = client.post(
        "/api/import/csv",
        data={"type_infra": "antennes", "confirmer": "false"},
        files=fichiers,
        headers=entetes,
    )
    assert r.status_code == 200
    d = r.json()
    assert d["lignes_valides"] == 0
    assert d["nb_erreurs"] == 2  # latitude ET longitude hors limites


def test_import_csv_confirme(client, entetes):
    fichiers = {"fichier": ("test.csv", io.BytesIO(CSV_VALIDE.encode()), "text/csv")}
    r = client.post(
        "/api/import/csv",
        data={"type_infra": "antennes", "confirmer": "true"},
        files=fichiers,
        headers=entetes,
    )
    assert r.status_code == 200
    d = r.json()
    assert d["inserte"] is True
    assert d["nb_insertions"] == 2

    # Vérifie la présence en base puis nettoie
    liste = client.get(
        "/api/antennes?recherche=Import pytest", headers=entetes
    ).json()
    assert liste["total"] >= 2
    for a in liste["items"]:
        client.delete(f"/api/antennes/{a['id']}", headers=entetes)


def test_import_format_refuse(client, entetes):
    fichiers = {"fichier": ("test.txt", io.BytesIO(b"hello"), "text/plain")}
    r = client.post(
        "/api/import/csv",
        data={"type_infra": "antennes", "confirmer": "false"},
        files=fichiers,
        headers=entetes,
    )
    assert r.status_code == 400


GEOJSON_FIBRE = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [[9.70, 4.04], [10.10, 3.90], [11.52, 3.86]],
            },
            "properties": {
                "nom": "Fibre pytest",
                "code": "FIB-PYT-001",
                "operateur": "CAMTEL",
                "origine": "Douala",
                "destination": "Yaoundé",
                "statut": "ACTIF",
            },
        }
    ],
}


def test_import_geojson_fibre(client, entetes):
    fichiers = {
        "fichier": (
            "fibres.geojson",
            io.BytesIO(__import__("json").dumps(GEOJSON_FIBRE).encode()),
            "application/geo+json",
        )
    }
    r = client.post(
        "/api/import/geojson",
        data={"type_infra": "auto", "confirmer": "false"},
        files=fichiers,
        headers=entetes,
    )
    assert r.status_code == 200
    d = r.json()
    assert d["type_infra"] == "fibres"
    assert d["lignes_valides"] == 1


def test_export_csv(client, entetes):
    r = client.get("/api/export/antennes?format=csv", headers=entetes)
    assert r.status_code == 200
    corps = r.text.strip().splitlines()
    assert len(corps) > 100  # en-tête + antennes
    assert "nom" in corps[0].lower()


def test_export_geojson(client, entetes):
    r = client.get("/api/export/antennes?format=geojson", headers=entetes)
    assert r.status_code == 200
    d = r.json()
    assert d["type"] == "FeatureCollection"
    assert len(d["features"]) > 100
    assert d["features"][0]["geometry"]["type"] == "Point"
