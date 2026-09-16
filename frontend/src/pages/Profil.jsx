import { KeyRound, Mail, ShieldCheck, UserCircle2 } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import api, { messageErreur } from '../services/api'
import { useAuth } from '../hooks/useAuth.jsx'
import { Bouton, Champ, Entree } from '../components/ui/Formulaire.jsx'

export default function Profil() {
  const { utilisateur, setUtilisateur } = useAuth()
  const [nom, setNom] = useState(utilisateur?.nom || '')
  const [motActuel, setMotActuel] = useState('')
  const [nouveauMdp, setNouveauMdp] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [enCours, setEnCours] = useState(false)

  const majProfil = (ev) => {
    ev.preventDefault()
    if (nouveauMdp && nouveauMdp !== confirmation) {
      toast.error('Les mots de passe ne correspondent pas.')
      return
    }
    setEnCours(true)
    const donnees = { nom }
    if (nouveauMdp) {
      donnees.password = nouveauMdp
      donnees.mot_de_passe_actuel = motActuel
    }
    api
      .put('/api/auth/me', donnees)
      .then((r) => {
        toast.success('Profil mis à jour avec succès.')
        setUtilisateur(r.data)
        setMotActuel('')
        setNouveauMdp('')
        setConfirmation('')
      })
      .catch((e) => toast.error(messageErreur(e, 'La mise à jour a échoué.')))
      .finally(() => setEnCours(false))
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4 md:p-6">
      <div className="rounded-2xl bg-gradient-to-r from-art-navy to-art-navy2 p-6 text-white shadow-card">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 ring-2 ring-art-gold/50">
            <UserCircle2 size={34} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold">{utilisateur?.nom}</h2>
            <p className="text-sm text-white/70">{utilisateur?.email}</p>
            <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-art-gold">
              <ShieldCheck size={11} />
              {utilisateur?.role === 'ADMIN' ? 'Administrateur' : 'Agent SIG'}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-card">
        <h3 className="flex items-center gap-2 text-sm font-bold text-art-navy">
          <KeyRound size={16} className="text-art-green" /> Modifier mes informations
        </h3>
        <form onSubmit={majProfil} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Champ label="Nom complet" obligatoire>
              <Entree value={nom} onChange={(e) => setNom(e.target.value)} />
            </Champ>
            <Champ label="Email (non modifiable)">
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  disabled
                  value={utilisateur?.email || ''}
                  className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 pl-9 text-sm text-slate-400"
                />
              </div>
            </Champ>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="mb-3 text-xs font-semibold text-slate-500">
              Changer de mot de passe (optionnel)
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Champ label="Mot de passe actuel">
                <Entree type="password" value={motActuel} onChange={(e) => setMotActuel(e.target.value)} placeholder="••••••••" />
              </Champ>
              <Champ label="Nouveau mot de passe">
                <Entree type="password" value={nouveauMdp} onChange={(e) => setNouveauMdp(e.target.value)} placeholder="6 caractères min." />
              </Champ>
              <Champ label="Confirmation" erreur={confirmation && nouveauMdp !== confirmation ? 'Ne correspond pas' : null}>
                <Entree type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder="••••••••" />
              </Champ>
            </div>
          </div>

          <div className="flex justify-end">
            <Bouton type="submit" variante="vert" chargement={enCours}>
              Enregistrer les modifications
            </Bouton>
          </div>
        </form>
      </div>

      <div className="rounded-2xl bg-art-bg p-5 text-xs leading-relaxed text-slate-500 ring-1 ring-slate-200/70">
        <p className="font-semibold text-art-navy">À propos de la plateforme</p>
        <p className="mt-1.5">
          ART TELECOM GIS v1.0.0 — Plateforme SIG de cartographie et d'analyse des infrastructures
          de télécommunications. Backend FastAPI + PostgreSQL/PostGIS, frontend React + Leaflet.
          <br />
          <span className="font-semibold text-slate-600">Prototype académique</span> : les données
          de démonstration sont simulées et ne représentent pas des données officielles de l'ART.
        </p>
      </div>
    </div>
  )
}
