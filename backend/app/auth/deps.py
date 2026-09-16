"""Dépendances FastAPI pour l'authentification et le contrôle des rôles."""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.auth.security import decoder_token
from app.database import get_db
from app.models import Utilisateur

scheme_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(scheme_bearer),
    db: Session = Depends(get_db),
) -> Utilisateur:
    """Vérifie le JWT et retourne l'utilisateur courant."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification requise",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decoder_token(credentials.credentials)
    if payload is None or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session invalide ou expirée, veuillez vous reconnecter",
        )
    user = db.get(Utilisateur, int(payload["sub"]))
    if user is None or not user.actif:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Compte introuvable ou désactivé",
        )
    return user


def require_admin(user: Utilisateur = Depends(get_current_user)) -> Utilisateur:
    """Restreint l'accès aux administrateurs uniquement."""
    if user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs",
        )
    return user


def require_write(user: Utilisateur = Depends(get_current_user)) -> Utilisateur:
    """Autorise l'écriture aux ADMIN et AGENT (consultation ouverte à tous les connectés)."""
    if user.role not in ("ADMIN", "AGENT"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Droits insuffisants pour cette action",
        )
    return user
