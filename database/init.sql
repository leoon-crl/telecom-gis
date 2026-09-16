-- ============================================================================
-- ART TELECOM GIS — Initialisation de la base PostgreSQL + PostGIS
-- Plateforme SIG de cartographie et d'analyse des infrastructures
-- de télécommunications — Prototype académique
--
-- Exécuté automatiquement au premier démarrage du conteneur PostGIS
-- (monté dans /docker-entrypoint-initdb.d/). Le backend FastAPI complète
-- cette création via Base.metadata.create_all (idempotent).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- ───────────────────────────────── ANTENNES ─────────────────────────────────
CREATE TABLE IF NOT EXISTS antennes (
    id                SERIAL PRIMARY KEY,
    nom               VARCHAR(150) NOT NULL,
    code              VARCHAR(50)  NOT NULL UNIQUE,
    operateur         VARCHAR(80)  NOT NULL,
    type              VARCHAR(50)  NOT NULL DEFAULT 'MACRO_CELL',
    technologie       VARCHAR(20)  NOT NULL,
    statut            VARCHAR(30)  NOT NULL DEFAULT 'ACTIF',
    hauteur           DOUBLE PRECISION,
    puissance         DOUBLE PRECISION,
    date_installation DATE,
    adresse           VARCHAR(255),
    ville             VARCHAR(100) NOT NULL,
    region            VARCHAR(100) NOT NULL,
    latitude          DOUBLE PRECISION NOT NULL CHECK (latitude  BETWEEN -90  AND 90),
    longitude         DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    geom              geometry(Point, 4326) NOT NULL,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_antennes_geom       ON antennes USING gist (geom);
CREATE INDEX IF NOT EXISTS idx_antennes_operateur  ON antennes (operateur);
CREATE INDEX IF NOT EXISTS idx_antennes_statut     ON antennes (statut);
CREATE INDEX IF NOT EXISTS idx_antennes_region     ON antennes (region);

-- ────────────────────────────── FIBRE OPTIQUE ───────────────────────────────
CREATE TABLE IF NOT EXISTS fibres (
    id                SERIAL PRIMARY KEY,
    nom               VARCHAR(150) NOT NULL,
    code              VARCHAR(50)  NOT NULL UNIQUE,
    operateur         VARCHAR(80)  NOT NULL,
    type              VARCHAR(50)  NOT NULL DEFAULT 'SOUTERRAIN',
    capacite          VARCHAR(50),
    longueur          DOUBLE PRECISION,               -- km (calculée par ST_Length)
    statut            VARCHAR(30)  NOT NULL DEFAULT 'ACTIF',
    date_installation DATE,
    origine           VARCHAR(100) NOT NULL,
    destination       VARCHAR(100) NOT NULL,
    geom              geometry(LineString, 4326) NOT NULL,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fibres_geom       ON fibres USING gist (geom);
CREATE INDEX IF NOT EXISTS idx_fibres_operateur  ON fibres (operateur);

-- ──────────────────────────── CENTRES TECHNIQUES ────────────────────────────
CREATE TABLE IF NOT EXISTS centres_techniques (
    id          SERIAL PRIMARY KEY,
    nom         VARCHAR(150) NOT NULL,
    code        VARCHAR(50)  NOT NULL UNIQUE,
    operateur   VARCHAR(80)  NOT NULL,
    type        VARCHAR(50)  NOT NULL DEFAULT 'NŒUD DE COMMUTATION',
    statut      VARCHAR(30)  NOT NULL DEFAULT 'ACTIF',
    adresse     VARCHAR(255),
    ville       VARCHAR(100) NOT NULL,
    region      VARCHAR(100) NOT NULL,
    capacite    VARCHAR(50),
    latitude    DOUBLE PRECISION NOT NULL CHECK (latitude  BETWEEN -90  AND 90),
    longitude   DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    geom        geometry(Point, 4326) NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_centres_geom       ON centres_techniques USING gist (geom);
CREATE INDEX IF NOT EXISTS idx_centres_operateur  ON centres_techniques (operateur);

-- ────────────────────────────────── RÉGIONS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS regions (
    id        SERIAL PRIMARY KEY,
    nom       VARCHAR(100) NOT NULL UNIQUE,
    code      VARCHAR(10)  NOT NULL UNIQUE,
    chef_lieu VARCHAR(100),
    geom      geometry(MultiPolygon, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_regions_geom ON regions USING gist (geom);

-- ─────────────────────────────── UTILISATEURS ───────────────────────────────
CREATE TABLE IF NOT EXISTS utilisateurs (
    id            SERIAL PRIMARY KEY,
    nom           VARCHAR(120) NOT NULL,
    email         VARCHAR(160) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,               -- bcrypt (jamais en clair)
    role          VARCHAR(20)  NOT NULL DEFAULT 'AGENT' CHECK (role IN ('ADMIN', 'AGENT')),
    actif         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- ──────────────────────────── JOURNAL DES ACTIONS ───────────────────────────
CREATE TABLE IF NOT EXISTS journal_actions (
    id               SERIAL PRIMARY KEY,
    utilisateur_id   INTEGER,
    utilisateur_email VARCHAR(160),
    action           VARCHAR(60)  NOT NULL,
    entite           VARCHAR(60)  NOT NULL,
    details          VARCHAR(500),
    created_at       TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_journal_action ON journal_actions (action);

-- Vérification PostGIS
SELECT PostGIS_Version();
