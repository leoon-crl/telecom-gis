import { useEffect, useState } from 'react'
import { CheckCircle2, History, Pencil, PlusCircle, ShieldCheck, Trash2, UserX, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api, { messageErreur } from '../services/api'
import {
  Chargement,
  DialogueConfirmation,
  Modale,
  Pagination,
} from '../components/ui/Composants.jsx'
import { Bouton, Champ, Entree, Selection } from '../components/ui/Formulaire.jsx'

const FORM_VIDE = { nom: '', email: '', role: 'AGENT', password: '', actif: true }

export default function Administration() {
  const [items, setItems] = useState([])
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [recherche, setRecherche] = useState('')
  const [chargement, setChargement] = useState(true)
  const [journal, setJournal] = useState([])

  const [formOuvert, setFormOuvert] = useState(false)
  const [enEdition, setEnEdition] = useState(null)
  const [form, setForm] = useState(FORM_VIDE)
  const [erreurs, setErreurs] = useState({})
  const [enregistrement, setEnregistrement] = useState(false)
  const [aSupprimer, setASupprimer] = useState(null)

  const charger = () => {
    setChargement(true)
    Promise.all([
      api.get('/api/utilisateurs', { params: { page, size: 15, recherche } }),
      api.get('/api/utilisateurs/journal/historique'),
    ])
      .then(([r1, r2]) => {
        setItems(r1.data.items)
        setPages(r1.data.pages)
        setJournal(r2.data)
      })
      .catch(() => toast.error('Impossible de charger les utilisateurs.'))
      .finally(() => setChargement(false))
  }

  useEffect(charger, [page, recherche])

  const ouvrirNouveau = () => {
    setForm(FORM_VIDE)
    setErreurs({})
    setEnEdition(null)
    setFormOuvert(true)
  }

  const ouvrirEdition = (u) => {
    setForm({ nom: u.nom, email: u.email, role: u.role, password: '', actif: u.actif })
    setErreurs({})
    setEnEdition(u)
    setFormOuvert(true)
  }

  const valider = () => {
    const e = {}
    if (!form.nom || form.nom.trim().length < 2) e.nom = 'Le nom est obligatoire.'
    if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Email invalide.'
    if (!enEdition && (!form.password || form.password.length < 6))
      e.password = 'Mot de passe obligatoire (6 caractères min).'
    if (enEdition && form.password && form.password.length < 6)
      e.password = 'Mot de passe trop court (6 caractères min).'
    setErreurs(e)
    return Object.keys(e).length === 0
  }

  const enregistrer = (ev) => {
    ev.preventDefault()
    if (!valider()) return
    setEnregistrement(true)
    const donnees = { nom: form.nom, email: form.email, role: form.role }
    if (form.password) donnees.password = form.password
    const requete = enEdition
      ? api.put(`/api/utilisateurs/${enEdition.id}`, donnees)
      : api.post('/api/utilisateurs', donnees)
    requete
      .then(() => {
        toast.success(enEdition ? 'Utilisateur modifié avec succès.' : 'Utilisateur créé avec succès.')
        setFormOuvert(false)
        charger()
      })
      .catch((e2) => toast.error(messageErreur(e2, "Échec de l'enregistrement.")))
      .finally(() => setEnregistrement(false))
  }

  const basculerActif = (u) => {
    api
      .put(`/api/utilisateurs/${u.id}`, { actif: !u.actif })
      .then(() => {
        toast.success(u.actif ? 'Compte désactivé.' : 'Compte activé.')
        charger()
      })
      .catch((e2) => toast.error(messageErreur(e2, 'Action impossible.')))
  }

  const changerRole = (u, role) => {
    api
      .put(`/api/utilisateurs/${u.id}`, { role })
      .then(() => {
        toast.success('Rôle mis à jour.')
        charger()
      })
      .catch((e2) => toast.error(messageErreur(e2, 'Action impossible.')))
  }

  const supprimer = () => {
    api
      .delete(`/api/utilisateurs/${aSupprimer.id}`)
      .then(() => {
        toast.success('Utilisateur supprimé.')
        setASupprimer(null)
        charger()
      })
      .catch((e2) => toast.error(messageErreur(e2, 'Suppression impossible.')))
  }

  const COULEURS_JOURNAL = {
    CREATION: 'bg-green-100 text-green-800',
    MODIFICATION: 'bg-blue-100 text-blue-700',
    SUPPRESSION: 'bg-red-100 text-red-700',
    IMPORT_CSV: 'bg-amber-100 text-amber-700',
    IMPORT_GEOJSON: 'bg-amber-100 text-amber-700',
    CONNEXION: 'bg-slate-100 text-slate-600',
  }

  return (
    <div className="grid gap-5 p-4 md:p-6 xl:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <div className="rounded-2xl bg-white p-5 shadow-card">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-art-navy">
                <ShieldCheck size={17} className="text-art-green" /> Gestion des utilisateurs
              </h3>
              <p className="text-xs text-slate-400">
                Accès réservé aux administrateurs — création, rôles, activation, suppression.
              </p>
            </div>
            <div className="flex gap-2">
              <input
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher un utilisateur…"
                className="w-48 rounded-xl border border-slate-200 px-3.5 py-2 text-xs outline-none focus:border-art-navy"
              />
              <Bouton onClick={ouvrirNouveau} variante="vert" className="px-3 py-2 text-xs">
                <PlusCircle size={15} /> Créer
              </Bouton>
            </div>
          </div>

          {chargement ? (
            <Chargement />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table-art w-full min-w-[680px]">
                  <thead>
                    <tr className="bg-art-bg/60">
                      <th>Utilisateur</th><th>Rôle</th><th>Statut</th><th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <p className="font-semibold text-art-navy">{u.nom}</p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </td>
                        <td>
                          <select
                            value={u.role}
                            onChange={(e) => changerRole(u, e.target.value)}
                            className={`rounded-lg px-2 py-1.5 text-xs font-bold outline-none ${
                              u.role === 'ADMIN' ? 'bg-art-navy text-white' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="AGENT">AGENT</option>
                          </select>
                        </td>
                        <td>
                          <button onClick={() => basculerActif(u)} className={`badge ${u.actif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                            {u.actif ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                            {u.actif ? 'Actif' : 'Désactivé'}
                          </button>
                        </td>
                        <td className="text-right">
                          <div className="inline-flex gap-1.5">
                            <button
                              onClick={() => ouvrirEdition(u)}
                              className="rounded-lg bg-slate-100 p-2 text-slate-600 transition hover:bg-art-navy hover:text-white"
                              title="Modifier"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => basculerActif(u)}
                              className="rounded-lg bg-slate-100 p-2 text-slate-600 transition hover:bg-amber-500 hover:text-white"
                              title={u.actif ? 'Désactiver' : 'Activer'}
                            >
                              <UserX size={13} />
                            </button>
                            <button
                              onClick={() => setASupprimer(u)}
                              className="rounded-lg bg-slate-100 p-2 text-slate-600 transition hover:bg-art-red hover:text-white"
                              title="Supprimer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} pages={pages} total={items.length} onPageChange={setPage} />
            </>
          )}
        </div>
      </div>

      {/* Journal des actions sensibles */}
      <div className="rounded-2xl bg-white p-5 shadow-card">
        <h3 className="flex items-center gap-2 text-sm font-bold text-art-navy">
          <History size={16} className="text-art-gold" /> Journal des actions sensibles
        </h3>
        <p className="mt-1 text-xs text-slate-400">50 dernières actions (imports, suppressions, connexions…)</p>
        <ul className="mt-4 max-h-[560px] space-y-2 overflow-y-auto pr-1">
          {journal.length === 0 && <p className="py-6 text-center text-xs text-slate-400">Aucune action journalisée.</p>}
          {journal.map((a) => (
            <li key={a.id} className="rounded-xl bg-art-bg p-3">
              <div className="flex items-center justify-between gap-2">
                <span className={`badge ${COULEURS_JOURNAL[a.action] || 'bg-slate-100 text-slate-600'}`}>
                  {a.action}
                </span>
                <span className="text-[10px] text-slate-400">
                  {a.date ? new Date(a.date).toLocaleString('fr-FR') : ''}
                </span>
              </div>
              <p className="mt-1.5 truncate text-[11px] font-semibold text-art-navy">{a.details}</p>
              <p className="text-[10px] text-slate-400">{a.utilisateur} · {a.entite}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* Formulaire utilisateur */}
      <Modale
        ouvert={formOuvert}
        onFermer={() => setFormOuvert(false)}
        titre={enEdition ? "Modifier l'utilisateur" : 'Créer un utilisateur'}
        taille="max-w-md"
      >
        <form onSubmit={enregistrer} className="space-y-4">
          <Champ label="Nom complet" obligatoire erreur={erreurs.nom}>
            <Entree value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Marie Ngo" erreur={erreurs.nom} />
          </Champ>
          <Champ label="Email" obligatoire erreur={erreurs.email}>
            <Entree type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="marie.ngo@art.cm" erreur={erreurs.email} />
          </Champ>
          <Champ label="Rôle">
            <Selection value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="AGENT">AGENT — consultation et analyses</option>
              <option value="ADMIN">ADMIN — gestion complète</option>
            </Selection>
          </Champ>
          <Champ
            label={enEdition ? 'Nouveau mot de passe (laisser vide pour conserver)' : 'Mot de passe'}
            obligatoire={!enEdition}
            erreur={erreurs.password}
          >
            <Entree
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              erreur={erreurs.password}
            />
          </Champ>
          <div className="flex justify-end gap-3 pt-2">
            <Bouton type="button" variante="secondaire" onClick={() => setFormOuvert(false)}>
              Annuler
            </Bouton>
            <Bouton type="submit" variante="vert" chargement={enregistrement}>
              {enEdition ? 'Enregistrer' : "Créer l'utilisateur"}
            </Bouton>
          </div>
        </form>
      </Modale>

      <DialogueConfirmation
        ouvert={aSupprimer !== null}
        onFermer={() => setASupprimer(null)}
        onConfirmer={supprimer}
        titre="Supprimer l'utilisateur"
        message={`Confirmez-vous la suppression du compte « ${aSupprimer?.email} » ? Cette action est définitive.`}
      />
    </div>
  )
}
