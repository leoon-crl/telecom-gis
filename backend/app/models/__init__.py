"""Modèles ORM — importés ici pour l'enregistrement dans Base.metadata."""
from app.models.antenne import Antenne
from app.models.centre import CentreTechnique
from app.models.fibre import Fibre
from app.models.journal import JournalAction
from app.models.region import Region
from app.models.utilisateur import Utilisateur

__all__ = ["Antenne", "CentreTechnique", "Fibre", "JournalAction", "Region", "Utilisateur"]
