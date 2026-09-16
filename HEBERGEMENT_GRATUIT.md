# Hébergement 100 % GRATUIT sans carte bancaire — ART TELECOM GIS

> ⚠️ **Pourquoi ce guide ?** Render exige désormais une carte bancaire
> (vérification de 1 $) pour les déploiements Blueprint — même sur le plan
> gratuit. Ce guide utilise uniquement des plateformes **sans carte** :
> **Hugging Face Spaces** (API) + **Netlify** (frontend) + **Neon** (base).

| Composant | Hébergeur | Plan | Carte ? | Coût |
|---|---|---|---|---|
| Base PostgreSQL + PostGIS | **Neon** (neon.tech) | Free | Non | 0 $ |
| API FastAPI (Docker) | **Hugging Face Spaces** | Free CPU | Non | 0 $ |
| Frontend React | **Netlify** (ou Vercel) | Free | Non | 0 $ |

> ⚠️ **Rappel** : prototype académique — les données de démonstration sont
> **simulées** et ne représentent pas les données officielles de l'ART Cameroun.

---

## 1. Architecture

```
┌─────────────────────┐        ┌───────────────────────────────┐
│  Frontend React     │ HTTPS  │  API FastAPI (Docker)         │
│  Netlify — GRATUIT  │───────▶│  Hugging Face Space — GRATUIT │
│  …netlify.app       │  JWT   │  …hf.space   (dossier         │
└─────────────────────┘        │  deploy-hf/ du dépôt)         │
                               └──────────────┬────────────────┘
                                              │ SQL + PostGIS
                                              ▼
                               ┌───────────────────────────────┐
                               │  PostgreSQL 16 + PostGIS      │
                               │  Neon — GRATUIT               │
                               └───────────────────────────────┘
```

L'application est **strictement identique** à la version Docker locale
(`docker compose up --build`). Aucune modification de code n'est nécessaire :
le dossier **`deploy-hf/`** du dépôt contient tout ce qu'il faut uploader.

---

## 2. Étape 1 — Base de données Neon (si ce n'est pas déjà fait)

1. Compte sur **[neon.tech](https://neon.tech)** (connexion GitHub/Google, sans carte) ;
2. Nouveau projet `art-telecom-gis` ;
3. **Copiez la chaîne de connexion** :
   `postgresql://user:motdepasse@ep-xxxx.aws.neon.tech/neondb?sslmode=require`
   → gardez-la pour l'étape 2. PostGIS sera activé automatiquement par
   l'application au premier démarrage.

---

## 3. Étape 2 — API sur Hugging Face Spaces (10 min)

1. Connectez-vous sur **[huggingface.co](https://huggingface.co)** avec votre
   compte GitHub (**leoon-crl**) — sans carte ;
2. **New** → **Space** :
   - Nom : `art-telecom-gis-api`
   - SDK : **Docker** → **Blank** template
   - Visibilité : **Public** (l'API doit être joignable par le frontend ;
     les données sont protégées par JWT)
3. Une fois le Space créé, allez dans l'onglet **Files** :
   - **Add file → Upload files** ;
   - Glissez-déposez le **contenu du dossier `deploy-hf/`** du projet :
     `README.md`, `Dockerfile`, `requirements.txt`, `seed.py` et le **dossier
     `app/`** (sélectionnez tout le contenu du dossier, pas le dossier lui-même) ;
   - **Commit changes** → le Space se construit (2 à 4 minutes).
4. **Secrets** : onglet **Settings → Variables and secrets → New secret** :

   | Nom | Valeur |
   |---|---|
   | `DATABASE_URL` | URL Neon (`postgresql://…?sslmode=require`) |
   | `SECRET_KEY` | `python -c "import secrets; print(secrets.token_hex(32))"` |
   | `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` |
   | `CORS_ORIGINS` | `https://remplacez-moi.netlify.app` (à corriger à l'étape 3) |

5. Le Space redémarre avec les secrets. Vérifiez :
   `https://<propriétaire>-<space>.hf.space/api/health`
   → `{"statut":"ok","sig":"PostgreSQL + PostGIS",…}`

> 💡 L'URL exacte du Space est affichée dans l'onglet **Embed this Space**
> (menu ⋮ en haut à droite) — champ *Direct URL*.
> Le Swagger est disponible sur `/docs`.

---

## 4. Étape 3 — Frontend sur Netlify (5 min)

1. Connectez-vous sur **[app.netlify.com](https://app.netlify.com)** avec
   GitHub (leoon-crl) — sans carte ;
2. **Add new site → Import an existing project → Deploy with GitHub** →
   autorisez l'accès → sélectionnez **telecom-gis** ;
3. Configuration de déploiement :

   | Champ | Valeur |
   |---|---|
   | Branch to deploy | `main` |
   | Base directory | `frontend` |
   | Build command | `npm run build` |
   | Publish directory | `frontend/dist` |

4. **Show advanced → New variable** :

   | Clé | Valeur |
   |---|---|
   | `VITE_API_URL` | `https://<propriétaire>-<space>.hf.space` (URL du Space, **sans** `/` final) |

5. **Deploy** → 2 minutes → site en ligne : `https://<nom>.netlify.app`
   (le routage SPA est déjà géré par `frontend/netlify.toml`).

> Variante **Vercel** : même principe (importer le dépôt, Root Directory
> `frontend`, variable `VITE_API_URL`) — le routage SPA est géré par
> `frontend/vercel.json`.

---

## 5. Étape 4 — Brancher CORS (2 min)

1. Copiez l'URL Netlify réelle (ex. `https://telecom-gis-abc123.netlify.app`) ;
2. Space HF → **Settings → Variables and secrets** → modifiez le secret
   `CORS_ORIGINS` → `https://telecom-gis-abc123.netlify.app` (sans `/` final) ;
3. Le Space redémarre tout seul — c'est branché.

---

## 6. Étape 5 — Vérification

1. `https://<space>.hf.space/api/health` → `{"statut":"ok",…}` ;
2. `https://<space>.hf.space/docs` → Swagger ;
3. `https://<votre-site>.netlify.app` → connexion :

   | Rôle | Identifiant | Mot de passe |
   |---|---|---|
   | ADMIN | `admin@art.cm` | `Admin@2026` |
   | AGENT | `agent@art.cm` | `Agent@2026` |

4. Tableau de bord : les KPI affichent les données → PostGIS fonctionne ✔ ;
5. **Changez les mots de passe de démonstration** (page *Profil*).

---

## 7. Au quotidien

| Sujet | Comportement |
|---|---|
| Sommeil du Space HF | Après **48 h** sans visite (beaucoup mieux que Render) ; réveil ~30–60 s |
| Netlify | Toujours actif, aucune mise en veille |
| Neon | Suspend automatiquement, réveil en 1–3 s |
| Redéploiement | Push GitHub → Netlify redéploie ; Space HF : upload de fichiers ou Settings → Factory rebuild |
| Régénérer les données démo | Space → App → *Restart* avec le secret `SEED_FORCE=1` ajouté temporairement, puis retrait |
| Importer vos données | Page *Importation des données* → échantillons du dossier `data/` |
| Garder le Space réveillé (optionnel) | [cron-job.org](https://cron-job.org) gratuit → ping `/api/health` toutes les 30 min |

---

## 8. Et Render ?

- **Blueprint** : nécessite une carte (vérification 1 $) — voir
  [`DEPLOIEMENT_RENDER.md`](DEPLOIEMENT_RENDER.md) et `render.yaml` /
  `render.free.yaml` si vous obtenez une carte un jour ;
- Le fichier `render.free.yaml` reste prêt à l'emploi (il ne comporte plus
  `preDeployCommand` ni de champ `plan` sur le site statique).

Autres alternatives gratuites pour l'API : **Koyeb** (1 service gratuit),
**Railway** (crédit d'essai). Pour la base : **Supabase** (500 Mo, PostGIS,
projet suspendu après 7 jours sans activité) ou **Aiven**.

---

## 9. Dépannage

| Symptôme | Cause | Solution |
|---|---|---|
| Space HF : `Build error` | Fichiers incomplets (dossier `app/` manquant) | Onglet Files → vérifier `app/main.py`, `requirements.txt`, `Dockerfile`, `README.md` avec l'en-tête `sdk: docker` |
| Space HF en boucle `Runtime error` | Secret `DATABASE_URL` absent/erroné | Settings → Variables and secrets → coller l'URL Neon **complète** avec `?sslmode=require` |
| `SSL connection is required` | URL Neon tronquée | Coller l'URL telle que fournie par Neon |
| « Failed to fetch » sur Netlify | `VITE_API_URL` incorrecte | Site settings → Build & deploy → Environment → corriger puis **Clear cache and deploy site** |
| Erreur CORS dans la console | `CORS_ORIGINS` ≠ URL Netlify réelle | Space → secret `CORS_ORIGINS` = URL exacte du site (https, sans / final) |
| 1ʳᵉ requête très lente | Space + Neon sortent de veille | Normal (≈ 1 min) |
| Base vide | Premier démarrage interrompu | Vérifier les logs du Space (onglet Logs) ; redémarrer — le seed reprend |
| `function postgis_version does not exist` | Extension non activée | L'application l'active au démarrage ; sinon vérifier les logs du Space |

---

## 10. Et en local ? Toujours 100 % gratuit, sans compte

```bash
docker compose up --build
# → http://localhost:5173   (admin@art.cm / Admin@2026)
```

PostgreSQL + PostGIS tourne dans le conteneur local — idéal pour une
soutenance en présentiel sans dépendre d'Internet.
