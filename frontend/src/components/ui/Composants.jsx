/** Composants UI partagés : KPI, badges, modales, pagination, états vides, loaders. */
import { AlertTriangle, Inbox, Loader2, X } from 'lucide-react'
import { LIBELLES_STATUTS } from '../../utils/couleurs.js'

export function KpiCard({ titre, valeur, sousTitre, icone: Icone, couleur = '#00843D', chargement }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-card transition-shadow hover:shadow-panel">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-500">
            {titre}
          </p>
          {chargement ? (
            <div className="mt-2 h-8 w-20 animate-pulse rounded-lg bg-slate-200" />
          ) : (
            <p className="mt-1 text-3xl font-extrabold tracking-tight text-art-navy">
              {valeur}
            </p>
          )}
          {sousTitre && <p className="mt-1 truncate text-xs text-slate-400">{sousTitre}</p>}
        </div>
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${couleur}18`, color: couleur }}
        >
          <Icone size={24} />
        </div>
      </div>
    </div>
  )
}

export function BadgeStatut({ statut }) {
  const styles = {
    ACTIF: 'bg-green-100 text-green-800',
    MAINTENANCE: 'bg-amber-100 text-amber-800',
    PROJET: 'bg-indigo-100 text-indigo-700',
    HORS_SERVICE: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`badge ${styles[statut] || 'bg-slate-100 text-slate-600'}`}>
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: statut === 'ACTIF' ? '#16A34A' : statut === 'MAINTENANCE' ? '#F59E0B' : statut === 'PROJET' ? '#6366F1' : '#EF3340' }}
      />
      {LIBELLES_STATUTS[statut] || statut}
    </span>
  )
}

export function BadgeTechno({ techno }) {
  const styles = {
    '5G': 'bg-art-navy text-white',
    '4G': 'bg-art-navy2 text-white',
    '3G': 'bg-slate-200 text-art-navy',
    '2G': 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
  }
  return <span className={`badge ${styles[techno] || 'bg-slate-100'}`}>{techno}</span>
}

export function BadgeOperateur({ operateur }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className="h-2.5 w-2.5 rounded-full bg-art-green" data-operateur={operateur} />
      {operateur}
    </span>
  )
}

export function Modale({ ouvert, onFermer, titre, children, taille = 'max-w-lg' }) {
  if (!ouvert) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-art-navy/60 backdrop-blur-sm" onClick={onFermer} />
      <div
        className={`fade-up relative w-full ${taille} max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-panel`}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <h3 className="text-lg font-bold text-art-navy">{titre}</h3>
          <button
            onClick={onFermer}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

export function DialogueConfirmation({ ouvert, onFermer, onConfirmer, titre, message, chargement }) {
  if (!ouvert) return null
  return (
    <Modale ouvert={ouvert} onFermer={onFermer} titre={titre} taille="max-w-md">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-art-red">
          <AlertTriangle size={22} />
        </div>
        <p className="text-sm leading-relaxed text-slate-600">{message}</p>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onFermer} className="bouton-secondaire">
          Annuler
        </button>
        <button onClick={onConfirmer} disabled={chargement} className="bouton-danger">
          {chargement && <Loader2 size={16} className="animate-spin" />}
          Confirmer la suppression
        </button>
      </div>
    </Modale>
  )
}

export function Chargement({ texte = 'Chargement…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
      <Loader2 size={30} className="animate-spin text-art-navy" />
      <p className="text-sm">{texte}</p>
    </div>
  )
}

export function EtatVide({ titre = 'Aucune donnée', texte = 'Aucun résultat ne correspond à votre recherche.' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Inbox size={26} />
      </div>
      <p className="text-sm font-semibold text-slate-600">{titre}</p>
      <p className="max-w-sm text-xs text-slate-400">{texte}</p>
    </div>
  )
}

export function Pagination({ page, pages, total, onPageChange }) {
  if (pages <= 1) return null
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
      <p className="text-xs text-slate-500">
        Page <span className="font-semibold text-art-navy">{page}</span> sur {pages} —{' '}
        {total} résultat{total > 1 ? 's' : ''}
      </p>
      <div className="flex gap-1.5">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Précédent
        </button>
        <button
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Suivant
        </button>
      </div>
    </div>
  )
}
