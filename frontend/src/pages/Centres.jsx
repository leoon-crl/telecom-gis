import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import {
  BadgeStatut,
  DialogueConfirmation,
  Modale,
  Pagination,
} from '../components/ui/Composants.jsx'
import { Bouton, Champ, Entree, Selection } from '../components/ui/Formulaire.jsx'
import {
  BarreOutilsTableau,
  TableauGenerique,
  useTableauCRUD,
} from '../components/ui/TableauCRUD.jsx'
import { LIBELLES_STATUTS, STATUTS } from '../utils/couleurs.js'

const FORM_VIDE = {
  nom: '', code: '', operateur: '', type: 'NŒUD DE COMMUTATION', statut: 'ACTIF',
  adresse: '', ville: '', region: '', capacite: '', latitude: '', longitude: '',
}

export default function Centres() {
  const crud = useTableauCRUD({ route: '/api/centres', nomEntite: 'Centre technique' })
  const [form, setForm] = useState(FORM_VIDE)
  const [erreurs, setErreurs] = useState({})

  const ouvrirNouveau = () => {
    setForm(FORM_VIDE)
    setErreurs({})
    crud.setEnEdition(null)
    crud.setFormOuvert(true)
  }

  const ouvrirEdition = (item) => {
    setForm({ ...item })
    setErreurs({})
    crud.setEnEdition(item)
    crud.setFormOuvert(true)
  }

  const valider = () => {
    const e = {}
    if (!form.nom || form.nom.trim().length < 2) e.nom = 'Le nom est obligatoire.'
    if (!form.code || !form.code.trim()) e.code = 'Le code est obligatoire.'
    if (!form.operateur) e.operateur = "L'opérateur est obligatoire."
    if (!form.statut) e.statut = 'Le statut est obligatoire.'
    if (!form.ville || form.ville.trim().length < 2) e.ville = 'La ville est obligatoire.'
    if (!form.region) e.region = 'La région est obligatoire.'
    const lat = Number(form.latitude)
    const lng = Number(form.longitude)
    if (form.latitude === '' || Number.isNaN(lat) || lat < -90 || lat > 90)
      e.latitude = 'Latitude invalide (entre -90 et 90).'
    if (form.longitude === '' || Number.isNaN(lng) || lng < -180 || lng > 180)
      e.longitude = 'Longitude invalide (entre -180 et 180).'
    setErreurs(e)
    return Object.keys(e).length === 0
  }

  const soumettre = (ev) => {
    ev.preventDefault()
    if (!valider()) return
    crud.enregistrer(
      {
        ...form,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
      },
      crud.enEdition?.id
    )
  }

  const majForm = (cle, valeur) => setForm((f) => ({ ...f, [cle]: valeur }))

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="rounded-2xl bg-white p-5 shadow-card">
        <BarreOutilsTableau
          recherche={crud.recherche}
          setRecherche={crud.setRecherche}
          filtres={crud.filtres}
          setFiltres={crud.setFiltres}
          filtresDisponibles={crud.filtresDisponibles}
          tri={crud.tri}
          setTri={crud.setTri}
          onNouveau={ouvrirNouveau}
          onExporter={crud.exporter}
          onRafraichir={crud.charger}
          libelleNouveau="Ajouter un centre"
        />

        <TableauGenerique
          colonnes={['Nom / Code', 'Opérateur', 'Type', 'Ville', 'Région', 'Capacité', 'Statut']}
          items={crud.items}
          chargement={crud.chargement}
          lignes={(c) => [
            <td key="nom">
              <p className="font-semibold text-art-navy">{c.nom}</p>
              <p className="text-xs text-slate-400">{c.code}</p>
            </td>,
            <td key="op" className="text-slate-600">{c.operateur}</td>,
            <td key="type" className="text-slate-600">{c.type}</td>,
            <td key="ville" className="text-slate-600">{c.ville}</td>,
            <td key="region" className="text-slate-600">{c.region}</td>,
            <td key="cap" className="text-slate-600">{c.capacite || '—'}</td>,
            <td key="st"><BadgeStatut statut={c.statut} /></td>,
          ]}
          actions={(c) => [
            <td key="actions" className="text-right">
              <div className="inline-flex gap-1.5">
                <button
                  onClick={() => ouvrirEdition(c)}
                  title="Modifier"
                  className="rounded-lg bg-slate-100 p-2 text-slate-600 transition hover:bg-art-navy hover:text-white"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => crud.setASupprimer(c)}
                  title="Supprimer"
                  className="rounded-lg bg-slate-100 p-2 text-slate-600 transition hover:bg-art-red hover:text-white"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </td>,
          ]}
        />
        <Pagination page={crud.page} pages={crud.pages} total={crud.total} onPageChange={crud.setPage} />
      </div>

      <Modale
        ouvert={crud.formOuvert}
        onFermer={() => {
          crud.setFormOuvert(false)
          crud.setEnEdition(null)
        }}
        titre={crud.enEdition ? 'Modifier le centre' : 'Ajouter un centre technique'}
        taille="max-w-2xl"
      >
        <form onSubmit={soumettre} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Champ label="Nom" obligatoire erreur={erreurs.nom}>
            <Entree value={form.nom} onChange={(e) => majForm('nom', e.target.value)} placeholder="Centre technique CAMTEL Douala" erreur={erreurs.nom} />
          </Champ>
          <Champ label="Code unique" obligatoire erreur={erreurs.code}>
            <Entree value={form.code} onChange={(e) => majForm('code', e.target.value)} placeholder="CT-CMT-001" erreur={erreurs.code} />
          </Champ>
          <Champ label="Opérateur" obligatoire erreur={erreurs.operateur}>
            <Selection value={form.operateur} onChange={(e) => majForm('operateur', e.target.value)} erreur={erreurs.operateur}>
              <option value="">Sélectionner…</option>
              {(crud.filtresDisponibles?.operateurs || []).map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </Selection>
          </Champ>
          <Champ label="Type">
            <Selection value={form.type} onChange={(e) => majForm('type', e.target.value)}>
              {(crud.filtresDisponibles?.types || ['NŒUD DE COMMUTATION']).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Selection>
          </Champ>
          <Champ label="Statut" obligatoire>
            <Selection value={form.statut} onChange={(e) => majForm('statut', e.target.value)}>
              {STATUTS.map((s) => (
                <option key={s} value={s}>{LIBELLES_STATUTS[s]}</option>
              ))}
            </Selection>
          </Champ>
          <Champ label="Capacité">
            <Entree value={form.capacite || ''} onChange={(e) => majForm('capacite', e.target.value)} placeholder="25 000 abonnés" />
          </Champ>
          <Champ label="Ville" obligatoire erreur={erreurs.ville}>
            <Entree value={form.ville} onChange={(e) => majForm('ville', e.target.value)} placeholder="Douala" erreur={erreurs.ville} />
          </Champ>
          <Champ label="Région" obligatoire erreur={erreurs.region}>
            <Selection value={form.region} onChange={(e) => majForm('region', e.target.value)} erreur={erreurs.region}>
              <option value="">Sélectionner…</option>
              {(crud.filtresDisponibles?.regions || []).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Selection>
          </Champ>
          <Champ label="Latitude (WGS84)" obligatoire erreur={erreurs.latitude}>
            <Entree type="number" step="0.000001" value={form.latitude} onChange={(e) => majForm('latitude', e.target.value)} placeholder="4.0483" erreur={erreurs.latitude} />
          </Champ>
          <Champ label="Longitude (WGS84)" obligatoire erreur={erreurs.longitude}>
            <Entree type="number" step="0.000001" value={form.longitude} onChange={(e) => majForm('longitude', e.target.value)} placeholder="9.7043" erreur={erreurs.longitude} />
          </Champ>
          <div className="col-span-full">
            <Champ label="Adresse">
              <Entree value={form.adresse || ''} onChange={(e) => majForm('adresse', e.target.value)} placeholder="Avenue de la Réunification, N°12" />
            </Champ>
          </div>
          <div className="col-span-full mt-2 flex justify-end gap-3">
            <Bouton type="button" variante="secondaire" onClick={() => crud.setFormOuvert(false)}>
              Annuler
            </Bouton>
            <Bouton type="submit" variante="vert" chargement={crud.enregistrement}>
              {crud.enEdition ? 'Enregistrer les modifications' : 'Créer le centre'}
            </Bouton>
          </div>
        </form>
      </Modale>

      <DialogueConfirmation
        ouvert={crud.aSupprimer !== null}
        onFermer={() => crud.setASupprimer(null)}
        onConfirmer={crud.supprimer}
        titre="Supprimer le centre"
        message={`Confirmez-vous la suppression du centre « ${crud.aSupprimer?.nom} » (${crud.aSupprimer?.code}) ? Cette action est définitive et journalisée.`}
        chargement={crud.suppressionEnCours}
      />
    </div>
  )
}
