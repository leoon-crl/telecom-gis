# ART TELECOM GIS

> **Plateforme SIG de cartographie et d'analyse des infrastructures de télécommunications**
> Agence de Régulation des Télécommunications (ART) — Cameroun
>
> ![Badge](https://img.shields.io/badge/Statut-Prototype%20académique-FDB913?style=flat-square)
> ![Badge](https://img.shields.io/badge/SIG-PostgreSQL%20%2B%20PostGIS-00843D?style=flat-square)
> ![Badge](https://img.shields.io/badge/API-FastAPI-0B2447?style=flat-square)
> ![Badge](https://img.shields.io/badge/Frontend-React%20%2B%20Leaflet-EF3340?style=flat-square)

---

## Table des matières

1. [Présentation](#1-présentation)
2. [Objectifs](#2-objectifs)
3. [Fonctionnalités](#3-fonctionnalités)
4. [Architecture](#4-architecture)
5. [Technologies](#5-technologies)
6. [Prérequis](#6-prérequis)
7. [Installation](#7-installation)
8. [Configuration](#8-configuration)
9. [Lancement](#9-lancement)
10. [Base de données](#10-base-de-données)
11. [Utilisateurs de démonstration](#11-utilisateurs-de-démonstration)
12. [API](#12-api)
13. [Import des données](#13-import-des-données)
14. [Déploiement](#14-déploiement)
15. [Tests](#15-tests)
16. [Structure du projet](#16-structure-du-projet)
17. [Limites du prototype](#17-limites-du-prototype)
18. [Perspectives d'amélioration](#18-perspectives-damélioration)

---

## 1. Présentation

**ART TELECOM GIS** est une plateforme SIG (Système d'Information Géographique) web développée
dans le cadre d'un projet académique pour l'Agence de Régulation des Télécommunications (ART)
du Cameroun. Elle permet de **cartographier, gérer, consulter et analyser** les infrastructures
de télécommunications déclarées par les opérateurs : **antennes relais**, **réseaux de fibre
optique** et **centres techniques**.

L'application répond à la problématique de l'absence d'outil cartographique unifié : les
infrastructures sont aujourd'hui suivies via des tableurs et rapports d'opérateurs dispersés,
sans vision d'ensemble du territoire.

> ⚠️ **Avertissement** : ce projet est un **prototype académique**. Les données embarquées sont
> des **données de démonstration simulées** et ne représentent en aucun cas des données
> officielles ou confidentielles de l'ART.

## 2. Objectifs

- Modéliser une **base de données spatiale** PostgreSQL + PostGIS adaptée aux infrastructures
  de télécommunications (points, lignes, polygones administratifs) ;
- Fournir une **carte interactive** avec gestion de couches, légende et fiches d'information ;
- Offrir des fonctions de **recherche, filtrage et analyse spatiale** (distances PostGIS,
  zones de couverture théoriques, requêtes de proximité) ;
- Produire des **statistiques et indicateurs** de répartition des infrastructures ;
- Assurer l'**authentification**, la **gestion des rôles** (ADMIN / AGENT) et la
  **journalisation** des actions sensibles ;
- Livrer une documentation technique et une API REST documentée exploitables par l'ART.

## 3. Fonctionnalités

| Module | Fonctionnalités |
|---|---|
| 🔐 **Authentification** | Connexion JWT, mots de passe hachés (bcrypt), contrôle des rôles, déconnexion |
| 📊 **Tableau de bord** | 6 cartes KPI (antennes, centres, km de fibre, opérateurs, actifs, hors service) + 6 graphiques (région, opérateur, technologie, statut, centres/région, évolution annuelle) |
| 🗺️ **Carte SIG** | Leaflet plein écran, 4 couches activables (antennes, fibre, centres, limites), 3 fonds de carte (sombre, OSM, satellite), clustering des marqueurs, popups détaillés, légende |
| 📡 **Antennes** | CRUD complet, recherche, filtres (opérateur, technologie, statut, région, ville), tri, pagination, export CSV/GeoJSON |
| 🔌 **Fibre optique** | CRUD complet avec saisie du tracé (GeoJSON), longueur calculée par `ST_Length`, aperçu du tracé, filtres et export |
| 🏢 **Centres techniques** | CRUD complet, filtres, export CSV/GeoJSON |
| 📐 **Analyses spatiales** | Calcul de distance (`ST_Distance` geography), zone de couverture théorique (`ST_Buffer`), recherche dans un rayon (`ST_DWithin`), analyse de proximité (paires trop proches, antennes isolées, KNN), sélection par région (`ST_Within` / `ST_Intersects`) |
| 📈 **Statistiques** | Tous les agrégats calculés par PostgreSQL (GROUP BY, SUM, COUNT, EXTRACT) — aucun chiffre codé en dur |
| ⬆️ **Importation** | CSV (détection des colonnes et du délimiteur) et GeoJSON, validation des coordonnées et champs, aperçu avant insertion, rapport d'erreurs explicite, journalisation |
| ⬇️ **Exportation** | Export CSV et GeoJSON des antennes, fibres et centres, avec filtres appliqués |
| 👥 **Administration** | Gestion des utilisateurs (création, modification, rôles, activation/désactivation, suppression) réservée aux ADMIN + journal des actions sensibles |
| 👤 **Profil** | Consultation/modification de son profil et changement de mot de passe |

## 4. Architecture

```
┌───────────────────────────────────────────────────────────────┐
│  Navigateur (React + Vite + Tailwind + Leaflet + Recharts)    │
│  Frontend : http://localhost:5173                             │
└──────────────────────────┬────────────────────────────────────┘
                           │ API REST JSON / GeoJSON (JWT Bearer)
┌──────────────────────────▼────────────────────────────────────┐
│  Backend FastAPI (Python) : http://localhost:8000             │
│  · Authentification JWT + rôles   · Validation Pydantic       │
│  · CRUD (SQLAlchemy)              · Analyses spatiales PostGIS│
│  · Import CSV/GeoJSON             · Export CSV/GeoJSON        │
└──────────────────────────┬────────────────────────────────────┘
                           │ SQLAlchemy + GeoAlchemy2 (psycopg2)
┌──────────────────────────▼────────────────────────────────────┐
│  PostgreSQL 16 + PostGIS 3.4 : localhost:5432                 │
│  Tables : antennes, fibres, centres_techniques, regions,      │
│           utilisateurs, journal_actions                       │
│  Index spatiaux GiST sur toutes les géométries                │
└───────────────────────────────────────────────────────────────┘
```

## 5. Technologies

| Couche | Technologies |
|---|---|
| **Frontend** | React 18, Vite 5, JavaScript (JSX), Tailwind CSS 3, Leaflet 1.9 + react-leaflet + react-leaflet-cluster, Recharts, Axios, React Router 6, lucide-react (icônes), react-hot-toast (notifications) |
| **Backend** | Python 3.12, FastAPI, Uvicorn, SQLAlchemy 2, GeoAlchemy2, Pydantic v2, PyJWT, bcrypt |
| **Base de données** | PostgreSQL 16, PostGIS 3.4, index GiST, EPSG:4326 (WGS84), requêtes `geography` pour les distances métriques |
| **Conteneurisation** | Docker, Docker Compose (3 services), Nginx pour le frontend compilé |

## 6. Prérequis

Deux options d'installation :

**Option A — Docker (recommandée)** :
- Docker Engine 24+ et Docker Compose v2

**Option B — Installation manuelle** :
- Python 3.11+ avec `pip`
- Node.js 18+ avec `npm`
- PostgreSQL 15+ avec l'extension **PostGIS 3+** installée et accessible

## 7. Installation

```bash
# 1. Cloner le projet
git clone <url-du-depot> telecom-gis
cd telecom-gis

# 2. Configurer les variables d'environnement
cp .env.example backend/.env
#    puis ajuster DATABASE_URL / SECRET_KEY selon votre environnement

# 3. (Option Docker) Tout lancer en une commande
docker compose up --build
#    → Frontend : http://localhost:5173
#    → Swagger  : http://localhost:8000/docs

# ── OU ──

# 3. (Option manuelle) Créer la base PostgreSQL/PostGIS
psql -U postgres -c "CREATE USER telecom WITH PASSWORD 'telecom2026' CREATEDB;"
psql -U postgres -c "CREATE DATABASE telecom_gis OWNER telecom;"
psql -U postgres -d telecom_gis -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# 4. (Option manuelle) Backend
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows : .venv\Scripts\activate
pip install -r requirements.txt

# 5. (Option manuelle) Générer les données de démonstration
cd ..
./backend/.venv/bin/python scripts/seed.py

# 6. (Option manuelle) Frontend
cd frontend
npm install
npm run build                      # build de production
```

## 8. Configuration

Toutes les variables sensibles vivent dans `backend/.env` (jamais dans le code) :

| Variable | Rôle | Exemple |
|---|---|---|
| `DATABASE_URL` | Connexion PostgreSQL + PostGIS | `postgresql+psycopg2://telecom:telecom2026@localhost:5432/telecom_gis` |
| `SECRET_KEY` | Clé de signature des JWT | `python -c "import secrets; print(secrets.token_hex(32))"` |
| `ALGORITHM` | Algorithme JWT | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Durée de vie du token (min) | `480` |
| `CORS_ORIGINS` | Origines autorisées (virgules) | `http://localhost:5173,http://localhost:3000` |
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL (Docker) | `telecom2026` |

## 9. Lancement

### Avec Docker (recommandé)

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| **Frontend React** | http://localhost:5173 |
| **API FastAPI** | http://localhost:8000 |
| **Documentation Swagger** | http://localhost:8000/docs |
| **Documentation ReDoc** | http://localhost:8000/redoc |
| **Sonde de disponibilité** | http://localhost:8000/api/health |

Le conteneur backend génère automatiquement les données de démonstration au premier
démarrage (script `scripts/seed.py`), puis démarre l'API.

### Sans Docker (développement)

```bash
# Terminal 1 — API (port 8000)
cd backend
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — Frontend Vite (port 5173, proxy /api → 8000)
cd frontend
npm run dev
```

> En production intégrée, le build `frontend/dist/` peut être servi directement par
> FastAPI (mode automatique) : `uvicorn app.main:app --port 3000` sert alors l'API
> **et** l'application React sur le même port.

## 10. Base de données

Schéma relationnel (voir `database/init.sql`) :

| Table | Contenu | Géométrie | Index spatial |
|---|---|---|---|
| `antennes` | Antennes relais (opérateur, technologie 2G–5G, statut, hauteur, puissance, ville, région, lat/lng) | `geometry(Point, 4326)` | `idx_antennes_geom` (GiST) |
| `fibres` | Tronçons de fibre optique (origine, destination, capacité, longueur km) | `geometry(LineString, 4326)` | `idx_fibres_geom` (GiST) |
| `centres_techniques` | Nœuds de commutation, data centers (capacité, adresse) | `geometry(Point, 4326)` | `idx_centres_geom` (GiST) |
| `regions` | 10 régions administratives du Cameroun (limites **simplifiées**) | `geometry(MultiPolygon, 4326)` | `idx_regions_geom` (GiST) |
| `utilisateurs` | Comptes (nom, email, `password_hash` bcrypt, rôle ADMIN/AGENT, actif) | — | — |
| `journal_actions` | Journalisation des actions sensibles (imports, suppressions, connexions…) | — | — |

Fonctions PostGIS utilisées : `ST_Distance(geography)`, `ST_Buffer(geography)`,
`ST_DWithin(geography)`, `ST_Length(geography)`, `ST_Within`, `ST_Intersects`, `ST_AsGeoJSON`,
`ST_SetSRID`, `ST_MakePoint`, `ST_GeomFromText`, index KNN (`geom <-> geom`).

## 11. Utilisateurs de démonstration

Créés automatiquement par le script de génération (`scripts/seed.py`) — **développement uniquement** :

| Rôle | Email | Mot de passe | Droits |
|---|---|---|---|
| **ADMIN** | `admin@art.cm` | `Admin@2026` | Accès complet + administration des comptes + journal |
| **AGENT** | `agent@art.cm` | `Agent@2026` | Consultation, analyses, gestion des infrastructures (hors administration) |

> 🔒 **Ne jamais utiliser ces comptes en production.** Changer `SECRET_KEY` et créer des
> comptes avec des mots de passe forts avant tout déploiement réel.

## 12. API

Documentation interactive **Swagger/OpenAPI** : http://localhost:8000/docs

### Endpoints principaux

```
AUTHENTIFICATION
POST   /api/auth/login                 Connexion → JWT
GET    /api/auth/me                    Profil connecté
PUT    /api/auth/me                    Modifier son profil / mot de passe

ANTENNES
GET    /api/antennes                   Liste paginée (recherche, filtres, tri)
GET    /api/antennes/carte             GeoJSON allégé pour la carte
GET    /api/antennes/filtres           Valeurs distinctes des filtres
GET    /api/antennes/{id}              Détail
POST   /api/antennes                   Création            🔒 écriture
PUT    /api/antennes/{id}              Modification        🔒 écriture
DELETE /api/antennes/{id}              Suppression         🔒 écriture

FIBRES OPTIQUES
GET    /api/fibres                     Liste paginée
GET    /api/fibres/carte               GeoJSON pour la carte
GET    /api/fibres/{id}                Détail (avec coordonnées du tracé)
POST   /api/fibres                     Création (longueur calculée par ST_Length)
PUT    /api/fibres/{id}                Modification
DELETE /api/fibres/{id}                Suppression

CENTRES TECHNIQUES
GET    /api/centres                    · /carte · /filtres · /{id}
POST   /api/centres                    · PUT /{id} · DELETE /{id}

RÉGIONS
GET    /api/regions                    Limites GeoJSON (MultiPolygon)
GET    /api/regions/noms               Noms (filtres/formulaires)

STATISTIQUES (calculs PostgreSQL)
GET    /api/statistiques               Indicateurs synthétiques
GET    /api/statistiques/antennes-region
GET    /api/statistiques/operateurs
GET    /api/statistiques/technologies
GET    /api/statistiques/statuts
GET    /api/statistiques/centres-region
GET    /api/statistiques/evolution     Installations par année

ANALYSES SPATIALES (PostGIS)
GET    /api/analyses/distance          ST_Distance geography → km
GET    /api/analyses/couverture        ST_Buffer → polygone + antennes dans la zone
GET    /api/analyses/recherche-spatiale ST_DWithin → résultats triés + cercle
GET    /api/analyses/par-region        ST_Within / ST_Intersects par région
GET    /api/analyses/proximite         Paires proches, isolées, KNN centres

IMPORTATION
POST   /api/import/csv                 CSV (aperçu : confirmer=false, insertion : true)
POST   /api/import/geojson             GeoJSON (Points, LineStrings)

EXPORTATION
GET    /api/export/antennes?format=csv|geojson   (+ filtres)
GET    /api/export/fibres?format=csv|geojson
GET    /api/export/centres?format=csv|geojson

ADMINISTRATION 🔒 ADMIN
GET    /api/utilisateurs               Liste paginée
POST   /api/utilisateurs               Création (mot de passe haché bcrypt)
PUT    /api/utilisateurs/{id}          Modification (rôle, activation, mot de passe)
DELETE /api/utilisateurs/{id}          Suppression
GET    /api/utilisateurs/journal/historique   Journal des actions sensibles

SYSTÈME
GET    /api/health                     Sonde de disponibilité
```

## 13. Import des données

Page « **Importation** » de l'application (ou `POST /api/import/...`).

**Formats acceptés** : CSV (`.csv`) et GeoJSON (`.geojson`, `.json`). Le Shapefile et le KML
ne sont pas pris en charge par ce prototype (indiqué « à venir » dans la roadmap).

### CSV

- Colonnes reconnues automatiquement (alias FR/EN) : `nom` (obligatoire), `latitude`/`lat`
  (obligatoire), `longitude`/`lon`/`lng` (obligatoire), `operateur`, `technologie`, `statut`,
  `type`, `ville`, `region`, `adresse`, `hauteur`, `puissance`, `date_installation`, `capacite` ;
- Détection automatique du délimiteur (`,` `;` ou tabulation) ;
- Valeurs normalisées : statuts (`EN SERVICE` → `ACTIF`…), technologies (`2G`–`5G`), opérateurs ;
- Coordonnées validées : latitude ∈ [-90 ; 90], longitude ∈ [-180 ; 180].

### GeoJSON

- `FeatureCollection` avec géométries **Point** (antennes/centres) ou **LineString** (fibre) ;
- Détection automatique du type cible ; propriétés mappées sur le modèle de données.

### Flux de validation

1. Vérification du format du fichier ;
2. Vérification des champs obligatoires ;
3. Vérification des coordonnées (limites WGS84) ;
4. **Aperçu** : récapitulatif (lignes valides / erreurs / doublons) + 10 premières lignes ;
5. **Confirmation** explicite de l'utilisateur ;
6. Insertion dans PostGIS + journalisation de l'opération.

Des fichiers d'exemple prêts à importer sont fournis dans le dossier **`data/`** :
`antennes.csv`, `centres.geojson`, `fibres.geojson`, `limites.geojson`.

## 14. Déploiement

- **Développement / démonstration** : `docker compose up --build` (voir section 9) ;
- **Hébergement Render (recommandé pour la démonstration en ligne)** : le dépôt
  contient un Blueprint **`render.yaml`** (base PostgreSQL 16/PostGIS + backend
  Docker + frontend statique) — procédure pas-à-pas dans
  [`DEPLOIEMENT_RENDER.md`](DEPLOIEMENT_RENDER.md). Le jeu de données de
  démonstration est généré automatiquement au premier démarrage et n'est jamais
  écrasé par un redéploiement ;
- **Hébergement 100 % gratuit (sans carte bancaire)** : base PostgreSQL/PostGIS
  **Neon** (plan gratuit) + services Render Free — guide dédié
  [`HEBERGEMENT_GRATUIT.md`](HEBERGEMENT_GRATUIT.md) et blueprint
  **`render.free.yaml`** ;
- **Production** : remplir `SECRET_KEY` avec une clé aléatoire forte, définir
  `POSTGRES_PASSWORD`, restreindre `CORS_ORIGINS` au domaine réel, placer l'API derrière un
  reverse proxy HTTPS (Nginx/Traefik), activer des sauvegardes régulières de PostgreSQL
  (`pg_dump`), et créer des comptes nominatifs (ne jamais conserver les comptes de
  démonstration) ;
- Les limites réseau doivent suivre les recommandations de sécurité de la section 12 du
  cahier des charges (ports exposés restreints, journalisation, confidentialité).

## 15. Tests

### Backend (pytest — 34 tests)

```bash
cd backend
source .venv/bin/activate
pytest tests/ -v
```

Couverture :
- **Authentification** : login valide/invalide, JWT, 401 sans token, 403 pour un AGENT sur
  les routes ADMIN (`tests/test_authentification.py`) ;
- **CRUD** : liste, pagination, filtres, création, doublon de code refusé, latitude invalide
  (422), modification, suppression (`tests/test_crud.py`) ;
- **Requêtes spatiales** : distance PostGIS comparée à un calcul haversine indépendant
  (écart < 1 %), polygone `ST_Buffer`, `ST_DWithin` trié, seuils de proximité, `ST_Within`
  par région (`tests/test_spatial.py`) ;
- **Import/Export** : aperçu CSV, coordonnées invalides rejetées, insertion confirmée,
  format refusé, GeoJSON LineString, exports CSV et GeoJSON (`tests/test_import_export.py`) ;
- **Statistiques & utilisateurs** : cohérence des agrégats avec la base, cycle de vie complet
  d'un utilisateur (`tests/test_statistiques.py`).

### Frontend (Vitest + Testing Library — 5 tests)

```bash
cd frontend
npm test
```

- Page de connexion : rendu, appel d'API, messages d'erreur ;
- Panneau des couches : présence des 4 couches et basculement ;
- Tableau de bord : affichage des KPI issus de l'API (mockée).

## 16. Structure du projet

```
telecom-gis/
│
├── frontend/                          # Application React (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/                # Sidebar, Topbar
│   │   │   ├── map/                   # PanneauCouches, Légende/BarreOutils, icônes SVG
│   │   │   └── ui/                    # Composants partagés (KPI, modales, tableaux, formulaires)
│   │   ├── pages/                     # Connexion, TableauDeBord, CarteSIG, Antennes,
│   │   │                              # Fibres, Centres, Analyses, Statistiques,
│   │   │                              # ImportDonnees, Administration, Profil
│   │   ├── layouts/MainLayout.jsx
│   │   ├── hooks/useAuth.jsx          # Contexte d'authentification JWT
│   │   ├── services/api.js            # Axios + intercepteurs (token, 401, téléchargements)
│   │   ├── utils/couleurs.js          # Palette opérateurs/statuts + fonds de carte
│   │   ├── App.jsx                    # Routage et gardes de rôle
│   │   └── main.jsx
│   ├── tests/                         # Vitest + Testing Library
│   ├── package.json · vite.config.js · tailwind.config.js
│   ├── Dockerfile · nginx.conf
│
├── backend/                           # API REST FastAPI
│   ├── app/
│   │   ├── main.py                    # Application, CORS, Swagger, service du frontend
│   │   ├── config.py                  # Configuration via .env (pydantic-settings)
│   │   ├── database.py                # Engine / session SQLAlchemy
│   │   ├── models/                    # Antenne, Fibre, CentreTechnique, Region,
│   │   │                              # Utilisateur, JournalAction (GeoAlchemy2)
│   │   ├── schemas/                   # Validation Pydantic v2 (entrées/sorties)
│   │   ├── routes/                    # auth, antennes, fibres, centres, regions,
│   │   │                              # statistiques, analyses, import_data, export,
│   │   │                              # utilisateurs
│   │   ├── auth/                      # security.py (bcrypt + JWT), deps.py (rôles)
│   │   └── utils/                     # geo_utils.py (helpers PostGIS)
│   ├── tests/                         # pytest (34 tests)
│   ├── requirements.txt · Dockerfile
│
├── database/
│   └── init.sql                       # Schéma SQL complet (tables + index GiST)
│
├── render.yaml                        # Blueprint Render (DB + API + frontend)
├── render.free.yaml                   # Blueprint Render 100 % gratuit (base Neon)
├── DEPLOIEMENT_RENDER.md              # Guide pas-à-pas d'hébergement sur Render
├── HEBERGEMENT_GRATUIT.md             # Guide d'hébergement gratuit (Neon + Render Free)
│
├── data/                              # Échantillons de démonstration (à importer)
│   ├── antennes.csv · fibres.geojson · centres.geojson · limites.geojson
│
├── scripts/
│   └── seed.py                        # Génération des données de démonstration
│
├── docker-compose.yml                 # 3 services : PostGIS, backend, frontend
├── .env.example                       # Modèle de configuration
├── .gitignore
└── README.md
```

## 17. Limites du prototype

Ce livrable est un **prototype académique** ; les limites suivantes sont assumées et
documentées :

- **Données simulées** : les infrastructures, les limites régionales (simplifiées) et les
  opérateurs sont fictives/générées ; aucun jeu de données officiel de l'ART n'est utilisé ;
- **Zone de couverture théorique** : le cercle de couverture repose sur un simple rayon
  géodésique (`ST_Buffer`), et **non** sur une simulation radio réelle (aucun modèle
  d'atténuation, de relief ou d'obstacle) ;
- **Formats d'import** : Shapefile et KML non pris en charge (CSV et GeoJSON fonctionnels) ;
- **Sécurité** : hachage bcrypt, JWT et contrôle de rôles implémentés, mais pas de limitation
  de débit, ni de 2FA, ni de chiffrement au repos ;
- **Performances** : pagination, filtres côté backend, index GiST et endpoints carte allégés
  sont en place, mais le prototype n'a pas été dimensionné pour de très gros volumes ;
- **Traçabilité** : journal des actions sensibles en base, sans export ni rétention configurée.

## 18. Perspectives d'amélioration

- Import **Shapefile** (pyshp/GDAL) et **KML** ; export Shapefile ;
- Édition géométrique sur la carte (déplacement des antennes, dessin des tronçons à la souris) ;
- Calcul de couverture radio réaliste (modèle Okumura-Hata / Hata COST231, base SRTM pour le relief) ;
- Densité de couverture et identification des **zones blanches** (grille hexagonale H3) ;
- Tableau de bord temporel avec historisation des états des infrastructures ;
- Intégration de fonds de carte officiels et des limites administratives exactes ;
- Système de notifications et workflows de validation des déclarations d'opérateurs ;
- Déploiement CI/CD (GitHub Actions), publication d'images Docker, monitoring (Prometheus/Grafana).

---

*Plateforme SIG de cartographie et d'analyse des infrastructures de télécommunications —
Prototype académique réalisé à destination de l'Agence de Régulation des Télécommunications
(ART) Cameroun.*
