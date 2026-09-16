"""Routes statistiques — tous les agrégats sont calculés par PostgreSQL."""
from fastapi import APIRouter, Depends
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.database import get_db
from app.models import Antenne, CentreTechnique, Fibre, Utilisateur

router = APIRouter(prefix="/api/statistiques", tags=["Statistiques"])


@router.get("", summary="Indicateurs synthétiques du tableau de bord")
def resume(db: Session = Depends(get_db), _: Utilisateur = Depends(get_current_user)):
    nb_antennes = db.query(func.count(Antenne.id)).scalar()
    nb_centres = db.query(func.count(CentreTechnique.id)).scalar()
    nb_fibres = db.query(func.count(Fibre.id)).scalar()
    longueur_totale = db.query(func.sum(Fibre.longueur)).scalar() or 0.0
    nb_operateurs = db.query(func.count(func.distinct(Antenne.operateur))).scalar()
    antennes_actives = db.query(func.count(Antenne.id)).filter(Antenne.statut == "ACTIF").scalar()
    antennes_hs = (
        db.query(func.count(Antenne.id)).filter(Antenne.statut == "HORS_SERVICE").scalar()
    )
    centres_actifs = (
        db.query(func.count(CentreTechnique.id))
        .filter(CentreTechnique.statut == "ACTIF")
        .scalar()
    )
    fibres_actives = db.query(func.count(Fibre.id)).filter(Fibre.statut == "ACTIF").scalar()

    return {
        "total_antennes": nb_antennes,
        "total_centres": nb_centres,
        "total_fibres": nb_fibres,
        "longueur_totale_fibre_km": round(longueur_totale, 1),
        "nb_operateurs": nb_operateurs,
        "antennes_actives": antennes_actives,
        "antennes_hors_service": antennes_hs,
        "centres_actifs": centres_actifs,
        "fibres_actives": fibres_actives,
    }


@router.get("/antennes-region", summary="Antennes par région")
def antennes_region(db: Session = Depends(get_db), _: Utilisateur = Depends(get_current_user)):
    lignes = (
        db.query(Antenne.region, func.count(Antenne.id).label("total"))
        .group_by(Antenne.region)
        .order_by(text("total DESC"))
        .all()
    )
    return [{"region": r.region, "total": r.total} for r in lignes]


@router.get("/operateurs", summary="Répartition des antennes par opérateur")
def par_operateur(db: Session = Depends(get_db), _: Utilisateur = Depends(get_current_user)):
    lignes = (
        db.query(Antenne.operateur, func.count(Antenne.id).label("total"))
        .group_by(Antenne.operateur)
        .order_by(text("total DESC"))
        .all()
    )
    return [{"operateur": r.operateur, "total": r.total} for r in lignes]


@router.get("/technologies", summary="Répartition des technologies")
def par_technologie(db: Session = Depends(get_db), _: Utilisateur = Depends(get_current_user)):
    lignes = (
        db.query(Antenne.technologie, func.count(Antenne.id).label("total"))
        .group_by(Antenne.technologie)
        .order_by(Antenne.technologie)
        .all()
    )
    return [{"technologie": r.technologie, "total": r.total} for r in lignes]


@router.get("/statuts", summary="Répartition des statuts")
def par_statut(db: Session = Depends(get_db), _: Utilisateur = Depends(get_current_user)):
    lignes = (
        db.query(Antenne.statut, func.count(Antenne.id).label("total"))
        .group_by(Antenne.statut)
        .order_by(text("total DESC"))
        .all()
    )
    return [{"statut": r.statut, "total": r.total} for r in lignes]


@router.get("/centres-region", summary="Centres techniques par région")
def centres_region(db: Session = Depends(get_db), _: Utilisateur = Depends(get_current_user)):
    lignes = (
        db.query(CentreTechnique.region, func.count(CentreTechnique.id).label("total"))
        .group_by(CentreTechnique.region)
        .order_by(text("total DESC"))
        .all()
    )
    return [{"region": r.region, "total": r.total} for r in lignes]


@router.get("/evolution", summary="Évolution des installations d'antennes par année")
def evolution(db: Session = Depends(get_db), _: Utilisateur = Depends(get_current_user)):
    lignes = (
        db.query(
            func.extract("year", Antenne.date_installation).label("annee"),
            func.count(Antenne.id).label("total"),
        )
        .filter(Antenne.date_installation.isnot(None))
        .group_by("annee")
        .order_by("annee")
        .all()
    )
    return [{"annee": int(r.annee), "total": r.total} for r in lignes if r.annee is not None]
