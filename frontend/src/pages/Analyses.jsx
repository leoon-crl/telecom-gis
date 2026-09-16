import { Cable, Crosshair, Loader2, MapPin, MoveHorizontal, Radio } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { MapContainer, Marker, Polygon, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import api from '../services/api'
import { EtatVide } from '../components/ui/Composants.jsx'
import { Bouton, Champ, Entree, Selection } from '../components/ui/Formulaire.jsx'
import { CENTRE_CAMEROUN, ZOOM_CAMEROUN } from '../utils/couleurs.js'
import { iconeResultat } from '../components/map/icones.js'
import 'leaflet/dist/leaflet.css'

function Ajuster(bounds) {
  return function Composant() {
    const map = useMap()
    useEffect(() => {
      if (bounds) map.fitBounds(bounds, { padding: [30, 30] })
    }, [bounds, map])
    return null
  }
}

const ONGLETS = [
  { cle: 'distance', libelle: 'Calcul de distance', icone: MoveHorizontal },
  { cle: 'couverture', libelle: 'Zone de couverture', icone: Radio },
  { cle: 'recherche', libelle: 'Recherche spatiale', icone: MapPin },
  { cle: 'proximite', libelle: 'Analyse de proximité', icone: Crosshair },
]

function MiniCarte({ children, bounds }) {
  const ComposantAjuster = bounds ? Ajuster(bounds) : () => null
  return (
    <MapContainer
      center={CENTRE_CAMEROUN}
      zoom={ZOOM_CAMEROUN}
      className="h-72 w-full rounded-xl"
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        attribution="Tiles &copy; Esri"
      />
      <ComposantAjuster />
      {children}
    </MapContainer>
  )
}

function Resume({ titre, valeur, couleur }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-card ring-1 ring-slate-100">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{titre}</p>
      <p className="mt-1 text-2xl font-extrabold" style={{ color: couleur }}>
        {valeur}
      </p>
    </div>
  )
}

/* ─────────────────── Onglet Distance ─────────────────── */
function OngletDistance() {
  const [antennes, setAntennes] = useState([])
  const [centres, setCentres] = useState([])
  const [typeA, setTypeA] = useState('antenne')
  const [idA, setIdA] = useState('')
  const [typeB, setTypeB] = useState('antenne')
  const [idB, setIdB] = useState('')
  const [res, setRes] = useState(null)
  const [chargement, setChargement] = useState(false)

  useEffect(() => {
    api.get('/api/antennes/carte').then((r) => setAntennes(r.data.features.map((f) => f.properties)))
    api.get('/api/centres/carte').then((r) => setCentres(r.data.features.map((f) => f.properties)))
  }, [])

  const calculer = () => {
    if (!idA || !idB) return toast.error('Sélectionnez les deux infrastructures.')
    setChargement(true)
    api
      .get('/api/analyses/distance', { params: { type_a: typeA, id_a: idA, type_b: typeB, id_b: idB } })
      .then((r) => setRes(r.data))
      .catch(() => toast.error('Le calcul a échoué.'))
      .finally(() => setChargement(false))
  }

  const liste = (t) => (t === 'antenne' ? antennes : centres)

  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <div className="rounded-2xl bg-white p-5 shadow-card">
        <h3 className="text-sm font-bold text-art-navy">Sélection des infrastructures</h3>
        <p className="mt-1 text-xs text-slate-400">
          Distance géodésique calculée par PostGIS avec le type geography (résultat métrique WGS84).
        </p>
        {[['A', typeA, setTypeA, idA, setIdA], ['B', typeB, setTypeB, idB, setIdB]].map(
          ([cle, type, setType, id, setId]) => (
            <div key={cle} className="mt-3 grid grid-cols-[80px_1fr] items-end gap-2">
              <Champ label={`Point ${cle}`}>
                <Selection value={type} onChange={(e) => { setType(e.target.value); setId('') }}>
                  <option value="antenne">Antenne</option>
                  <option value="centre">Centre</option>
                </Selection>
              </Champ>
              <Champ label="Infrastructure">
                <Selection value={id} onChange={(e) => setId(e.target.value)}>
                  <option value="">Sélectionner…</option>
                  {liste(type).map((x) => (
                    <option key={x.id} value={x.id}>{x.nom}</option>
                  ))}
                </Selection>
              </Champ>
            </div>
          )
        )}
        <Bouton onClick={calculer} chargement={chargement} variante="vert" className="mt-4 w-full">
          Calculer la distance
        </Bouton>
      </div>

      <div className="space-y-4">
        {res ? (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Resume titre="Distance" valeur={`${res.distance_km.toLocaleString('fr-FR')} km`} couleur="#00843D" />
              <Resume titre="Mètres" valeur={res.distance_m.toLocaleString('fr-FR') + ' m'} couleur="#1B4480" />
              <Resume titre="Méthode" valeur="ST_Distance" couleur="#F2B705" />
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-card">
              <p className="mb-2 text-xs font-semibold text-slate-500">
                {res.objet_a.nom} → {res.objet_b.nom}
              </p>
              <MiniCarte
                bounds={[
                  [res.objet_a.latitude, res.objet_a.longitude],
                  [res.objet_b.latitude, res.objet_b.longitude],
                ]}
              >
                <Polyline
                  positions={res.ligne.coordinates.map(([lng, lat]) => [lat, lng])}
                  pathOptions={{ color: '#EF3340', weight: 4, dashArray: '10 8' }}
                />
                <Marker position={[res.objet_a.latitude, res.objet_a.longitude]} icon={iconeResultat('#00843D')}>
                  <Tooltip permanent direction="top">{res.objet_a.nom}</Tooltip>
                </Marker>
                <Marker position={[res.objet_b.latitude, res.objet_b.longitude]} icon={iconeResultat('#EF3340')}>
                  <Tooltip permanent direction="top">{res.objet_b.nom}</Tooltip>
                </Marker>
              </MiniCarte>
            </div>
          </>
        ) : (
          <div className="rounded-2xl bg-white p-5 shadow-card">
            <EtatVide titre="Aucun calcul effectué" texte="Sélectionnez deux infrastructures puis lancez le calcul de distance." />
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────── Onglet Couverture ─────────────────── */
function OngletCouverture() {
  const [antennes, setAntennes] = useState([])
  const [id, setId] = useState('')
  const [rayon, setRayon] = useState(5)
  const [res, setRes] = useState(null)
  const [chargement, setChargement] = useState(false)

  useEffect(() => {
    api.get('/api/antennes/carte').then((r) => setAntennes(r.data.features.map((f) => f.properties)))
  }, [])

  const calculer = () => {
    if (!id) return toast.error('Sélectionnez une antenne.')
    setChargement(true)
    api
      .get('/api/analyses/couverture', { params: { antenne_id: id, rayon_km: rayon } })
      .then((r) => setRes(r.data))
      .catch(() => toast.error('Le calcul a échoué.'))
      .finally(() => setChargement(false))
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <div className="rounded-2xl bg-white p-5 shadow-card">
        <h3 className="text-sm font-bold text-art-navy">Zone de couverture théorique</h3>
        <p className="mt-1 text-xs text-slate-400">
          Polygone calculé par <strong>ST_Buffer</strong> (geography) autour de l'antenne — rayon
          paramétrable. Il ne s'agit pas d'une simulation radio réelle.
        </p>
        <Champ label="Antenne" className="mt-3">
          <Selection value={id} onChange={(e) => setId(e.target.value)}>
            <option value="">Sélectionner…</option>
            {antennes.map((x) => (
              <option key={x.id} value={x.id}>{x.nom} ({x.operateur})</option>
            ))}
          </Selection>
        </Champ>
        <p className="mt-3 mb-1.5 text-xs font-semibold text-slate-600">Rayon</p>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 5, 10].map((r) => (
            <button
              key={r}
              onClick={() => setRayon(r)}
              className={`rounded-xl py-2 text-sm font-bold transition ${
                rayon === r ? 'bg-art-gold text-art-navy shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {r} km
            </button>
          ))}
        </div>
        <Bouton onClick={calculer} chargement={chargement} variante="or" className="mt-4 w-full">
          Afficher la couverture
        </Bouton>
      </div>

      <div className="space-y-4">
        {res ? (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Resume titre="Rayon" valeur={`${res.rayon_km} km`} couleur="#F2B705" />
              <Resume titre="Antennes dans la zone" valeur={res.total_dans_zone} couleur="#00843D" />
              <Resume titre="Méthode" valeur="ST_Buffer" couleur="#1B4480" />
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-card">
              <p className="mb-2 text-xs font-semibold text-slate-500">
                Zone autour de « {res.antenne.nom} » — {res.antenne.operateur} ({res.antenne.technologie})
              </p>
              <MiniCarte bounds={res.polygone?.coordinates?.[0]?.map(([lng, lat]) => [lat, lng])}>
                <Polygon
                  positions={res.polygone.coordinates[0].map(([lng, lat]) => [lat, lng])}
                  pathOptions={{ color: '#FDB913', weight: 2, fillColor: '#FDB913', fillOpacity: 0.12 }}
                />
              </MiniCarte>
              <div className="mt-4 max-h-56 overflow-y-auto">
                <table className="table-art w-full">
                  <thead>
                    <tr className="bg-art-bg/60">
                      <th>Antenne dans la zone</th><th>Opérateur</th><th>Distance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {res.antennes_dans_zone.map((a) => (
                      <tr key={a.id}>
                        <td className="font-semibold text-art-navy">{a.nom}</td>
                        <td className="text-slate-600">{a.operateur}</td>
                        <td className="font-semibold text-art-green">{a.distance_km} km</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-2xl bg-white p-5 shadow-card">
            <EtatVide titre="Aucune zone calculée" texte="Sélectionnez une antenne et un rayon puis lancez le calcul." />
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────── Onglet Recherche spatiale ─────────────────── */
function OngletRecherche() {
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [rayon, setRayon] = useState(10)
  const [typeInfra, setTypeInfra] = useState('antenne')
  const [res, setRes] = useState(null)
  const [chargement, setChargement] = useState(false)

  const rechercher = () => {
    if (!lat || !lng) return toast.error('Saisissez la latitude et la longitude du point de recherche.')
    setChargement(true)
    api
      .get('/api/analyses/recherche-spatiale', {
        params: { lat, lng, rayon_km: rayon, type_infra: typeInfra },
      })
      .then((r) => setRes(r.data))
      .catch(() => toast.error('La recherche a échoué.'))
      .finally(() => setChargement(false))
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <div className="rounded-2xl bg-white p-5 shadow-card">
        <h3 className="text-sm font-bold text-art-navy">Recherche dans un rayon</h3>
        <p className="mt-1 text-xs text-slate-400">
          Sélection PostGIS par <strong>ST_DWithin</strong> (index GiST) autour d'un point WGS84.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Champ label="Latitude"><Entree type="number" step="0.0001" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="3.8667" /></Champ>
          <Champ label="Longitude"><Entree type="number" step="0.0001" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="11.5217" /></Champ>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Champ label="Rayon">
            <Selection value={rayon} onChange={(e) => setRayon(Number(e.target.value))}>
              {[1, 2, 5, 10, 25, 50, 100].map((r) => (
                <option key={r} value={r}>{r} km</option>
              ))}
            </Selection>
          </Champ>
          <Champ label="Type">
            <Selection value={typeInfra} onChange={(e) => setTypeInfra(e.target.value)}>
              <option value="antenne">Antennes</option>
              <option value="centre">Centres</option>
              <option value="fibre">Fibres</option>
              <option value="tous">Tout</option>
            </Selection>
          </Champ>
        </div>
        <Bouton onClick={rechercher} chargement={chargement} variante="primaire" className="mt-4 w-full">
          Rechercher
        </Bouton>
      </div>

      <div className="space-y-4">
        {res ? (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Resume titre="Résultats" valeur={res.total} couleur="#00843D" />
              <Resume titre="Rayon" valeur={`${res.rayon_km} km`} couleur="#1B4480" />
              <Resume titre="Point" valeur={`${res.point.latitude}, ${res.point.longitude}`} couleur="#F2B705" />
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-card">
              <p className="mb-2 text-sm font-bold text-art-navy">
                {res.total} infrastructure(s) trouvée(s) dans un rayon de {res.rayon_km} km
              </p>
              <MiniCarte bounds={res.cercle?.coordinates?.[0]?.map(([lng2, lat2]) => [lat2, lng2])}>
                <Polygon
                  positions={res.cercle.coordinates[0].map(([lng2, lat2]) => [lat2, lng2])}
                  pathOptions={{ color: '#1B4480', weight: 2, fillColor: '#1B4480', fillOpacity: 0.07 }}
                />
                {res.resultats
                  .filter((r) => r.latitude != null)
                  .map((r) => (
                    <Marker
                      key={`${r.type}-${r.id}`}
                      position={[r.latitude, r.longitude]}
                      icon={iconeResultat(r.type === 'antenne' ? '#00843D' : '#1B4480')}
                    >
                      <Tooltip direction="top">{r.nom}</Tooltip>
                    </Marker>
                  ))}
              </MiniCarte>
              <div className="mt-4 max-h-64 overflow-y-auto">
                <table className="table-art w-full">
                  <thead>
                    <tr className="bg-art-bg/60"><th>Type</th><th>Nom</th><th>Détail</th><th>Distance</th></tr>
                  </thead>
                  <tbody>
                    {res.resultats.map((r) => (
                      <tr key={`${r.type}-${r.id}`}>
                        <td>
                          <span className="badge bg-slate-100 text-slate-600 capitalize">{r.type}</span>
                        </td>
                        <td className="font-semibold text-art-navy">{r.nom}</td>
                        <td className="text-slate-500">{r.detail}</td>
                        <td className="font-semibold text-art-green">{r.distance_km} km</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-2xl bg-white p-5 shadow-card">
            <EtatVide titre="Aucune recherche lancée" texte="Définissez un point et un rayon puis lancez la recherche spatiale." />
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────── Onglet Proximité ─────────────────── */
function OngletProximite() {
  const [seuil, setSeuil] = useState(2)
  const [isolement, setIsolement] = useState(50)
  const [res, setRes] = useState(null)
  const [chargement, setChargement] = useState(false)

  const analyser = () => {
    setChargement(true)
    api
      .get('/api/analyses/proximite', { params: { seuil_km: seuil, isolement_km: isolement } })
      .then((r) => setRes(r.data))
      .catch(() => toast.error("L'analyse a échoué."))
      .finally(() => setChargement(false))
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white p-5 shadow-card">
        <h3 className="text-sm font-bold text-art-navy">Paramètres de l'analyse de proximité</h3>
        <p className="mt-1 text-xs text-slate-400">
          Auto-jointure PostGIS : paires d'antennes trop proches (ST_DWithin), antennes isolées
          (MIN ST_Distance) et antenne la plus proche de chaque centre technique (KNN).
        </p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Champ label={`Seuil « trop proches » : ${seuil} km`}>
            <input type="range" min="0.5" max="20" step="0.5" value={seuil} onChange={(e) => setSeuil(Number(e.target.value))} className="w-full accent-art-red" />
          </Champ>
          <Champ label={`Seuil « isolées » : ${isolement} km`}>
            <input type="range" min="10" max="200" step="5" value={isolement} onChange={(e) => setIsolement(Number(e.target.value))} className="w-full accent-art-navy" />
          </Champ>
          <div className="flex items-end">
            <Bouton onClick={analyser} chargement={chargement} variante="primaire" className="w-full">
              Lancer l'analyse
            </Bouton>
          </div>
        </div>
      </div>

      {res && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Resume titre="Paires trop proches" valeur={res.nb_paires_trop_proches} couleur="#EF3340" />
            <Resume titre="Antennes isolées" valeur={res.nb_antennes_isolees} couleur="#F2B705" />
            <Resume titre="Centres analysés" valeur={res.centres_associes.length} couleur="#1B4480" />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <div className="rounded-2xl bg-white p-5 shadow-card">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-art-navy">
                <Radio size={16} className="text-art-red" /> Antennes trop proches (&lt; {res.seuil_trop_proches_km} km)
              </h4>
              {res.paires_trop_proches.length === 0 ? (
                <EtatVide titre="Aucune paire" texte={`Aucune paire d'antennes n'est plus proche que ${res.seuil_trop_proches_km} km.`} />
              ) : (
                <table className="table-art w-full">
                  <thead>
                    <tr className="bg-art-bg/60"><th>Antenne A</th><th>Antenne B</th><th>Distance</th></tr>
                  </thead>
                  <tbody>
                    {res.paires_trop_proches.map((p) => (
                      <tr key={`${p.a.id}-${p.b.id}`}>
                        <td className="font-medium text-slate-700">{p.a.nom}</td>
                        <td className="font-medium text-slate-700">{p.b.nom}</td>
                        <td className="font-bold text-art-red">{p.distance_km} km</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-card">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-art-navy">
                <MapPin size={16} className="text-art-gold" /> Antennes isolées (&gt; {res.seuil_isolement_km} km de toute autre)
              </h4>
              {res.antennes_isolees.length === 0 ? (
                <EtatVide titre="Aucune antenne isolée" texte={`Aucune antenne ne dépasse ${res.seuil_isolement_km} km d'isolement.`} />
              ) : (
                <table className="table-art w-full">
                  <thead>
                    <tr className="bg-art-bg/60"><th>Antenne</th><th>Ville</th><th>Dist. minimale</th></tr>
                  </thead>
                  <tbody>
                    {res.antennes_isolees.map((a) => (
                      <tr key={a.id}>
                        <td className="font-semibold text-art-navy">{a.nom}</td>
                        <td className="text-slate-600">{a.ville}</td>
                        <td className="font-bold text-amber-600">{a.distance_min_km} km</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-card">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-art-navy">
              <Cable size={16} className="text-art-navy" /> Antenne la plus proche de chaque centre technique
            </h4>
            <div className="max-h-72 overflow-y-auto">
              <table className="table-art w-full">
                <thead>
                  <tr className="bg-art-bg/60"><th>Centre technique</th><th>Ville</th><th>Antenne proche</th><th>Opérateur</th><th>Distance</th></tr>
                </thead>
                <tbody>
                  {res.centres_associes.map((c) => (
                    <tr key={c.centre.id}>
                      <td className="font-semibold text-art-navy">{c.centre.nom}</td>
                      <td className="text-slate-600">{c.centre.ville}</td>
                      <td className="text-slate-600">{c.antenne_proche.nom}</td>
                      <td className="text-slate-600">{c.antenne_proche.operateur}</td>
                      <td className="font-bold text-art-green">{c.distance_km} km</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {!res && (
        <div className="rounded-2xl bg-white p-5 shadow-card">
          <EtatVide titre="Analyse non lancée" texte="Ajustez les seuils puis lancez l'analyse de proximité PostGIS." />
        </div>
      )}
    </div>
  )
}

export default function Analyses() {
  const [onglet, setOnglet] = useState('distance')
  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap gap-2">
        {ONGLETS.map(({ cle, libelle, icone: Icone }) => (
          <button
            key={cle}
            onClick={() => setOnglet(cle)}
            data-onglet={cle}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              onglet === cle
                ? 'bg-art-navy text-white shadow-card'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-art-bg'
            }`}
          >
            <Icone size={16} className={onglet === cle ? 'text-art-gold' : 'text-art-navy'} />
            {libelle}
          </button>
        ))}
      </div>

      <div className="fade-up">
        {onglet === 'distance' && <OngletDistance />}
        {onglet === 'couverture' && <OngletCouverture />}
        {onglet === 'recherche' && <OngletRecherche />}
        {onglet === 'proximite' && <OngletProximite />}
      </div>

      <p className="flex items-center gap-1.5 px-1 text-[11px] text-slate-400">
        <Loader2 size={12} /> Toutes les analyses sont exécutées côté serveur PostgreSQL + PostGIS —
        prototype académique, données de démonstration.
      </p>
    </div>
  )
}
