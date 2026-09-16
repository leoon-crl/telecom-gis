/** Page générique de gestion CRUD (tableau + filtres + formulaire + suppression). */
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api, { messageErreur, telechargerFichier } from '../../services/api'
import {
  DialogueConfirmation,
  EtatVide,
  Modale,
  Pagination,
} from './Composants.jsx'
import { Bouton } from './Formulaire.jsx'
import { Loader2, PlusCircle, RefreshCw } from 'lucide-react'

export function useTableauCRUD({ route, nomEntite, article = 'a' }) {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [filtres, setFiltres] = useState({})
  const [recherche, setRecherche] = useState('')
  const [tri, setTri] = useState({ colonne: 'nom', ordre: 'asc' })
  const [chargement, setChargement] = useState(true)
  const [filtresDisponibles, setFiltresDisponibles] = useState(null)

  const [formOuvert, setFormOuvert] = useState(false)
  const [enEdition, setEnEdition] = useState(null)
  const [enregistrement, setEnregistrement] = useState(false)
  const [aSupprimer, setASupprimer] = useState(null)
  const [suppressionEnCours, setSuppressionEnCours] = useState(false)

  const charger = useCallback(() => {
    setChargement(true)
    const params = {
      page,
      size: 15,
      recherche,
      sort_by: tri.colonne,
      sort_order: tri.ordre,
      ...filtres,
    }
    api
      .get(route, { params })
      .then((r) => {
        setItems(r.data.items)
        setTotal(r.data.total)
        setPages(r.data.pages)
      })
      .catch(() => toast.error(`Impossible de charger les ${nomEntite}.`))
      .finally(() => setChargement(false))
  }, [route, page, recherche, tri, filtres, nomEntite])

  useEffect(charger, [charger])

  useEffect(() => {
    api
      .get(`${route}/filtres`)
      .then((r) => setFiltresDisponibles(r.data))
      .catch(() => {})
  }, [route])

  const enregistrer = async (donnees, id) => {
    setEnregistrement(true)
    try {
      if (id) {
        await api.put(`${route}/${id}`, donnees)
        toast.success(
          `${nomEntite} ${article === 'a' ? 'modifiée' : 'modifié'} avec succès.`
        )
      } else {
        await api.post(route, donnees)
        toast.success(
          `${nomEntite} ${article === 'a' ? 'créée' : 'créé'} avec succès.`
        )
      }
      setFormOuvert(false)
      setEnEdition(null)
      charger()
      return true
    } catch (e) {
      const detail = e.response?.data?.detail
      if (Array.isArray(detail)) {
        toast.error(detail.map((d) => `${d.loc.join('.')}: ${d.msg}`).join(' | '))
      } else if (typeof detail === 'string') {
        toast.error(detail)
      } else {
        toast.error(messageErreur(e, "Échec de l'enregistrement."))
      }
      return false
    } finally {
      setEnregistrement(false)
    }
  }

  const supprimer = async () => {
    if (!aSupprimer) return
    setSuppressionEnCours(true)
    try {
      await api.delete(`${route}/${aSupprimer.id}`)
      toast.success(
        `${nomEntite} ${article === 'a' ? 'supprimée' : 'supprimé'} avec succès.`
      )
      setASupprimer(null)
      charger()
    } catch {
      toast.error(`Impossible de supprimer ${article === 'a' ? 'cette' : 'ce'} ${nomEntite}.`)
    } finally {
      setSuppressionEnCours(false)
    }
  }

  const exporter = async (format) => {
    try {
      const extension = format === 'geojson' ? 'geojson' : 'csv'
      await telechargerFichier(
        `${route.replace('/api/', '/api/export/')}`,
        { format, ...filtres },
        `${nomEntite.toLowerCase().replace(/\s+/g, '_')}_art.${extension}`
      )
      toast.success(`Export ${format.toUpperCase()} téléchargé.`)
    } catch {
      toast.error("L'export a échoué.")
    }
  }

  return {
    items, total, pages, page, setPage, filtres, setFiltres, recherche, setRecherche,
    tri, setTri, chargement, filtresDisponibles,
    formOuvert, setFormOuvert, enEdition, setEnEdition,
    enregistrer, enregistrement,
    aSupprimer, setASupprimer, supprimer, suppressionEnCours,
    exporter, charger,
  }
}

export function BarreOutilsTableau({
  recherche, setRecherche, filtres, setFiltres, filtresDisponibles,
  tri, setTri, onNouveau, onExporter, onRafraichir, libelleNouveau,
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <input
          value={recherche}
          onChange={(e) => {
            setRecherche(e.target.value)
            setPage(1)
          }}
          placeholder="Rechercher (nom, code, ville…)"
          className="min-w-[220px] flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-art-navy focus:ring-2 focus:ring-art-navy/25"
        />
        <Bouton onClick={onNouveau} variante="vert" className="shrink-0">
          <PlusCircle size={16} /> {libelleNouveau}
        </Bouton>
        <button
          onClick={onRafraichir}
          title="Rafraîchir"
          className="rounded-xl bg-white p-2.5 text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {Object.entries(filtresDisponibles || {})
          .filter(([cle]) => Array.isArray(filtresDisponibles[cle]))
          .slice(0, 4)
          .map(([cle, valeurs]) => (
            <select
              key={cle}
              value={filtres[cle] || ''}
              onChange={(e) => {
                setFiltres({ ...filtres, [cle]: e.target.value })
                setPage(1)
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 outline-none focus:border-art-navy"
            >
              <option value="">{cle === 'operateurs' ? 'Opérateur' : cle === 'technologies' ? 'Technologie' : cle === 'statuts' ? 'Statut' : cle === 'regions' ? 'Région' : cle === 'villes' ? 'Ville' : cle === 'types' ? 'Type' : cle === 'capacites' ? 'Capacité' : cle} — tous</option>
              {valeurs.map((v) => (
                <option key={v} value={v}>
                  {String(v)}
                </option>
              ))}
            </select>
          ))}

        <select
          value={`${tri.colonne}:${tri.ordre}`}
          onChange={(e) => {
            const [colonne, ordre] = e.target.value.split(':')
            setTri({ colonne, ordre })
          }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 outline-none focus:border-art-navy"
        >
          <option value="nom:asc">Trier : Nom A→Z</option>
          <option value="nom:desc">Trier : Nom Z→A</option>
          {filtresDisponibles?.trisPossibles?.map((c) => (
            <option key={c} value={`${c}:asc`}>{`Trier : ${c} croissant`}</option>
          ))}
          {filtresDisponibles?.trisPossibles?.map((c) => (
            <option key={`${c}-d`} value={`${c}:desc`}>{`Trier : ${c} décroissant`}</option>
          ))}
        </select>

        <div className="ml-auto flex gap-2">
          <button
            onClick={() => onExporter('csv')}
            className="rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-art-navy ring-1 ring-slate-200 transition hover:bg-art-bg"
          >
            Export CSV
          </button>
          <button
            onClick={() => onExporter('geojson')}
            className="rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-art-navy ring-1 ring-slate-200 transition hover:bg-art-bg"
          >
            Export GeoJSON
          </button>
        </div>
      </div>
    </div>
  )
}

export function TableauGenerique({ colonnes, items, chargement, lignes, actions }) {
  if (chargement) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 size={28} className="animate-spin" />
      </div>
    )
  }
  if (items.length === 0) {
    return <EtatVide titre="Aucun résultat" texte="Modifiez vos filtres ou ajoutez une nouvelle entrée." />
  }
  return (
    <div className="overflow-x-auto">
      <table className="table-art w-full min-w-[900px]">
        <thead>
          <tr className="bg-art-bg/60">
            {colonnes.map((c) => (
              <th key={c}>{c}</th>
            ))}
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>{lignes(item).concat(actions(item))}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
