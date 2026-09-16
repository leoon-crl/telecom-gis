"""Tests d'authentification : login, JWT, contrôle des rôles."""
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def jeton_admin(client):
    r = client.post(
        "/api/auth/login",
        json={"email": "admin@art.cm", "password": "Admin@2026"},
    )
    assert r.status_code == 200
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def jeton_agent(client):
    r = client.post(
        "/api/auth/login",
        json={"email": "agent@art.cm", "password": "Agent@2026"},
    )
    assert r.status_code == 200
    return r.json()["access_token"]


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["statut"] == "ok"


def test_login_valide(client):
    r = client.post(
        "/api/auth/login",
        json={"email": "admin@art.cm", "password": "Admin@2026"},
    )
    assert r.status_code == 200
    corps = r.json()
    assert corps["token_type"] == "bearer"
    assert corps["user"]["role"] == "ADMIN"


def test_login_mot_de_passe_invalide(client):
    r = client.post(
        "/api/auth/login",
        json={"email": "admin@art.cm", "password": "MAUVAIS"},
    )
    assert r.status_code == 401


def test_acces_sans_token_refuse(client):
    r = client.get("/api/antennes")
    assert r.status_code == 401


def test_token_invalide_refuse(client):
    r = client.get("/api/antennes", headers={"Authorization": "Bearer xyz"})
    assert r.status_code == 401


def test_me(client, jeton_admin):
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {jeton_admin}"})
    assert r.status_code == 200
    assert r.json()["email"] == "admin@art.cm"


def test_agent_ne_peut_pas_administrer(client, jeton_agent):
    r = client.get(
        "/api/utilisateurs", headers={"Authorization": f"Bearer {jeton_agent}"}
    )
    assert r.status_code == 403


def test_admin_peut_lister_utilisateurs(client, jeton_admin):
    r = client.get(
        "/api/utilisateurs", headers={"Authorization": f"Bearer {jeton_admin}"}
    )
    assert r.status_code == 200
    assert r.json()["total"] >= 2
