"""Import de données géographiques : CSV et GeoJSON, avec validation et aperçu.

Flux : vérification du format → vérification des champs → vérification des
coordonnées → aperçu → confirmation → insertion dans PostGIS.
Les imports sont journalisés (traçabilité utilisateur).
"""
import csv
import io
import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth.deps import require_write
from app.database import get_db
from app.models import Antenne, CentreTechnique, Fibre, Utilisateur
from app.models.antenne import OPERATEURS, STATUTS, TECHNOLOGIES, TYPES_ANTENNE
from app.models.centre import TYPES_CENTRE
from app.models.journal import journaliser

router = APIRouter(prefix="/api/import", tags=["Importation"])

ALIAS = {
    "nom": ["nom", "name", "site", "libelle", "designation", "nom_site"],
    "code": ["code", "identifiant", "id_site", "reference", "code_site"],
    "operateur": ["operateur", "operator", "exploitant", "operateur_telecom"],
    "technologie": ["technologie", "technology", "tech", "generation", "reseau"],
    "statut": ["statut", "status", "etat", "etat_service"],
    "type": ["type", "type_site", "type_infrastructure", "categorie"],
    "latitude": ["latitude", "lat", "y", "y_wgs84"],
    "longitude": ["longitude", "lon", "long", "lng", "x", "x_wgs84"],
    "ville": ["ville", "city", "commune", "localite"],
    "region": ["region", "province"],
    "adresse": ["adresse", "address", "rue", "emplacement"],
    "hauteur": ["hauteur", "height", "hauteur_m"],
    "puissance": ["puissance", "power", "puissance_w"],
    "date_installation": ["date_installation", "date_mise_en_service", "date", "date_mes"],
    "capacite": ["capacite", "capacity"],
    "origine": ["origine", "origin", "depart", "source"],
    "destination": ["destination", "dest", "arrivee", "fin"],
}


def _colonne(champ: str, en_tetes: list[str]) -> str | None:
    """Trouve la colonne correspondant à un champ (alias acceptés, insensible à la casse)."""
    for en_tete in en_tetes:
        if en_tete.strip().lower().replace(" ", "_") in ALIAS[champ]:
            return en_tete
    return None


def _normaliser_statut(v: str | None) -> str:
    v = (v or "ACTIF").strip().upper().replace(" ", "_").replace("-", "_")
    correspondances = {
        "ACTIF": "ACTIF", "EN_SERVICE": "ACTIF", "EN_SERVICE": "ACTIF", "SERVICE": "ACTIF",
        "MAINTENANCE": "MAINTENANCE", "EN_MAINTENANCE": "MAINTENANCE",
        "PROJET": "PROJET", "EN_PROJET": "PROJET", "PLANIFIE": "PROJET",
        "HORS_SERVICE": "HORS_SERVICE", "HORS_SERV": "HORS_SERVICE", "INACTIF": "HORS_SERVICE",
    }
    return correspondances.get(v, v if v in STATUTS else "ACTIF")


def _normaliser_technologie(v: str | None) -> str:
    v = (v or "4G").strip().upper().replace(" ", "")
    if v in ("2G", "3G", "4G", "5G"):
        return v
    if "5G" in v:
        return "5G"
    if "4G" in v:
        return "4G"
    if "3G" in v:
        return "3G"
    if "2G" in v:
        return "2G"
    return "4G"


def _normaliser_operateur(v: str | None) -> str:
    v = (v or "CAMTEL").strip()
    v_low = v.lower()
    if "camtel" in v_low:
        return "CAMTEL"
    if "mtn" in v_low:
        return "MTN Cameroun"
    if "orange" in v_low:
        return "Orange Cameroun"
    if "nexttel" in v_low or "viettel" in v_low:
        return "Nexttel (Viettel)"
    return v if v in OPERATEURS else v


def _parse_float(v, champ: str, ligne: int, erreurs: list):
    if v in (None, ""):
        return None
    try:
        return float(str(v).replace(",", "."))
    except ValueError:
        erreurs.append(f"Ligne {ligne} : {champ} invalide (« {v} »).")
        return None


def _parse_coord(v, limites: tuple[float, float], champ: str, ligne: int, erreurs: list):
    val = _parse_float(v, champ, ligne, erreurs)
    if val is None:
        erreurs.append(f"Ligne {ligne} : {champ} manquante.")
        return None
    if not (limites[0] <= val <= limites[1]):
        erreurs.append(
            f"Ligne {ligne} : {champ} hors limites ({val}) — latitude [-90; 90], longitude [-180; 180]."
        )
        return None
    return val


def _resoudre_region(db: Session, ville: str, region: str | None) -> str:
    if region:
        return region
    # Déduction de la région à partir de la ville (base de démonstration)
    correspondances = {
        "yaoundé": "Centre", "yaounde": "Centre", "douala": "Littoral",
        "bafoussam": "Ouest", "bamenda": "Nord-Ouest", "garoua": "Nord",
        "maroua": "Extrême-Nord", "ngaoundéré": "Adamaoua", "ngaoundere": "Adamaoua",
        "bertoua": "Est", "ebolowa": "Sud", "limbe": "Sud-Ouest", "buea": "Sud-Ouest",
        "kribi": "Sud", "bafang": "Ouest", "nkongsamba": "Littoral", "edéa": "Littoral",
    }
    return correspondances.get(ville.lower().strip(), "Centre")


# ─────────────────────────────── IMPORT CSV ───────────────────────────────
@router.post("/csv", summary="Import CSV (antennes ou centres) avec validation et aperçu")
def importer_csv(
    fichier: UploadFile = File(...),
    type_infra: str = Form("antennes", pattern="^(antennes|centres)$"),
    confirmer: bool = Form(False),
    db: Session = Depends(get_db),
    user: Utilisateur = Depends(require_write),
):
    if not fichier.filename or not fichier.filename.lower().endswith(".csv"):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Format de fichier invalide : un fichier .csv est attendu.",
        )

    contenu = fichier.file.read().decode("utf-8-sig", errors="replace")
    if not contenu.strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Le fichier CSV est vide.")

    # Détection automatique du délimiteur (virgule, point-virgule, tabulation)
    premiere_ligne = contenu.splitlines()[0]
    delimiteur = max(
        (c for c in (";", ",", "\t") if c in premiere_ligne),
        key=lambda c: premiere_ligne.count(c),
        default=";",
    )

    lecteur = list(csv.DictReader(io.StringIO(contenu), delimiter=delimiteur))
    en_tetes = list(lecteur[0].keys()) if lecteur else []
    en_tetes = [e for e in en_tetes if e is not None]
    if not lecteur:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Aucune donnée trouvée dans le CSV.")

    col_nom = _colonne("nom", en_tetes)
    col_lat = _colonne("latitude", en_tetes)
    col_lng = _colonne("longitude", en_tetes)
    if not (col_nom and col_lat and col_lng):
        manquants = [c for c, col in (("nom", col_nom), ("latitude", col_lat), ("longitude", col_lng)) if not col]
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Colonnes obligatoires manquantes : {', '.join(manquants)}. "
            f"Colonnes détectées : {', '.join(en_tetes)}.",
        )

    lignes_valides = []
    erreurs: list[str] = []
    for i, ligne in enumerate(lecteur, start=2):
        nom = (ligne.get(col_nom) or "").strip()
        if not nom:
            erreurs.append(f"Ligne {i} : nom manquant.")
            continue
        lat = _parse_coord(ligne.get(col_lat), (-90, 90), "latitude", i, erreurs)
        lng = _parse_coord(ligne.get(col_lng), (-180, 180), "longitude", i, erreurs)
        if lat is None or lng is None:
            continue

        ville = (ligne.get(_colonne("ville", en_tetes) or "") or "").strip() or "Non précisée"
        region = (ligne.get(_colonne("region", en_tetes) or "") or "").strip()
        region = _resoudre_region(db, ville, region)

        commune = {
            "nom": nom,
            "code": (ligne.get(_colonne("code", en_tetes) or "") or f"IMP-{i:04d}").strip(),
            "operateur": _normaliser_operateur(ligne.get(_colonne("operateur", en_tetes) or "")),
            "statut": _normaliser_statut(ligne.get(_colonne("statut", en_tetes) or "")),
            "latitude": lat,
            "longitude": lng,
            "ville": ville,
            "region": region,
            "adresse": (ligne.get(_colonne("adresse", en_tetes) or "") or "").strip() or None,
        }
        if type_infra == "antennes":
            commune["technologie"] = _normaliser_technologie(
                ligne.get(_colonne("technologie", en_tetes) or "")
            )
            commune["type"] = (ligne.get(_colonne("type", en_tetes) or "") or "MACRO_CELL").strip()
            if commune["type"] not in TYPES_ANTENNE:
                commune["type"] = "MACRO_CELL"
            h = _parse_float(ligne.get(_colonne("hauteur", en_tetes) or ""), "hauteur", i, erreurs)
            p = _parse_float(ligne.get(_colonne("puissance", en_tetes) or ""), "puissance", i, erreurs)
            commune["hauteur"] = h
            commune["puissance"] = p
            di = (ligne.get(_colonne("date_installation", en_tetes) or "") or "").strip()
            commune["date_installation"] = di[:10] if di else None
        else:
            commune["capacite"] = (ligne.get(_colonne("capacite", en_tetes) or "") or "").strip() or None
            commune["type"] = (ligne.get(_colonne("type", en_tetes) or "") or TYPES_CENTRE[0]).strip()
            if commune["type"] not in TYPES_CENTRE:
                commune["type"] = TYPES_CENTRE[0]
        lignes_valides.append(commune)

    # Codes en double en base ?
    modele = Antenne if type_infra == "antennes" else CentreTechnique
    codes = [l["code"] for l in lignes_valides]
    codes_existants = {
        c for (c,) in db.query(modele.code).filter(modele.code.in_(codes)).all()
    } if codes else set()

    apercu = lignes_valides[:10]
    reponse = {
        "type_infra": type_infra,
        "fichier": fichier.filename,
        "total_lignes": len(lecteur),
        "lignes_valides": len(lignes_valides),
        "nb_erreurs": len(erreurs),
        "erreurs": erreurs[:50],
        "codes_deja_presents": sorted(codes_existants)[:20],
        "apercu": apercu,
        "inserte": False,
    }

    if not confirmer:
        return reponse

    # Insertion dans PostGIS après confirmation
    inseres = 0
    for ligne in lignes_valides:
        geom = func.ST_SetSRID(func.ST_MakePoint(ligne["longitude"], ligne["latitude"]), 4326)
        if type_infra == "antennes":
            obj = Antenne(
                nom=ligne["nom"], code=ligne["code"], operateur=ligne["operateur"],
                type=ligne["type"], technologie=ligne["technologie"], statut=ligne["statut"],
                hauteur=ligne.get("hauteur"), puissance=ligne.get("puissance"),
                date_installation=ligne.get("date_installation"),
                adresse=ligne.get("adresse"), ville=ligne["ville"], region=ligne["region"],
                latitude=ligne["latitude"], longitude=ligne["longitude"], geom=geom,
            )
        else:
            obj = CentreTechnique(
                nom=ligne["nom"], code=ligne["code"], operateur=ligne["operateur"],
                type=ligne["type"], statut=ligne["statut"], adresse=ligne.get("adresse"),
                ville=ligne["ville"], region=ligne["region"], capacite=ligne.get("capacite"),
                latitude=ligne["latitude"], longitude=ligne["longitude"], geom=geom,
            )
        db.add(obj)
        inseres += 1

    journaliser(
        db, user, "IMPORT_CSV", type_infra,
        f"{fichier.filename} : {inseres}/{len(lecteur)} lignes insérées",
    )
    db.commit()
    reponse["inserte"] = True
    reponse["nb_insertions"] = inseres
    return reponse


# ──────────────────────────── IMPORT GEOJSON ─────────────────────────────
@router.post("/geojson", summary="Import GeoJSON (Points, LineStrings) avec validation et aperçu")
def importer_geojson(
    fichier: UploadFile = File(...),
    type_infra: str = Form("auto", pattern="^(antennes|centres|fibres|auto)$"),
    confirmer: bool = Form(False),
    db: Session = Depends(get_db),
    user: Utilisateur = Depends(require_write),
):
    if not fichier.filename or not fichier.filename.lower().endswith(".json"):
        if not (fichier.filename or "").lower().endswith(".geojson"):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Format de fichier invalide : un fichier .geojson ou .json est attendu.",
            )

    contenu = fichier.file.read().decode("utf-8-sig", errors="replace")
    try:
        donnees = json.loads(contenu)
    except json.JSONDecodeError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"JSON invalide : {e.msg} (ligne {e.lineno}).")

    features = donnees.get("features") if isinstance(donnees, dict) else None
    if not features:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Structure GeoJSON invalide : objet FeatureCollection avec une liste « features » attendu.",
        )

    # Détection du type par la géométrie si auto
    premiere_geom = features[0].get("geometry", {}).get("type", "") if features else ""
    if type_infra == "auto":
        if premiere_geom == "LineString":
            type_infra = "fibres"
        elif premiere_geom == "Point":
            # antennes par défaut (centres si propriété « capacite » présente)
            props0 = features[0].get("properties", {}) or {}
            type_infra = "centres" if any(k in props0 for k in ("capacite", "adresse")) and "technologie" not in props0 else "antennes"
        else:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"Type de géométrie non pris en charge : {premiere_geom}. Points et LineStrings uniquement.",
            )

    lignes_valides = []
    erreurs: list[str] = []
    for i, feature in enumerate(features, start=1):
        geom = feature.get("geometry") or {}
        props = feature.get("properties") or {}
        coords = geom.get("coordinates")

        if type_infra == "fibres":
            if geom.get("type") != "LineString" or not coords or len(coords) < 2:
                erreurs.append(f"Élément {i} : géométrie LineString (≥ 2 points) attendue.")
                continue
            coord_ok = []
            for c in coords:
                if len(c) >= 2 and -180 <= c[0] <= 180 and -90 <= c[1] <= 90:
                    coord_ok.append([c[0], c[1]])
                else:
                    erreurs.append(f"Élément {i} : coordonnée invalide {c}.")
                    coord_ok = []
                    break
            if not coord_ok:
                continue
            nom = str(props.get("nom") or props.get("name") or "").strip()
            if not nom:
                erreurs.append(f"Élément {i} : nom manquant.")
                continue
            lignes_valides.append(
                {
                    "nom": nom,
                    "code": str(props.get("code") or f"IMP-F-{i:03d}"),
                    "operateur": _normaliser_operateur(props.get("operateur")),
                    "type": str(props.get("type") or "SOUTERRAIN"),
                    "capacite": props.get("capacite"),
                    "statut": _normaliser_statut(props.get("statut")),
                    "origine": str(props.get("origine") or props.get("origin") or "Point A"),
                    "destination": str(props.get("destination") or props.get("destination_x") or "Point B"),
                    "coordonnees": coord_ok,
                    "date_installation": (str(props.get("date_installation") or "") or None),
                }
            )
        else:
            if geom.get("type") != "Point" or not coords or len(coords) < 2:
                erreurs.append(f"Élément {i} : géométrie Point attendue.")
                continue
            lng, lat = coords[0], coords[1]
            if not (-180 <= lng <= 180 and -90 <= lat <= 90):
                erreurs.append(
                    f"Élément {i} : coordonnées hors limites ({lat}, {lng})."
                )
                continue
            nom = str(props.get("nom") or props.get("name") or "").strip()
            if not nom:
                erreurs.append(f"Élément {i} : nom manquant.")
                continue
            ville = str(props.get("ville") or props.get("city") or "Non précisée")
            commune = {
                "nom": nom,
                "code": str(props.get("code") or f"IMP-G-{i:03d}"),
                "operateur": _normaliser_operateur(props.get("operateur")),
                "statut": _normaliser_statut(props.get("statut")),
                "latitude": lat,
                "longitude": lng,
                "ville": ville,
                "region": _resoudre_region(db, ville, props.get("region")),
            }
            if type_infra == "antennes":
                commune["technologie"] = _normaliser_technologie(props.get("technologie"))
                commune["type"] = str(props.get("type") or "MACRO_CELL")
                if commune["type"] not in TYPES_ANTENNE:
                    commune["type"] = "MACRO_CELL"
            else:
                commune["capacite"] = props.get("capacite")
                commune["type"] = str(props.get("type") or TYPES_CENTRE[0])
                if commune["type"] not in TYPES_CENTRE:
                    commune["type"] = TYPES_CENTRE[0]
            lignes_valides.append(commune)

    modele = {"antennes": Antenne, "centres": CentreTechnique, "fibres": Fibre}[type_infra]
    codes = [l["code"] for l in lignes_valides]
    codes_existants = (
        {c for (c,) in db.query(modele.code).filter(modele.code.in_(codes)).all()}
        if codes
        else set()
    )

    apercu = [
        {k: v for k, v in l.items() if k != "coordonnees"} | {"nb_points": len(l["coordonnees"])}
        if "coordonnees" in l
        else l
        for l in lignes_valides[:10]
    ]
    reponse = {
        "type_infra": type_infra,
        "fichier": fichier.filename,
        "total_lignes": len(features),
        "lignes_valides": len(lignes_valides),
        "nb_erreurs": len(erreurs),
        "erreurs": erreurs[:50],
        "codes_deja_presents": sorted(codes_existants)[:20],
        "apercu": apercu,
        "inserte": False,
    }

    if not confirmer:
        return reponse

    inseres = 0
    for ligne in lignes_valides:
        if type_infra == "fibres":
            points = ", ".join(f"{c[0]} {c[1]}" for c in ligne["coordonnees"])
            wkt = f"LINESTRING({points})"
            obj = Fibre(
                nom=ligne["nom"], code=ligne["code"], operateur=ligne["operateur"],
                type=ligne["type"], capacite=ligne.get("capacite"),
                statut=ligne["statut"], date_installation=ligne.get("date_installation"),
                origine=ligne["origine"], destination=ligne["destination"],
                geom=func.ST_SetSRID(func.ST_GeomFromText(wkt), 4326),
            )
        else:
            geom = func.ST_SetSRID(func.ST_MakePoint(ligne["longitude"], ligne["latitude"]), 4326)
            if type_infra == "antennes":
                obj = Antenne(
                    nom=ligne["nom"], code=ligne["code"], operateur=ligne["operateur"],
                    type=ligne["type"], technologie=ligne["technologie"], statut=ligne["statut"],
                    ville=ligne["ville"], region=ligne["region"],
                    latitude=ligne["latitude"], longitude=ligne["longitude"], geom=geom,
                )
            else:
                obj = CentreTechnique(
                    nom=ligne["nom"], code=ligne["code"], operateur=ligne["operateur"],
                    type=ligne["type"], statut=ligne["statut"],
                    ville=ligne["ville"], region=ligne["region"],
                    latitude=ligne["latitude"], longitude=ligne["longitude"], geom=geom,
                )
        db.add(obj)
        inseres += 1

    journaliser(
        db, user, "IMPORT_GEOJSON", type_infra,
        f"{fichier.filename} : {inseres}/{len(features)} éléments insérés",
    )
    db.commit()
    reponse["inserte"] = True
    reponse["nb_insertions"] = inseres
    return reponse
