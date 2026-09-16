---
title: ART TELECOM GIS - API
emoji: 📡
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 8000
pinned: false
---

# ART TELECOM GIS — API FastAPI (Hugging Face Space)

Backend de la plateforme SIG **ART TELECOM GIS** — cartographie et analyse des
infrastructures de télécommunications (Prototype académique, ART Cameroun).

- Swagger : `https://<votre-space>.hf.space/docs`
- Sonde santé : `https://<votre-space>.hf.space/api/health`

## Secrets requis (Settings → Variables and secrets)

| Secret | Valeur |
|---|---|
| `DATABASE_URL` | URL **Neon** : `postgresql://…?sslmode=require` |
| `SECRET_KEY` | Clé JWT aléatoire (`python -c "import secrets; print(secrets.token_hex(32))"`) |
| `CORS_ORIGINS` | URL du frontend, ex. `https://telecom-gis.netlify.app` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` |

Au premier démarrage : extension **PostGIS** activée, tables créées et jeu de
données de démonstration généré (110 antennes, 30 centres, ~45 tronçons fibre,
10 régions) — seed idempotent, jamais écrasé par un redéploiement.

⚠️ **Prototype académique** : les données sont simulées et ne représentent pas
les données officielles de l'ART Cameroun.
