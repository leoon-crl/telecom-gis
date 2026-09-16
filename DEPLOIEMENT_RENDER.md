# Déploiement sur Render — ART TELECOM GIS

Guide pas-à-pas pour héberger la plateforme **ART TELECOM GIS** (prototype
académique) sur [Render](https://render.com). À la fin de ce guide vous
disposerez de :

> 💰 **Pas de budget ?** Ce guide utilise la base PostgreSQL de Render
> (plan payant ~6 $/mois). Une variante **100 % gratuite sans carte
> bancaire** (base Neon + services Render Free) est décrite dans
> [`HEBERGEMENT_GRATUIT.md`](HEBERGEMENT_GRATUIT.md) avec le blueprint
> **`render.free.yaml`**.

| Service | URL (par défaut) | Rôle |
|---|---|---|
| `art-telecom-gis` | `https://art-telecom-gis.onrender.com` | Frontend React (site statique) |
| `art-telecom-gis-api` | `https://art-telecom-gis-api.onrender.com` | API FastAPI (Swagger : `/docs`) |
| `art-telecom-gis-db` | (accès interne Render) | PostgreSQL 16 + PostGIS |

> ⚠️ **Rappel** : il s'agit d'un prototype académique. Les données de
> démonstration sont **simulées** et ne représentent pas les données
> officielles de l'ART Cameroun.

---

## 1. Prérequis

1. Un compte [Render](https://dashboard.render.com/register) (gratuit, une carte
   bancaire est demandée pour créer une base de données payante) ;
2. Le code source du projet poussé sur un dépôt **GitHub** (ou GitLab) :

   ```bash
   # Après décompression du ZIP :
   cd telecom-gis
   git init
   git add .
   git commit -m "ART TELECOM GIS — prototype académique"
   # Créez le dépôt vide sur github.com puis :
   git remote add origin https://github.com/<votre-compte>/telecom-gis.git
   git push -u origin main
   ```

   Le dépôt ne doit **pas** contenir `node_modules/` ni `dist/` (exclus par
   `.gitignore`) — Render les reconstruit lui-même.

---

## 2. Méthode recommandée — Blueprint en un clic

Le dépôt contient un fichier **`render.yaml`** (Blueprint) qui décrit les trois
services et leurs paramètres.

1. Connectez-vous au [tableau de bord Render](https://dashboard.render.com) ;
2. Cliquez sur **« New + » → Blueprint** ;
3. Sélectionnez le dépôt GitHub `telecom-gis` et cliquez sur **« Connect »** ;
4. Render détecte `render.yaml` et affiche les ressources à créer :
   - une base **PostgreSQL 16** (`art-telecom-gis-db`),
   - un **service web Docker** (`art-telecom-gis-api`),
   - un **site statique** (`art-telecom-gis`) ;
5. Cliquez sur **« Apply »** — le provisionnement démarre (5 à 10 minutes).

### Ce qui se passe automatiquement

- La base PostgreSQL est créée avec l'utilisateur `artgis` ;
- Au premier démarrage du backend, l'extension **PostGIS** est activée
  (`CREATE EXTENSION IF NOT EXISTS postgis` — exécutée par l'application) ;
- Les tables sont créées par SQLAlchemy puis **jeu de données de démonstration
  généré automatiquement** (110 antennes, 30 centres techniques, ~45 tronçons
  de fibre, 10 régions, comptes utilisateurs) si la base est vide ;
- Le frontend est compilé avec l'URL de l'API (`VITE_API_URL`) puis publié ;
- Le CORS du backend est préconfiguré pour accepter le domaine du frontend.

---

## 3. Méthode manuelle (alternative)

Si vous préférez créer les services vous-même, reproduisez cette configuration.

### 3.1 Base de données

`New + → PostgreSQL` :

| Champ | Valeur |
|---|---|
| Name | `art-telecom-gis-db` |
| Database | `telecom_gis` |
| User | `artgis` |
| Plan | `basic-256mb` (PostGIS inclus) |
| Region | `Frankfurt` (identique pour les 3 services) |

> **PostGIS** : après création, l'extension est activée automatiquement au
> premier démarrage du backend. Vous pouvez la vérifier dans l'onglet
> *Shell* du backend : `python -c "import psycopg2, os; ..."` ou via
> psql : `SELECT postgis_version();`

### 3.2 Backend (service web Docker)

`New + → Web Service` → dépôt `telecom-gis` :

| Champ | Valeur |
|---|---|
| Name | `art-telecom-gis-api` |
| Runtime | `Docker` |
| Dockerfile Path | `./backend/Dockerfile` |
| Docker Build Context | `.` (racine du dépôt) |
| Instance Type | `Free` |

**Variables d'environnement** :

| Clé | Valeur |
|---|---|
| `DATABASE_URL` | Copier le *Internal Database URL* de `art-telecom-gis-db` |
| `SECRET_KEY` | `python -c "import secrets; print(secrets.token_hex(32))"` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` |
| `CORS_ORIGINS` | `https://<votre-frontend>.onrender.com,http://localhost:5173` |

**Pre-Deploy Command** (optionnel, données de démo avant chaque déploiement) :

```bash
sh -c "for i in 1 2 3 4 5; do python /application/seed.py && break || sleep 5; done"
```

### 3.3 Frontend (site statique)

`New + → Static Site` → dépôt `telecom-gis` :

| Champ | Valeur |
|---|---|
| Name | `art-telecom-gis` |
| Root Directory | `frontend` |
| Build Command | `npm install && npm run build` |
| Publish Directory | `dist` |

**Variables d'environnement (de build)** :

| Clé | Valeur |
|---|---|
| `VITE_API_URL` | `https://<votre-backend>.onrender.com` |

**Règle de routage** (onglet *Redirects/Rewrites*) — indispensable pour le
routeur React :

| Type | Source | Destination |
|---|---|---|
| Rewrite | `/*` | `/index.html` |

---

## 4. Vérification du déploiement

1. **Backend** : ouvrez `https://<votre-backend>.onrender.com/api/health` —
   réponse attendue : `{"statut":"ok","sig":"PostgreSQL + PostGIS",...}` ;
2. **Swagger** : `https://<votre-backend>.onrender.com/docs` ;
3. **Application** : ouvrez `https://<votre-frontend>.onrender.com` puis
   connectez-vous :

   | Rôle | Identifiant | Mot de passe |
   |---|---|---|
   | ADMIN | `admin@art.cm` | `Admin@2026` |
   | AGENT | `agent@art.cm` | `Agent@2026` |

   > 🔒 **Changez ces mots de passe** (page *Profil*) avant toute présentation
   > publique de la plateforme.

4. Dans le tableau de bord, vérifiez que les KPI affichent des valeurs
   (antennes, km de fibre…) — preuve que la connexion PostGIS fonctionne.

---

## 5. Coûts et plans Render

| Ressource | Plan du Blueprint | Effet |
|---|---|---|
| Backend + Frontend | `Free` | Mise en **veille après 15 min d'inactivité** : la première requête suivante met ~50 s à répondre. Idéal pour la démonstration ; |
| Base de données | `basic-256mb` (~6 $/mois) | Render ne propose plus de base PostgreSQL gratuite permanente. Les plans payants persistent les données. |

Pour une démonstration continue (soutenance), passez le backend sur un plan
payant (`Starter`) ou « réveillez » l'application 1 minute avant en ouvrant
l'URL du frontend.

---

## 6. Mises à jour et données

- **Redéploiement** : chaque `git push` sur la branche suivie déclenche le
  déploiement automatique des services concernés ;
- **Sécurité des données** : le script d'amorçage (`seed.py`) est **idempotent**
  — si la base contient déjà des antennes, il ne fait rien. Vos données saisies
  via l'application ne sont **jamais écrasées** par un redéploiement ;
- **Régénérer les données de démonstration** : dans le *Shell* du service
  backend, exécutez `SEED_FORCE=1 python /application/seed.py`
  (⚠️ réinitialise toutes les données) ;
- **Imports** : utilisez la page *Importation des données* pour charger les
  échantillons du dossier `data/` (`antennes.csv`, `fibres.geojson`,
  `centres.geojson`) — aperçu, validation puis confirmation.

---

## 7. Dépannage (dépannage fréquent)

| Symptôme | Cause probable | Solution |
|---|---|---|
| Le site affiche « Failed to fetch » | `VITE_API_URL` incorrecte ou backend en veille | Vérifier la variable du site statique ; ouvrir d'abord l'URL de l'API pour la réveiller |
| Erreur CORS dans la console du navigateur | `CORS_ORIGINS` du backend ne contient pas l'URL réelle du frontend | Ajouter l'URL exacte (avec `https://`, sans `/` final) puis redéployer |
| Backend « Service Unavailable » au 1er déploiement | Base de données encore en cours de création | Patienter 2–3 min puis *Manual Deploy → Deploy latest commit* |
| `function postgis_version does not exist` | Extension non activée | Shell backend : `python -c "from sqlalchemy import create_engine,text;import os;e=create_engine(os.environ['DATABASE_URL']);e.connect().execute(text('CREATE EXTENSION postgis'));print('ok')"` |
| Login impossible / 401 permanent | `SECRET_KEY` modifiée entre deux déploiements | Les JWT sont invalidés à chaque changement de clé — se reconnecter |
| Page blanche après navigation | Règle de rewrite SPA absente | Ajouter `Rewrite /* → /index.html` sur le site statique |

---

## 8. Alternative : héberger frontend + backend sur un seul service

Pour économiser un service, le backend FastAPI **sert aussi le frontend
compilé** (mode intégré déjà implémenté dans `app/main.py`) :

1. Compilez le frontend et copiez `frontend/dist` dans l'image Docker du
   backend (ajoutez `COPY frontend/dist ./frontend_dist` au Dockerfile et
   ajustez `REPERTOIRE_FRONTEND`) ;
2. Sur Render, un seul service web Docker suffit — l'application et l'API
   partagent la même origine (CORS inutile).

Cette option n'est pas celle du Blueprint fourni, qui reste plus simple à
maintenir (déploiements indépendants du frontend et du backend).
