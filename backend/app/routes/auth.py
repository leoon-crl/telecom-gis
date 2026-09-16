"""Routes d'authentification JWT."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.auth.security import creer_token_acces, hash_password, verify_password
from app.database import get_db
from app.models import Utilisateur
from app.models.journal import journaliser
from app.schemas import LoginRequest, TokenResponse, UtilisateurOut

router = APIRouter(prefix="/api/auth", tags=["Authentification"])


@router.post("/login", response_model=TokenResponse, summary="Connexion (obtenir un JWT)")
def login(donnees: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(Utilisateur).filter(
        Utilisateur.email == donnees.email.lower().strip()
    ).first()

    if user is None or not verify_password(donnees.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
        )
    if not user.actif:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte désactivé, contactez un administrateur",
        )

    token = creer_token_acces(user.id, user.role)
    journaliser(db, user, "CONNEXION", "utilisateur", f"Connexion de {user.email}")
    db.commit()
    return TokenResponse(access_token=token, user=UtilisateurOut.model_validate(user))


@router.get("/me", response_model=UtilisateurOut, summary="Profil de l'utilisateur connecté")
def me(user: Utilisateur = Depends(get_current_user)):
    return user


@router.put("/me", response_model=UtilisateurOut, summary="Modifier son profil (nom, mot de passe)")
def maj_profil(
    donnees: dict,
    user: Utilisateur = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from pydantic import BaseModel, Field, field_validator

    class MajProfil(BaseModel):
        nom: str | None = Field(default=None, min_length=2, max_length=120)
        password: str | None = Field(default=None, min_length=6)
        mot_de_passe_actuel: str | None = None

        @field_validator("password")
        @classmethod
        def mot_de_passe_solide(cls, v):
            if v is not None and not any(c.isdigit() for c in v):
                raise ValueError("Le mot de passe doit contenir au moins un chiffre.")
            return v

    maj = MajProfil(**donnees)
    if maj.password:
        if maj.mot_de_passe_actuel and not verify_password(
            maj.mot_de_passe_actuel, user.password_hash
        ):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "Mot de passe actuel incorrect."
            )
        user.password_hash = hash_password(maj.password)
    if maj.nom:
        user.nom = maj.nom
    journaliser(db, user, "MODIFICATION", "profil", f"Profil mis à jour : {user.email}")
    db.commit()
    db.refresh(user)
    return user
