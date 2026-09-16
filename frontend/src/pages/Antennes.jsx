import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import {
  BadgeOperateur,
  BadgeStatut,
  BadgeTechno,
  DialogueConfirmation,
  Pagination,
  Modale,
} from '../components/ui/Composants.jsx'
import { Bouton, Champ, Entree, Selection } from '../components/ui/Formulaire.jsx'
import {
  BarreOutilsTableau,
  TableauGenerique,
  useTableauCRUD,
} from '../components/ui/TableauCRUD.jsx'
import { LIBELLES_STATUTS, STATUTS, TECHNOLOGIES } from '../utils/couleurs.js'

const FORM_VIDE = {
  nom: '', code: '', operateur: '', type: 'MACRO_CELL', technologie: '4G',
  statut: 'ACTIF', hauteur: '', puissance: '', date_installation: '',
  adresse: '', ville: '', region: '', latitude: '', longitude: '',
}

export default function Antennes() {
  const crud = useTableauCRUD({ route: '/api/antennes', nomEntite: 'Antenne' })
  const [form, setForm] = useState(FORM_VIDE)
  const [erreurs, setErreurs] = useState({})

  const ouvrirNouveau = () => {
    setForm(FORM_VIDE)
    setErreurs({})
    crud.setEnEdition(null)
    crud.setFormOuvert(true)
  }

  const ouvrirEdition = (item) => {
    setForm({
      ...item,
      hauteur: item.hauteur ?? '',
      puissance: item.puissance ?? '',
      date_installation: item.date_installation || '',
    })
    setErreurs({})
    crud.setEnEdition(item)
    crud.setFormOuvert(true)
  }

  const valider = () => {
    const e = {}
    if (!form.nom || form.nom.trim().length < 2) e.nom = 'Le nom est obligatoire (2 caractères min).'
    if (!form.operateur) e.operateur = "L'opérateur est obligatoire."
    if (!form.technologie) e.technologie = 'La technologie est obligatoire.'
    if (!form.statut) e.statut = 'Le statut est obligatoire.'
    if (!form.ville || form.ville.trim().length < 2) e.ville = 'La ville est obligatoire.'
    if (!form.region) e.region = 'La région est obligatoire.'
    if (!form.code || !form.code.trim()) e.code = 'Le code est obligatoire.'
    const lat = Number(form.latitude)
    const lng = Number(form.longitude)
    if (form.latitude === '' || Number.isNaN(lat) || lat < -90 || lat > 90)
      e.latitude = 'Latitude invalide (entre -90 et 90).'
    if (form.longitude === '' || Number.isNaN(lng) || lng < -180 || lng > 180)
      e.longitude = 'Longitude invalide (entre -180 et 180).'
    if (form.hauteur !== '' && (Number(form.hauteur) <= 0 || Number(form.hauteur) > 300))
      e.hauteur = 'Hauteur invalide (0 à 300 m).'
    setErreurs(e)
    return Object.keys(e).length === 0
  }

  const soumettre = (ev) => {
    ev.preventDefault()
    if (!valider()) return
    crud.enregistrer(
      {
        ...form,
        hauteur: form.hauteur === '' ? null : Number(form.hauteur),
        puissance: form.puissance === '' ? null : Number(form.puissance),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        date_installation: form.date_installation || null,
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
          libelleNouveau="Ajouter une antenne"
        />

        <TableauGenerique
          colonnes={['Nom / Code', 'Opérateur', 'Techno.', 'Statut', 'Ville', 'Région', 'Coordonnées', 'Installation']}
          items={crud.items}
          chargement={crud.chargement}
          lignes={(a) => [
            <td key="nom">
              <p className="font-semibold text-art-navy">{a.nom}</p>
              <p className="text-xs text-slate-400">{a.code}</p>
            </td>,
            <td key="op"><BadgeOperateur operateur={a.operateur} /></td>,
            <td key="tech"><BadgeTechno techno={a.technologie} /></td>,
            <td key="st"><BadgeStatut statut={a.statut} /></td>,
            <td key="ville" className="text-slate-600">{a.ville}</td>,
            <td key="region" className="text-slate-600">{a.region}</td>,
            <td key="geo" className="font-mono text-xs text-slate-500">
              {a.latitude.toFixed(4)}, {a.longitude.toFixed(4)}
            </td>,
            <td key="date" className="text-slate-500">{a.date_installation || '—'}</td>,
          ]}
          actions={(a) => [
            <td key="actions" className="text-right">
              <div className="inline-flex gap-1.5">
                <button
                  onClick={() => ouvrirEdition(a)}
                  title="Modifier"
                  className="rounded-lg bg-slate-100 p-2 text-slate-600 transition hover:bg-art-navy hover:text-white"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => crud.setASupprimer(a)}
                  title="Supprimer"
                  className="rounded-lg bg-slate-100 p-2 text-slate-600 transition hover:bg-art-red hover:text-white"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </td>,
          ]}
        />
        <Pagination
          page={crud.page}
          pages={crud.pages}
          total={crud.total}
          onPageChange={crud.setPage}
        />
      </div>

      {/* Formulaire */}
      <Modale
        ouvert={crud.formOuvert}
        onFermer={() => {
          crud.setFormOuvert(false)
          crud.setEnEdition(null)
        }}
        titre={crud.enEdition ? 'Modifier l' + "'" + 'antenne' : 'Ajouter une antenne relais'}
        taille="max-w-2xl"
      >
        <form onSubmit={soumettre} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Champ label="Nom du site" obligatoire erreur={erreurs.nom}>
            <Entree value={form.nom} onChange={(e) => majForm('nom', e.target.value)} placeholder="Site Yaoundé Centre-ville" erreur={erreurs.nom} />
          </Champ>
          <Champ label="Code unique" obligatoire erreur={erreurs.code}>
            <Entree value={form.code} onChange={(e) => majForm('code', e.target.value)} placeholder="ANT-CMT-0001" erreur={erreurs.code} />
          </Champ>
          <Champ label="Opérateur" obligatoire erreur={erreurs.operateur}>
            <Selection value={form.operateur} onChange={(e) => majForm('operateur', e.target.value)} erreur={erreurs.operateur}>
              <option value="">Sélectionner…</option>
              {(crud.filtresDisponibles?.operateurs || []).map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </Selection>
          </Champ>
          <Champ label="Technologie" obligatoire erreur={erreurs.technologie}>
            <Selection value={form.technologie} onChange={(e) => majForm('technologie', e.target.value)} erreur={erreurs.technologie}>
              {TECHNOLOGIES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Selection>
          </Champ>
          <Champ label="Type de site">
            <Selection value={form.type} onChange={(e) => majForm('type', e.target.value)}>
              {(crud.filtresDisponibles?.types || ['MACRO_CELL']).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Selection>
          </Champ>
          <Champ label="Statut" obligatoire erreur={erreurs.statut}>
            <Selection value={form.statut} onChange={(e) => majForm('statut', e.target.value)} erreur={erreurs.statut}>
              {STATUTS.map((s) => (
                <option key={s} value={s}>{LIBELLES_STATUTS[s]}</option>
              ))}
            </Selection>
          </Champ>
          <Champ label="Hauteur (m)" erreur={erreurs.hauteur}>
            <Entree type="number" step="0.1" value={form.hauteur} onChange={(e) => majForm('hauteur', e.target.value)} placeholder="45" erreur={erreurs.hauteur} />
          </Champ>
          <Champ label="Puissance (W)" erreur={erreurs.puissance}>
            <Entree type="number" step="0.1" value={form.puissance} onChange={(e) => majForm('puissance', e.target.value)} placeholder="40" erreur={erreurs.puissance} />
          </Champ>
          <Champ label="Latitude (WGS84)" obligatoire erreur={erreurs.latitude}>
            <Entree type="number" step="0.000001" value={form.latitude} onChange={(e) => majForm('latitude', e.target.value)} placeholder="3.8667" erreur={erreurs.latitude} />
          </Champ>
          <Champ label="Longitude (WGS84)" obligatoire erreur={erreurs.longitude}>
            <Entree type="number" step="0.000001" value={form.longitude} onChange={(e) => majForm('longitude', e.target.value)} placeholder="11.5217" erreur={erreurs.longitude} />
          </Champ>
          <Champ label="Ville" obligatoire erreur={erreurs.ville}>
            <Entree value={form.ville} onChange={(e) => majForm('ville', e.target.value)} placeholder="Yaoundé" erreur={erreurs.ville} />
          </Champ>
          <Champ label="Région" obligatoire erreur={erreurs.region}>
            <Selection value={form.region} onChange={(e) => majForm('region', e.target.value)} erreur={erreurs.region}>
              <option value="">Sélectionner…</option>
              {(crud.filtresDisponibles?.regions || []).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Selection>
          </Champ>
          <Champ label="Adresse">
            <Entree value={form.adresse || ''} onChange={(e) => majForm('adresse', e.target.value)} placeholder="Rue 12, Quartier du Centre" />
          </Champ>
          <Champ label="Date d'installation">
            <Entree type="date" value={form.date_installation || ''} onChange={(e) => majForm('date_installation', e.target.value)} />
          </Champ>
          <div className="col-span-full mt-2 flex justify-end gap-3">
            <Bouton type="button" variante="secondaire" onClick={() => crud.setFormOuvert(false)}>
              Annuler
            </Bouton>
            <Bouton type="submit" variante="vert" chargement={crud.enregistrement}>
              {crud.enEdition ? 'Enregistrer les modifications' : 'Créer l' + "'" + 'antenne'}
            </Bouton>
          </div>
        </form>
      </Modale>

      <DialogueConfirmation
        ouvert={crud.aSupprimer !== null}
        onFermer={() => crud.setASupprimer(null)}
        onConfirmer={crud.supprimer}
        titre="Supprimer l'antenne"
        message={`Confirmez-vous la suppression de l'antenne « ${crud.aSupprimer?.nom} » (${crud.aSupprimer?.code}) ? Cette action est définitive et journalisée.`}
        chargement={crud.suppressionEnCours}
      />
    </div>
  )
}
