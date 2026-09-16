/** Boutons et champs de formulaire avec styles ART (réutilisés dans tous les formulaires). */
import { Loader2 } from 'lucide-react'

export function Bouton({ children, variante = 'primaire', chargement, className = '', ...props }) {
  const styles = {
    primaire:
      'bg-art-navy text-white hover:bg-art-navy2 shadow-sm ring-1 ring-art-navy/20',
    vert: 'bg-art-green text-white hover:bg-art-green2 shadow-sm',
    danger: 'bg-art-red text-white hover:bg-art-red2 shadow-sm',
    secondaire:
      'bg-white text-art-navy ring-1 ring-slate-200 hover:bg-slate-50',
    or: 'bg-art-gold text-art-navy hover:brightness-105 shadow-sm',
  }
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${styles[variante]} ${className}`}
      disabled={chargement || props.disabled}
      {...props}
    >
      {chargement && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  )
}

export function Champ({ label, erreur, children, obligatoire }) {
  return (
    <div className="w-full">
      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label} {obligatoire && <span className="text-art-red">*</span>}
      </label>
      {children}
      {erreur && <p className="mt-1 text-xs font-medium text-art-red">{erreur}</p>}
    </div>
  )
}

export function Entree({ erreur, ...props }) {
  return (
    <input
      className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-art-navy/30 ${
        erreur ? 'border-art-red bg-red-50/40' : 'border-slate-200 bg-white focus:border-art-navy'
      }`}
      {...props}
    />
  )
}

export function Selection({ erreur, children, ...props }) {
  return (
    <select
      className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-art-navy/30 ${
        erreur ? 'border-art-red bg-red-50/40' : 'border-slate-200 focus:border-art-navy'
      }`}
      {...props}
    >
      {children}
    </select>
  )
}
