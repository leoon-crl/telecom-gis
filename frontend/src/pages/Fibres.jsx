import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import {
  DialogueConfirmation,
  Modale,
  Pagination,
} from '../components/ui/Composants.jsx'
import { BadgeStatut } from '../components/ui/Composants.jsx'
import { Bouton, Champ, Entree, Selection } from '../components/ui/Formulaire.jsx'
import {
  BarreOutilsTableau,
  TableauGenerique,
  useTableauCRUD,
} from '../components/ui/TableauCRUD.jsx'
import { LIBELLES_STATUTS, STATUTS } from '../utils/couleurs.js'

const FORM_VIDE = {
  nom: '', code: '', operateur: '', type: 'SOUTERRAIN', capacite: '',
  statut: 'ACTIF', longueur: '', date_installation: '', origine: '',
  destination: '', coordonnees: '',
}

/** Mini-cartographie d'aperçu du tracé saisie (Leaflet). */
function ApercuTraces({ coordonnees }) {
  if (!coordonnees || coordonnees.length < 2) return null
  const points = coordonnees.map(([lng, lat]) => [lat, lng])
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
      <iframe
        title="Aperçu du tracé"
        width="100%"
        height="150"
        frameBorder="0"
        style={{ border: 0 }}
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${Math.min(...coordonnees.map((c) => c[0])) - 0.1},${Math.min(...coordonnees.map((c) => c[1])) - 0.1},${Math.max(...coordonnees.map((c) => c[0])) + 0.1},${Math.max(...coordonnees.map((c) => c[1])) + 0.1}&layer=mapnik&marker=${points[0][0]},${points[0][1]}`}
      />
    </div>
  )
}

export default function Fibres() {
  const crud = useTableauCRUD({ route: '/api/fibres', nomEntite: 'Tronçon de fibre', article: '' })
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
      longueur: item.longueur ?? '',
      date_installation: item.date_installation || '',
      coordonnees: item.coordonnees ? JSON.stringify(item.coordonnees) : '',
    })
    setErreurs({})
    crud.setEnEdition(item)
    crud.setFormOuvert(true)
  }

  let coordsAnalysees = null
  let erreurCoords = null
  if (form.coordonnees && form.coordonnees.trim()) {
    try {
      const v = JSON.parse(form.coordonnees)
      if (
        Array.isArray(v) &&
        v.length >= 2 &&
        v.every((c) => Array.isArray(c) && c.length >= 2 && Number.isFinite(Number(c[0])) && Number.isFinite(Number(c[1])))
      ) {
        coordsAnalysees = v.map((c) => [Number(c[0]), Number(c[1])])
      } else {
        erreurCoords = 'Format attendu : [[longitude, latitude], …] avec au moins 2 points.'
      }
    } catch {
      erreurCoords = 'JSON invalide. Exemple : [[9.70, 4.04], [11.52, 3.86]]'
    }
  }

  const valider = () => {
    const e = {}
    if (!form.nom || form.nom.trim().length < 2) e.nom = 'Le nom est obligatoire.'
    if (!form.code || !form.code.trim()) e.code = 'Le code est obligatoire.'
    if (!form.operateur) e.operateur = "L'opérateur est obligatoire."
    if (!form.origine) e.origine = "L'origine est obligatoire."
    if (!form.destination) e.destination = 'La destination est obligatoire.'
    if (!coordsAnalysees)
      e.coordonnees = erreurCoords || 'Tracé obligatoire : au moins 2 points [longitude, latitude].'
    setErreurs(e)
    return Object.keys(e).length === 0
  }

  const soumettre = (ev) => {
    ev.preventDefault()
    if (!valider()) return
    crud.enregistrer(
      {
        nom: form.nom,
        code: form.code,
        operateur: form.operateur,
        type: form.type,
        capacite: form.capacite || null,
        statut: form.statut,
        longueur: form.longueur === '' ? null : Number(form.longueur),
        date_installation: form.date_installation || null,
        origine: form.origine,
        destination: form.destination,
        coordonnees: coordsAnalysees,
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
          libelleNouveau="Ajouter un tronçon"
        />

        <TableauGenerique
          colonnes={['Nom / Code', 'Opérateur', 'Tracé', 'Longueur', 'Capacité', 'Type', 'Statut']}
          items={crud.items}
          chargement={crud.chargement}
          lignes={(f) => [
            <td key="nom">
              <p className="font-semibold text-art-navy">{f.nom}</p>
              <p className="text-xs text-slate-400">{f.code}</p>
            </td>,
            <td key="op" className="text-slate-600">{f.operateur}</td>,
            <td key="trace" className="text-slate-600">
              {f.origine} <span className="text-art-gold">→</span> {f.destination}
            </td>,
            <td key="l" className="font-semibold text-art-navy">
              {f.longueur ? `${Number(f.longueur).toLocaleString('fr-FR')} km` : '—'}
            </td>,
            <td key="cap" className="text-slate-600">{f.capacite || '—'}</td>,
            <td key="type" className="text-slate-500">{f.type}</td>,
            <td key="st"><BadgeStatut statut={f.statut} /></td>,
          ]}
          actions={(f) => [
            <td key="actions" className="text-right">
              <div className="inline-flex gap-1.5">
                <button
                  onClick={() => ouvrirEdition(f)}
                  title="Modifier"
                  className="rounded-lg bg-slate-100 p-2 text-slate-600 transition hover:bg-art-navy hover:text-white"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => crud.setASupprimer(f)}
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
        titre={crud.enEdition ? 'Modifier le tronçon' : 'Ajouter un tronçon de fibre'}
        taille="max-w-2xl"
      >
        <form onSubmit={soumettre} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Champ label="Nom" obligatoire erreur={erreurs.nom}>
            <Entree value={form.nom} onChange={(e) => majForm('nom', e.target.value)} placeholder="Backbone Douala – Yaoundé" erreur={erreurs.nom} />
          </Champ>
          <Champ label="Code unique" obligatoire erreur={erreurs.code}>
            <Entree value={form.code} onChange={(e) => majForm('code', e.target.value)} placeholder="FIB-CMT-001" erreur={erreurs.code} />
          </Champ>
          <Champ label="Opérateur" obligatoire erreur={erreurs.operateur}>
            <Selection value={form.operateur} onChange={(e) => majForm('operateur', e.target.value)} erreur={erreurs.operateur}>
              <option value="">Sélectionner…</option>
              {(crud.filtresDisponibles?.operateurs || []).map((o) => (
                <option key={o} value={o}>{o}</option>
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
          <Champ label="Origine" obligatoire erreur={erreurs.origine}>
            <Entree value={form.origine} onChange={(e) => majForm('origine', e.target.value)} placeholder="Douala" erreur={erreurs.origine} />
          </Champ>
          <Champ label="Destination" obligatoire erreur={erreurs.destination}>
            <Entree value={form.destination} onChange={(e) => majForm('destination', e.target.value)} placeholder="Yaoundé" erreur={erreurs.destination} />
          </Champ>
          <Champ label="Type de pose">
            <Selection value={form.type} onChange={(e) => majForm('type', e.target.value)}>
              {(crud.filtresDisponibles?.types || ['SOUTERRAIN']).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Selection>
          </Champ>
          <Champ label="Capacité">
            <Selection value={form.capacite || ''} onChange={(e) => majForm('capacite', e.target.value)}>
              <option value="">Non précisée</option>
              {(crud.filtresDisponibles?.capacites || []).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Selection>
          </Champ>
          <Champ label="Longueur (km)" erreur={erreurs.longueur}>
            <Entree type="number" step="0.01" value={form.longueur} onChange={(e) => majForm('longueur', e.target.value)} placeholder="Calculée automatiquement si vide" erreur={erreurs.longueur} />
          </Champ>
          <Champ label="Date d'installation">
            <Entree type="date" value={form.date_installation || ''} onChange={(e) => majForm('date_installation', e.target.value)} />
          </Champ>

          <div className="col-span-full">
            <Champ
              label="Tracé (coordonnées GeoJSON : [[longitude, latitude], …])"
              obligatoire
              erreur={erreurs.coordonnees}
            >
              <textarea
                rows={4}
                value={form.coordonnees}
                onChange={(e) => majForm('coordonnees', e.target.value)}
                placeholder='[[9.7043, 4.0483], [10.1, 3.95], [11.5217, 3.8667]]'
                className={`w-full rounded-xl border px-3.5 py-2.5 font-mono text-xs outline-none transition focus:ring-2 focus:ring-art-navy/30 ${
                  erreurs.coordonnees ? 'border-art-red bg-red-50/40' : 'border-slate-200 focus:border-art-navy'
                }`}
              />
            </Champ>
            {coordsAnalysees && (
              <div className="mt-2.5">
                <ApercuTraces coordonnees={coordsAnalysees} />
                <p className="mt-1 text-[10px] text-slate-400">
                  {coordsAnalysees.length} points — la longueur PostGIS (ST_Length) sera calculée si le champ est vide.
                </p>
              </div>
            )}
          </div>

          <div className="col-span-full mt-2 flex justify-end gap-3">
            <Bouton type="button" variante="secondaire" onClick={() => crud.setFormOuvert(false)}>
              Annuler
            </Bouton>
            <Bouton type="submit" variante="vert" chargement={crud.enregistrement}>
              {crud.enEdition ? 'Enregistrer les modifications' : 'Créer le tronçon'}
            </Bouton>
          </div>
        </form>
      </Modale>

      <DialogueConfirmation
        ouvert={crud.aSupprimer !== null}
        onFermer={() => crud.setASupprimer(null)}
        onConfirmer={crud.supprimer}
        titre="Supprimer le tronçon"
        message={`Confirmez-vous la suppression du tronçon « ${crud.aSupprimer?.nom} » (${crud.aSupprimer?.code}) ? Cette action est définitive et journalisée.`}
        chargement={crud.suppressionEnCours}
      />
    </div>
  )
}
