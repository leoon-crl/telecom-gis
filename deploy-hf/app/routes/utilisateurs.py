"""Routes d'administration des utilisateurs — réservées aux ADMIN."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user, require_admin
from app.auth.security import hash_password
from app.database import get_db
from app.models import Utilisateur
from app.models.journal import journaliser
from app.schemas import PageResult, UtilisateurCreate, UtilisateurOut, UtilisateurUpdate

router = APIRouter(prefix="/api/utilisateurs", tags=["Administration"])

# ADMIN : gestion complète. Un AGENT ne peut pas accéder à ces fonctionnalités.
router.dependencies = [Depends(require_admin)]


@router.get("", response_model=PageResult, summary="Liste des utilisateurs")
def liste(
    page: int = 1,
    size: int = 20,
    recherche: str = "",
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_admin),
):
    query = db.query(Utilisateur)
    if recherche:
        mot = f"%{recherche.lower()}%"
        query = query.filter(
            (Utilisateur.nom.ilike(mot)) | (Utilisateur.email.ilike(mot))
        )
    total = query.count()
    items = (
        query.order_by(Utilisateur.id)
        .offset((max(page, 1) - 1) * size)
        .limit(size)
        .all()
    )
    return PageResult(
        items=[UtilisateurOut.model_validate(u) for u in items],
        total=total,
        page=page,
        pages=max((total + size - 1) // size, 1),
    )


@router.post("", response_model=UtilisateurOut, status_code=201, summary="Créer un utilisateur")
def creer(
    donnees: UtilisateurCreate,
    db: Session = Depends(get_db),
    admin: Utilisateur = Depends(require_admin),
):
    if db.query(Utilisateur).filter(Utilisateur.email == donnees.email.lower()).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cet email est déjà utilisé.")
    user = Utilisateur(
        nom=donnees.nom,
        email=donnees.email.lower(),
        password_hash=hash_password(donnees.password),
        role=donnees.role,
        actif=True,
    )
    db.add(user)
    journaliser(db, admin, "CREATION", "utilisateur", f"Création du compte {user.email}")
    db.commit()
    db.refresh(user)
    return user


@router.put("/{user_id}", response_model=UtilisateurOut, summary="Modifier un utilisateur")
def modifier(
    user_id: int,
    donnees: UtilisateurUpdate,
    db: Session = Depends(get_db),
    admin: Utilisateur = Depends(require_admin),
):
    user = db.get(Utilisateur, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Utilisateur introuvable.")

    if donnees.nom is not None:
        user.nom = donnees.nom
    if donnees.email is not None:
        existant = (
            db.query(Utilisateur)
            .filter(Utilisateur.email == donnees.email.lower(), Utilisateur.id != user_id)
            .first()
        )
        if existant:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cet email est déjà utilisé.")
        user.email = donnees.email.lower()
    if donnees.role is not None:
        if user.id == admin.id and donnees.role != "ADMIN":
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Vous ne pouvez pas retirer votre propre rôle d'administrateur.",
            )
        user.role = donnees.role
    if donnees.actif is not None:
        if user.id == admin.id and not donnees.actif:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "Vous ne pouvez pas désactiver votre propre compte."
            )
        user.actif = donnees.actif
    if donnees.password:
        user.password_hash = hash_password(donnees.password)

    journaliser(db, admin, "MODIFICATION", "utilisateur", f"Modification du compte {user.email}")
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=204, summary="Supprimer un utilisateur")
def supprimer(
    user_id: int,
    db: Session = Depends(get_db),
    admin: Utilisateur = Depends(require_admin),
):
    if user_id == admin.id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Vous ne pouvez pas supprimer votre propre compte."
        )
    user = db.get(Utilisateur, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Utilisateur introuvable.")
    journaliser(db, admin, "SUPPRESSION", "utilisateur", f"Suppression du compte {user.email}")
    db.delete(user)
    db.commit()


@router.get("/journal/historique", summary="Journal des actions sensibles (50 dernières)")
def journal(
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_admin),
):
    from app.models import JournalAction

    actions = (
        db.query(JournalAction)
        .order_by(JournalAction.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": a.id,
            "utilisateur": a.utilisateur_email,
            "action": a.action,
            "entite": a.entite,
            "details": a.details,
            "date": a.created_at.isoformat() if a.created_at else None,
        }
        for a in actions
    ]
