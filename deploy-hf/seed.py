#!/usr/bin/env python3
"""Génération du jeu de données de DÉMONSTRATION pour ART TELECOM GIS.

⚠️ Données simulées : les infrastructures ci-dessous sont fictives et ne
représentent pas les données officielles de l'ART Cameroun. Elles servent
uniquement à la démonstration du prototype académique.

Génère : régions (limites simplifiées), 110 antennes, 30 centres techniques,
~45 tronçons de fibre, 2 comptes utilisateurs, et les fichiers du dossier data/.
"""
import csv
import json
import random
import sys
from datetime import date, timedelta
from pathlib import Path

import bcrypt
from geoalchemy2 import Geometry
from sqlalchemy import create_engine, func, text
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.config import settings  # noqa: E402
from app.models import Antenne, CentreTechnique, Fibre, Region, Utilisateur  # noqa: E402

random.seed(42)

RACINE = Path(__file__).resolve().parent.parent
DOSSIER_DATA = RACINE / "data"
DOSSIER_DATA.mkdir(exist_ok=True)

# ── Villes et coordonnées (Cameroun) ────────────────────────────────────────
VILLES = {
    "Yaoundé":      {"lon": 11.5217, "lat": 3.8667, "region": "Centre", "poids": 20},
    "Douala":       {"lon": 9.7043,  "lat": 4.0483, "region": "Littoral", "poids": 18},
    "Bafoussam":    {"lon": 10.4176, "lat": 5.4781, "region": "Ouest", "poids": 8},
    "Bamenda":      {"lon": 10.3834, "lat": 5.9597, "region": "Nord-Ouest", "poids": 9},
    "Garoua":       {"lon": 13.4012, "lat": 9.3014, "region": "Nord", "poids": 7},
    "Maroua":       {"lon": 14.4503, "lat": 10.5951, "region": "Extrême-Nord", "poids": 7},
    "Ngaoundéré":   {"lon": 13.5828, "lat": 7.3169, "region": "Adamaoua", "poids": 6},
    "Bertoua":      {"lon": 13.6848, "lat": 4.5771, "region": "Est", "poids": 6},
    "Ebolowa":      {"lon": 11.1502, "lat": 2.9000, "region": "Sud", "poids": 5},
    "Limbe":        {"lon": 9.2917,  "lat": 4.0227, "region": "Sud-Ouest", "poids": 6},
    "Kribi":        {"lon": 9.9083,  "lat": 2.9386, "region": "Sud", "poids": 3},
    "Edéa":         {"lon": 10.0994, "lat": 3.8003, "region": "Littoral", "poids": 3},
    "Buea":         {"lon": 9.2410,  "lat": 4.1527, "region": "Sud-Ouest", "poids": 3},
    "Nkongsamba":   {"lon": 9.9454,  "lat": 4.9547, "region": "Littoral", "poids": 3},
    "Dschang":      {"lon": 10.0533, "lat": 5.4463, "region": "Ouest", "poids": 2},
    "Foumban":      {"lon": 10.9000, "lat": 5.7167, "region": "Ouest", "poids": 2},
    "Kumba":        {"lon": 9.4500,  "lat": 4.6400, "region": "Sud-Ouest", "poids": 3},
    "Mamfe":        {"lon": 9.3100,  "lat": 5.7500, "region": "Sud-Ouest", "poids": 2},
    "Yagoua":       {"lon": 15.2300, "lat": 10.3400, "region": "Extrême-Nord", "poids": 2},
    "Mokolo":       {"lon": 13.8000, "lat": 10.7400, "region": "Extrême-Nord", "poids": 2},
    "Guider":       {"lon": 13.9400, "lat": 9.8700, "region": "Nord", "poids": 2},
    "Tcholliré":    {"lon": 14.1700, "lat": 8.4000, "region": "Nord", "poids": 2},
    "Meiganga":     {"lon": 14.1600, "lat": 6.5200, "region": "Adamaoua", "poids": 2},
    "Bélabo":       {"lon": 13.7700, "lat": 4.9300, "region": "Est", "poids": 2},
    "Batouri":      {"lon": 14.3700, "lat": 4.4400, "region": "Est", "poids": 2},
    "Sangmélima":   {"lon": 11.9800, "lat": 2.9300, "region": "Sud", "poids": 2},
    "Ambam":        {"lon": 11.3700, "lat": 2.3700, "region": "Sud", "poids": 2},
    "Kousséri":     {"lon": 15.0300, "lat": 12.0700, "region": "Extrême-Nord", "poids": 1},
    "Kaélé":        {"lon": 15.1000, "lat": 10.1000, "region": "Extrême-Nord", "poids": 1},
    "Banyo":        {"lon": 11.8100, "lat": 6.7800, "region": "Adamaoua", "poids": 1},
}

# ── Limites régionales SIMPLIFIÉES (démonstration — contours approximatifs) ─
LIMITES_REGIONS = {
    "Extrême-Nord": ([[12.75, 11.90], [14.10, 12.55], [15.10, 12.10], [15.25, 10.60],
                      [14.60, 9.95], [13.90, 10.05], [13.00, 10.25], [12.80, 11.00]], "Maroua"),
    "Nord":         ([[12.85, 10.30], [13.90, 10.10], [14.60, 10.00], [15.10, 9.90],
                      [15.00, 8.10], [14.00, 7.95], [12.95, 8.30]], "Garoua"),
    "Adamaoua":     ([[12.30, 8.35], [13.95, 7.98], [15.00, 8.05], [14.85, 6.35],
                      [13.60, 5.90], [12.55, 6.30], [12.10, 7.20]], "Ngaoundéré"),
    "Est":          ([[13.55, 6.00], [14.85, 6.10], [16.10, 5.10], [16.00, 3.10],
                      [15.00, 2.60], [14.00, 3.00], [13.60, 3.90], [13.10, 4.90]], "Bertoua"),
    "Centre":       ([[10.75, 5.30], [12.10, 5.50], [12.90, 4.85], [12.85, 3.90],
                      [12.40, 3.00], [11.30, 2.90], [10.90, 3.60], [10.55, 4.40]], "Yaoundé"),
    "Sud":          ([[9.95, 2.55], [10.90, 2.85], [12.35, 2.95], [12.95, 2.45],
                      [12.40, 1.95], [11.30, 1.65], [10.45, 1.90], [9.85, 2.20]], "Ebolowa"),
    "Littoral":     ([[9.35, 5.05], [10.30, 5.15], [10.75, 4.65], [10.85, 3.70],
                      [10.10, 3.35], [9.55, 3.45], [9.30, 4.10]], "Douala"),
    "Ouest":        ([[9.90, 6.15], [10.85, 6.20], [11.15, 5.55], [10.90, 4.95],
                      [10.15, 4.95], [9.85, 5.50]], "Bafoussam"),
    "Nord-Ouest":   ([[9.70, 6.70], [10.90, 6.70], [11.05, 6.00], [10.60, 5.75],
                      [9.95, 5.95], [9.60, 6.30]], "Bamenda"),
    "Sud-Ouest":    ([[8.65, 5.40], [9.65, 5.55], [9.90, 5.10], [9.75, 4.55],
                      [9.45, 4.25], [8.95, 4.35], [8.60, 4.85]], "Buea"),
}

OPERATEURS = ["CAMTEL", "MTN Cameroun", "Orange Cameroun", "Nexttel (Viettel)"]
ABBREV_OPERATEURS = {"CAMTEL": "CMT", "MTN Cameroun": "MTN",
                     "Orange Cameroun": "ORC", "Nexttel (Viettel)": "NXT"}
TECHNOLOGIES = ["2G", "2G", "3G", "3G", "4G", "4G", "4G", "4G", "5G", "5G"]
STATUTS = ["ACTIF"] * 16 + ["MAINTENANCE", "PROJET", "PROJET", "HORS_SERVICE"]
TYPES_ANTENNES = ["MACRO_CELL", "MACRO_CELL", "MACRO_CELL", "MICRO_CELL", "ROOFTOP", "PICO_CELL"]
TYPES_CENTRES = ["NŒUD DE COMMUTATION", "DATA CENTER", "CENTRE DE RATACHEMENT", "STATION DE BASE"]
CAPACITES_FIBRE = ["24 fibres", "48 fibres", "96 fibres", "144 fibres", "288 fibres"]
CAPACITES_CENTRE = ["5 000 abonnés", "12 000 abonnés", "25 000 abonnés", "40 Gbps", "100 Gbps", "NGN — 40 Gbps"]


def date_aleatoire() -> date:
    debut = date(2015, 1, 1)
    return debut + timedelta(days=random.randint(0, 4000))


def jitter(base: float, amplitude: float = 0.045) -> float:
    return round(base + random.uniform(-amplitude, amplitude), 6)


def creer_utilisateurs(db):
    def hash_pwd(mot: str) -> str:
        return bcrypt.hashpw(mot.encode(), bcrypt.gensalt()).decode()

    db.add_all(
        [
            Utilisateur(
                nom="Administrateur ART",
                email="admin@art.cm",
                password_hash=hash_pwd("Admin@2026"),
                role="ADMIN",
                actif=True,
            ),
            Utilisateur(
                nom="Agent SIG ART",
                email="agent@art.cm",
                password_hash=hash_pwd("Agent@2026"),
                role="AGENT",
                actif=True,
            ),
        ]
    )
    print("  ✔ 2 comptes utilisateurs (admin@art.cm / agent@art.cm)")


def creer_regions(db):
    codes = {
        "Extrême-Nord": "EXN", "Nord": "NRD", "Adamaoua": "ADM", "Est": "EST",
        "Centre": "CTR", "Sud": "SUD", "Littoral": "LIT", "Ouest": "OUE",
        "Nord-Ouest": "NDO", "Sud-Ouest": "SDO",
    }
    regions = []
    for nom, (anneau, chef_lieu) in LIMITES_REGIONS.items():
        anneau_ferme = anneau + [anneau[0]]
        polygone = "MULTIPOLYGON(((" + ", ".join(f"{p[0]} {p[1]}" for p in anneau_ferme) + ")))"
        regions.append(
            Region(nom=nom, code=codes[nom], chef_lieu=chef_lieu,
                   geom=func.ST_SetSRID(func.ST_GeomFromText(polygone), 4326))
        )
    db.add_all(regions)
    print(f"  ✔ {len(regions)} régions administratives (limites simplifiées)")


def creer_antennes(db) -> list[dict]:
    antennes = []
    compteur = 0
    for nom_ville, info in VILLES.items():
        nb = info["poids"]
        for _ in range(nb):
            compteur += 1
            operateur = random.choice(OPERATEURS)
            tech = random.choice(TECHNOLOGIES)
            lat, lng = jitter(info["lat"]), jitter(info["lon"])
            d_install = date_aleatoire()
            quartiers = ["Centre-ville", "Quartier admin.", "Zone industrielle",
                         "Marché central", "Campus", "Aéroport", "Gare routière", "Périphérie"]
            antenne = {
                "nom": f"Site {nom_ville} {random.choice(quartiers)} {compteur:03d}",
                "code": f"ANT-{ABBREV_OPERATEURS[operateur]}-{compteur:04d}",
                "operateur": operateur,
                "type": random.choice(TYPES_ANTENNES),
                "technologie": tech,
                "statut": random.choice(STATUTS),
                "hauteur": round(random.uniform(15, 60), 1),
                "puissance": round(random.uniform(20, 80), 1),
                "date_installation": d_install.isoformat(),
                "adresse": f"Rue {random.randint(1, 60):02d}, Quartier {random.choice(quartiers)}",
                "ville": nom_ville,
                "region": info["region"],
                "latitude": lat,
                "longitude": lng,
            }
            antennes.append(antenne)
    return antennes


def creer_centres(db) -> list[dict]:
    centres = []
    compteur = 0
    villes_prioritaires = ["Douala", "Yaoundé", "Bafoussam", "Bamenda", "Garoua",
                           "Maroua", "Ngaoundéré", "Bertoua", "Ebolowa", "Limbe"]
    villes_secondaires = [v for v in VILLES if v not in villes_prioritaires]

    for nom_ville in villes_prioritaires + villes_secondaires:
        nb = 2 if nom_ville in villes_prioritaires[:4] else (1 if nom_ville in villes_prioritaires else random.choice([0, 1]))
        for _ in range(nb):
            compteur += 1
            info = VILLES[nom_ville]
            operateur = random.choice(OPERATEURS)
            centres.append(
                {
                    "nom": f"Centre technique {ABBREV_OPERATEURS[operateur]} {nom_ville} {compteur:02d}",
                    "code": f"CT-{ABBREV_OPERATEURS[operateur]}-{compteur:03d}",
                    "operateur": operateur,
                    "type": random.choice(TYPES_CENTRES),
                    "statut": random.choice(STATUTS),
                    "adresse": f"Avenue de la Réunification, N°{random.randint(1, 99)}",
                    "ville": nom_ville,
                    "region": info["region"],
                    "capacite": random.choice(CAPACITES_CENTRE),
                    "latitude": jitter(info["lat"], 0.02),
                    "longitude": jitter(info["lon"], 0.02),
                }
            )
    while compteur < 30:  # garantir au moins 30 centres
        compteur += 1
        nom_ville = random.choice(list(VILLES.keys()))
        info = VILLES[nom_ville]
        operateur = random.choice(OPERATEURS)
        centres.append(
            {
                "nom": f"Centre technique {ABBREV_OPERATEURS[operateur]} {nom_ville} {compteur:02d}",
                "code": f"CT-{ABBREV_OPERATEURS[operateur]}-{compteur:03d}",
                "operateur": operateur,
                "type": random.choice(TYPES_CENTRES),
                "statut": random.choice(STATUTS),
                "adresse": f"Boulevard {random.choice(['du 20 Mai', 'de la Liberté', 'Ahmadou Ahidjo'])}, N°{random.randint(1, 99)}",
                "ville": nom_ville,
                "region": info["region"],
                "capacite": random.choice(CAPACITES_CENTRE),
                "latitude": jitter(info["lat"], 0.02),
                "longitude": jitter(info["lon"], 0.02),
            }
        )
    return centres[:35]


def tracer_fibre(origine: str, destination: str, nb_points: int = 5) -> list[list[float]]:
    """Trace un polyligne avec légère déviation (backbone simulé)."""
    a, b = VILLES[origine], VILLES[destination]
    points = []
    for i in range(nb_points):
        t = i / (nb_points - 1)
        lon = a["lon"] + (b["lon"] - a["lon"]) * t + random.uniform(-0.12, 0.12)
        lat = a["lat"] + (b["lat"] - a["lat"]) * t + random.uniform(-0.12, 0.12)
        points.append([round(lon, 5), round(lat, 5)])
    points[0] = [a["lon"], a["lat"]]
    points[-1] = [b["lon"], b["lat"]]
    return points


def creer_fibres(db) -> list[dict]:
    axes = [
        ("Douala", "Yaoundé"), ("Douala", "Limbe"), ("Douala", "Edéa"), ("Edéa", "Yaoundé"),
        ("Yaoundé", "Bafoussam"), ("Bafoussam", "Bamenda"), ("Yaoundé", "Ebolowa"),
        ("Yaoundé", "Sangmélima"), ("Ebolowa", "Ambam"), ("Kribi", "Edéa"),
        ("Bamenda", "Mamfe"), ("Kumba", "Douala"), ("Kumba", "Limbe"),
        ("Bafoussam", "Dschang"), ("Bafoussam", "Foumban"), ("Foumban", "Banyo"),
        ("Yaoundé", "Bélabo"), ("Bélabo", "Bertoua"), ("Bertoua", "Batouri"),
        ("Bélabo", "Abong-Mbang" if "Abong-Mbang" in VILLES else "Bertoua"),
        ("Ngaoundéré", "Banyo"), ("Ngaoundéré", "Meiganga"), ("Ngaoundéré", "Garoua"),
        ("Garoua", "Tcholliré"), ("Garoua", "Guider"), ("Guider", "Maroua"),
        ("Maroua", "Mokolo"), ("Maroua", "Yagoua"), ("Yagoua", "Kousséri"),
        ("Maroua", "Kaélé"), ("Ngaoundéré", "Tcholliré"), ("Yaoundé", "Nkongsamba"),
        ("Nkongsamba", "Bafang" if "Bafang" in VILLES else "Dschang"),
        ("Bamenda", "Bafoussam"), ("Buea", "Limbe"), ("Douala", "Kribi"),
    ]
    fibres = []
    for i, (origine, destination) in enumerate(axes, start=1):
        operateur = random.choice(OPERATEURS)
        coordonnees = tracer_fibre(origine, destination, random.choice([3, 4, 5, 6]))
        fibres.append(
            {
                "nom": f"Backbone {origine} – {destination}",
                "code": f"FIB-{ABBREV_OPERATEURS[operateur]}-{i:03d}",
                "operateur": operateur,
                "type": random.choice(["SOUTERRAIN", "SOUTERRAIN", "AERIEN", "MIXTE"]),
                "capacite": random.choice(CAPACITES_FIBRE),
                "statut": random.choice(["ACTIF"] * 12 + ["MAINTENANCE", "PROJET", "HORS_SERVICE"]),
                "date_installation": date_aleatoire().isoformat(),
                "origine": origine,
                "destination": destination,
                "coordonnees": coordonnees,
            }
        )
    return fibres


def exporter_fichiers(antennes, centres, fibres):
    """Génère les fichiers data/ (échantillons d'import et de démonstration)."""
    # antennes.csv
    with open(DOSSIER_DATA / "antennes.csv", "w", newline="", encoding="utf-8") as f:
        ecrivain = csv.writer(f, delimiter=";")
        ecrivain.writerow(
            ["nom", "code", "operateur", "type", "technologie", "statut", "hauteur",
             "puissance", "date_installation", "adresse", "ville", "region", "latitude", "longitude"]
        )
        for a in antennes[:40]:  # échantillon de 40 lignes pour tester l'import
            ecrivain.writerow(
                [a["nom"], a["code"], a["operateur"], a["type"], a["technologie"],
                 a["statut"], a["hauteur"], a["puissance"], a["date_installation"],
                 a["adresse"], a["ville"], a["region"], a["latitude"], a["longitude"]]
            )

    # centres.geojson
    features = [
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [c["longitude"], c["latitude"]]},
            "properties": {
                "nom": c["nom"], "code": c["code"], "operateur": c["operateur"],
                "type": c["type"], "statut": c["statut"], "ville": c["ville"],
                "region": c["region"], "capacite": c["capacite"],
            },
        }
        for c in centres
    ]
    (DOSSIER_DATA / "centres.geojson").write_text(
        json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    # fibres.geojson
    features = [
        {
            "type": "Feature",
            "geometry": {"type": "LineString", "coordinates": f["coordonnees"]},
            "properties": {
                "nom": f["nom"], "code": f["code"], "operateur": f["operateur"],
                "type": f["type"], "capacite": f["capacite"], "statut": f["statut"],
                "origine": f["origine"], "destination": f["destination"],
                "date_installation": f["date_installation"],
            },
        }
        for f in fibres
    ]
    (DOSSIER_DATA / "fibres.geojson").write_text(
        json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    # limites.geojson
    features = []
    for nom, (anneau, chef_lieu) in LIMITES_REGIONS.items():
        anneau_ferme = anneau + [anneau[0]]
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Polygon", "coordinates": [anneau_ferme]},
                "properties": {"nom": nom, "chef_lieu": chef_lieu,
                               "precision": "Limites simplifiées — données de démonstration"},
            }
        )
    (DOSSIER_DATA / "limites.geojson").write_text(
        json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"  ✔ Fichiers générés dans data/ : antennes.csv, centres.geojson, fibres.geojson, limites.geojson")


def semer_si_vide(forcer: bool | None = None) -> bool:
    """Initialise la base : crée les tables puis génère les données de
    démonstration UNIQUEMENT si aucune antenne n'existe encore.

    Sécurité production (Render) : un redéploiement ne réinitialise jamais les
    données existantes. Forcer la régénération avec SEED_FORCE=1.
    Retourne True si les données ont été générées.
    """
    import os

    if forcer is None:
        forcer = os.environ.get("SEED_FORCE", "") == "1"

    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        # Création des tables si nécessaire (complète database/init.sql)
        from app.database import Base
        import app.models  # noqa: F401

        Base.metadata.create_all(bind=engine)

        existant = db.query(func.count(Antenne.id)).scalar()
        if existant and not forcer:
            print(f"ℹ️  Base déjà initialisée ({existant} antennes) — "
                  "génération des données de démonstration ignorée.")
            return False

        print("⏳ Génération des données de DÉMONSTRATION (simulées, non officielles)…")
        _generer_donnees(db)
        return True
    finally:
        db.close()


def _generer_donnees(db):
    """Réinitialise puis régénère l'intégralité du jeu de démonstration."""
    # Nettoyage (ré-exécution idempotente)
    db.query(Antenne).delete()
    db.query(Fibre).delete()
    db.query(CentreTechnique).delete()
    db.query(Region).delete()
    db.query(Utilisateur).delete()
    db.execute(text("TRUNCATE TABLE journal_actions RESTART IDENTITY")) if db.execute(
        text("SELECT to_regclass('public.journal_actions') IS NOT NULL")
    ).scalar() else None
    db.commit()

    creer_utilisateurs(db)
    creer_regions(db)
    db.commit()

    donnees_antennes = creer_antennes(db)
    donnees_centres = creer_centres(db)
    donnees_fibres = creer_fibres(db)

    for a in donnees_antennes:
        db.add(
            Antenne(
                **a,
                geom=func.ST_SetSRID(func.ST_MakePoint(a["longitude"], a["latitude"]), 4326),
            )
        )
    for c in donnees_centres:
        db.add(
            CentreTechnique(
                **c,
                geom=func.ST_SetSRID(func.ST_MakePoint(c["longitude"], c["latitude"]), 4326),
            )
        )
    for f in donnees_fibres:
        points = ", ".join(f"{p[0]} {p[1]}" for p in f["coordonnees"])
        wkt = f"LINESTRING({points})"
        db.add(
            Fibre(
                nom=f["nom"], code=f["code"], operateur=f["operateur"], type=f["type"],
                capacite=f["capacite"], statut=f["statut"],
                date_installation=date.fromisoformat(f["date_installation"]),
                origine=f["origine"], destination=f["destination"],
                geom=func.ST_SetSRID(func.ST_GeomFromText(wkt), 4326),
            )
        )
    db.commit()

    # Longueurs réelles calculées par PostGIS (geography → mètres)
    db.execute(
        text("UPDATE fibres SET longueur = ROUND((ST_Length(geom::geography) / 1000.0)::numeric, 2)")
    )
    db.commit()

    print(f"  ✔ {len(donnees_antennes)} antennes relais (2G/3G/4G/5G)")
    print(f"  ✔ {len(donnees_centres)} centres techniques")
    print(f"  ✔ {len(donnees_fibres)} tronçons de fibre (longueurs calculées par ST_Length)")

    try:
        exporter_fichiers(donnees_antennes, donnees_centres, donnees_fibres)
    except OSError as exc:
        print(f"⚠️  Export des fichiers data/ ignoré ({exc.__class__.__name__}).")

    total = db.query(func.count(Antenne.id)).scalar()
    total_centres = db.query(func.count(CentreTechnique.id)).scalar()
    total_fibres = db.query(func.count(Fibre.id)).scalar()
    longueur = db.query(func.sum(Fibre.longueur)).scalar()
    print(f"\n✅ Base « telecom_gis » : {total} antennes, {total_centres} centres, "
          f"{total_fibres} fibres — {round(longueur or 0):,} km de fibre (PostGIS).")
    print("ℹ️  Identifiants de démonstration : admin@art.cm / Admin@2026 — agent@art.cm / Agent@2026")


def main():
    """CLI : initialise la base si elle est vide (SEED_FORCE=1 pour réinitialiser)."""
    semer_si_vide()


if __name__ == "__main__":
    main()
