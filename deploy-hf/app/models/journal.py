"""Journal des actions sensibles (imports, modifications, suppressions)."""
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class JournalAction(Base):
    __tablename__ = "journal_actions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    utilisateur_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    utilisateur_email: Mapped[str | None] = mapped_column(String(160), nullable=True)
    action: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    entite: Mapped[str] = mapped_column(String(60), nullable=False)
    details: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


def journaliser(db, utilisateur, action: str, entite: str, details: str = ""):
    """Enregistre une action sensible dans le journal."""
    entree = JournalAction(
        utilisateur_id=getattr(utilisateur, "id", None),
        utilisateur_email=getattr(utilisateur, "email", None),
        action=action,
        entite=entite,
        details=details[:500] if details else "",
    )
    db.add(entree)
