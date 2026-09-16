import 'leaflet/dist/leaflet.css'
import MarkerClusterGroup from 'react-leaflet-cluster'
import {
  Cable,
  Landmark,
  Loader2,
  Locate,
  MoveHorizontal,
  Radio,
  RadioTower,
  Search,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
  GeoJSON,
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  Popup,
  TileLayer,
  Tooltip as TooltipLeaflet,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import api from '../services/api'
import {
  CENTRE_CAMEROUN,
  FONDS_DE_CARTE,
  LIBELLES_STATUTS,
  ZOOM_CAMEROUN,
} from '../utils/couleurs.js'
import {
  couleurAntenne,
  iconeAntenne,
  iconeCentre,
  iconeResultat,
  styleFibre,
  styleRegion,
} from '../components/map/icones.js'
import PanneauCouches from '../components/map/PanneauCouches.jsx'
import { BarreOutils, Legende } from '../components/map/Legende.jsx'
import { Modale } from '../components/ui/Composants.jsx'
import { Bouton } from '../components/ui/Formulaire.jsx'

/* ────────────── Aides carte ────────────── */
function AjusterVers({ cible }) {
  const map = useMap()
  useEffect(() => {
    if (!cible) return
    if (cible.type === 'bounds') map.fitBounds(cible.bounds, { padding: [40, 40] })
    else if (cible.type === 'point')
      map.setView([cible.lat, cible.lng], Math.max(map.getZoom(), 10))
  }, [cible, map])
  return null
}

function ClicCarte({ actif, onClic }) {
  const map = useMapEvents({
    click(e) {
      if (actif) onClic(e.latlng.lat, e.latlng.lng)
    },
  })
  useEffect(() => {
    map.getContainer().style.cursor = actif ? 'crosshair' : ''
  }, [actif, map])
  return null
}

const formatKM = (v) => `${Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} km`

/* ────────────── Popups ────────────── */
function ContenuPopupAntenne({ f, onDetails }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: couleurAntenne(f.properties.operateur) }}
        >
          <RadioTower size={16} />
        </span>
        <div>
          <p className="text-sm font-bold text-art-navy">{f.properties.nom}</p>
          <p className="text-[11px] text-slate-400">{f.properties.code}</p>
        </div>
      </div>
      <dl className="mt-2.5 space-y-1 text-[12px]">
        <div className="flex justify-between gap-4"><dt className="text-slate-500">Opérateur</dt><dd className="font-semibold text-slate-800">{f.properties.operateur}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-slate-500">Technologie</dt><dd className="font-semibold text-slate-800">{f.properties.technologie}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-slate-500">Statut</dt><dd className="font-semibold text-slate-800">{LIBELLES_STATUTS[f.properties.statut] || f.properties.statut}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-slate-500">Ville</dt><dd className="font-semibold text-slate-800">{f.properties.ville}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-slate-500">Région</dt><dd className="font-semibold text-slate-800">{f.properties.region}</dd></div>
      </dl>
      <button
        onClick={() => onDetails(f.properties.id)}
        className="mt-3 w-full rounded-lg bg-art-navy px-3 py-2 text-xs font-bold text-white transition hover:bg-art-navy2"
      >
        Voir les détails
      </button>
    </div>
  )
}

function ContenuPopupFibre({ f, onDetails }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-art-gold text-art-navy">
          <Cable size={16} />
        </span>
        <div>
          <p className="text-sm font-bold text-art-navy">{f.properties.nom}</p>
          <p className="text-[11px] text-slate-400">{f.properties.code}</p>
        </div>
      </div>
      <dl className="mt-2.5 space-y-1 text-[12px]">
        <div className="flex justify-between gap-4"><dt className="text-slate-500">Opérateur</dt><dd className="font-semibold text-slate-800">{f.properties.operateur}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-slate-500">Tracé</dt><dd className="font-semibold text-slate-800">{f.properties.origine} → {f.properties.destination}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-slate-500">Longueur</dt><dd className="font-semibold text-slate-800">{f.properties.longueur ? formatKM(f.properties.longueur) : '—'}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-slate-500">Capacité</dt><dd className="font-semibold text-slate-800">{f.properties.capacite || '—'}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-slate-500">Statut</dt><dd className="font-semibold text-slate-800">{LIBELLES_STATUTS[f.properties.statut] || f.properties.statut}</dd></div>
      </dl>
      <button
        onClick={() => onDetails(f.properties.id)}
        className="mt-3 w-full rounded-lg bg-art-navy px-3 py-2 text-xs font-bold text-white transition hover:bg-art-navy2"
      >
        Voir les détails
      </button>
    </div>
  )
}

/* ────────────── Outils ────────────── */
function OutilDistance({ antennes, centres, onResultat }) {
  const [typeA, setTypeA] = useState('antenne')
  const [idA, setIdA] = useState('')
  const [typeB, setTypeB] = useState('antenne')
  const [idB, setIdB] = useState('')
  const [chargement, setChargement] = useState(false)

  const liste = (type) => (type === 'antenne' ? antennes : centres)

  const calculer = async () => {
    if (!idA || !idB) {
      toast.error('Sélectionnez deux infrastructures.')
      return
    }
    setChargement(true)
    try {
      const r = await api.get('/api/analyses/distance', {
        params: { type_a: typeA, id_a: idA, type_b: typeB, id_b: idB },
      })
      onResultat(r.data)
    } catch {
      toast.error('Impossible de calculer la distance.')
    } finally {
      setChargement(false)
    }
  }

  return (
    <div className="space-y-2.5">
      {[
        ['A', typeA, setTypeA, idA, setIdA],
        ['B', typeB, setTypeB, idB, setIdB],
      ].map(([cle, type, setType, id, setId]) => (
        <div key={cle} className="grid grid-cols-[64px_1fr] gap-2">
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value)
              setId('')
            }}
            className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-[11px] font-semibold text-slate-600"
          >
            <option value="antenne">Antenne</option>
            <option value="centre">Centre</option>
          </select>
          <select
            value={id}
            onChange={(e) => setId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-[11px]"
          >
            <option value="">Infrastructure {cle}…</option>
            {liste(type).map((x) => (
              <option key={x.id} value={x.id}>
                {x.nom} ({x.operateur})
              </option>
            ))}
          </select>
        </div>
      ))}
      <Bouton onClick={calculer} chargement={chargement} variante="vert" className="w-full py-2 text-xs">
        <MoveHorizontal size={14} /> Calculer la distance
      </Bouton>
    </div>
  )
}

function OutilCouverture({ antennes, onResultat }) {
  const [id, setId] = useState('')
  const [rayon, setRayon] = useState(5)
  const [chargement, setChargement] = useState(false)

  const calculer = async () => {
    if (!id) {
      toast.error('Sélectionnez une antenne.')
      return
    }
    setChargement(true)
    try {
      const r = await api.get('/api/analyses/couverture', {
        params: { antenne_id: id, rayon_km: rayon },
      })
      onResultat(r.data)
    } catch {
      toast.error('Impossible de calculer la zone de couverture.')
    } finally {
      setChargement(false)
    }
  }

  return (
    <div className="space-y-2.5">
      <select
        value={id}
        onChange={(e) => setId(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[11px]"
      >
        <option value="">Sélectionner une antenne…</option>
        {antennes.map((x) => (
          <option key={x.id} value={x.id}>
            {x.nom} ({x.operateur})
          </option>
        ))}
      </select>
      <div className="grid grid-cols-4 gap-1.5">
        {[1, 2, 5, 10].map((r) => (
          <button
            key={r}
            onClick={() => setRayon(r)}
            className={`rounded-lg py-1.5 text-[11px] font-bold transition ${
              rayon === r
                ? 'bg-art-gold text-art-navy'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {r} km
          </button>
        ))}
      </div>
      <Bouton onClick={calculer} chargement={chargement} variante="or" className="w-full py-2 text-xs">
        <Radio size={14} /> Afficher la couverture
      </Bouton>
      <p className="text-[9.5px] leading-snug text-slate-400">
        Zone de couverture théorique (rayon géodésique), non représentative d'une simulation radio
        réelle.
      </p>
    </div>
  )
}

function OutilRecherche({ point, onPoint, modeClic, onModeClic, onResultat }) {
  const [rayon, setRayon] = useState(10)
  const [typeInfra, setTypeInfra] = useState('antenne')
  const [chargement, setChargement] = useState(false)

  const rechercher = () => {
    if (!point.lat || !point.lng) {
      toast.error('Saisissez ou sélectionnez un point sur la carte.')
      return
    }
    setChargement(true)
    api
      .get('/api/analyses/recherche-spatiale', {
        params: { lat: point.lat, lng: point.lng, rayon_km: rayon, type_infra: typeInfra },
      })
      .then((r) => onResultat(r.data))
      .catch(() => toast.error('La recherche spatiale a échoué.'))
      .finally(() => setChargement(false))
  }

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          step="0.0001"
          placeholder="Latitude"
          value={point.lat}
          onChange={(e) => onPoint({ ...point, lat: e.target.value })}
          className="rounded-lg border border-slate-200 px-2 py-2 text-[11px]"
        />
        <input
          type="number"
          step="0.0001"
          placeholder="Longitude"
          value={point.lng}
          onChange={(e) => onPoint({ ...point, lng: e.target.value })}
          className="rounded-lg border border-slate-200 px-2 py-2 text-[11px]"
        />
      </div>
      <button
        onClick={() => onModeClic(!modeClic)}
        className={`flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-bold transition ${
          modeClic ? 'bg-art-red text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
      >
        <Locate size={13} />
        {modeClic ? 'Cliquez sur la carte… (annuler)' : 'Choisir un point sur la carte'}
      </button>
      <div className="grid grid-cols-2 gap-2">
        <select
          value={rayon}
          onChange={(e) => setRayon(Number(e.target.value))}
          className="rounded-lg border border-slate-200 px-2 py-2 text-[11px]"
        >
          {[1, 2, 5, 10, 25, 50].map((r) => (
            <option key={r} value={r}>
              Rayon {r} km
            </option>
          ))}
        </select>
        <select
          value={typeInfra}
          onChange={(e) => setTypeInfra(e.target.value)}
          className="rounded-lg border border-slate-200 px-2 py-2 text-[11px]"
        >
          <option value="antenne">Antennes</option>
          <option value="centre">Centres</option>
          <option value="fibre">Fibres</option>
          <option value="tous">Tout</option>
        </select>
      </div>
      <Bouton onClick={rechercher} chargement={chargement} variante="primaire" className="w-full py-2 text-xs">
        <Search size={14} /> Rechercher
      </Bouton>
    </div>
  )
}

/* ────────────── Page principale ────────────── */
export default function CarteSIG() {
  const [couches, setCouches] = useState({ antennes: true, fibres: true, centres: true, limites: false })
  const [fond, setFond] = useState('sombre')
  const [outilActif, setOutilActif] = useState(null)
  const [antennesGeo, setAntennesGeo] = useState(null)
  const [fibresGeo, setFibresGeo] = useState(null)
  const [centresGeo, setCentresGeo] = useState(null)
  const [regionsGeo, setRegionsGeo] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [cible, setCible] = useState(null)
  const [detail, setDetail] = useState(null)
  const [pointRecherche, setPointRecherche] = useState({ lat: '', lng: '' })
  const [modeClicRecherche, setModeClicRecherche] = useState(false)

  const [ligneDistance, setLigneDistance] = useState(null)
  const [zoneCouverture, setZoneCouverture] = useState(null)
  const [recherche, setRecherche] = useState(null)
  const [resultatDistance, setResultatDistance] = useState(null)
  const [resultatCouverture, setResultatCouverture] = useState(null)

  const enCours = useRef(false)

  useEffect(() => {
    if (enCours.current) return
    enCours.current = true
    Promise.all([
      api.get('/api/antennes/carte'),
      api.get('/api/fibres/carte'),
      api.get('/api/centres/carte'),
      api.get('/api/regions'),
    ])
      .then(([a, f, c, r]) => {
        setAntennesGeo(a.data)
        setFibresGeo(f.data)
        setCentresGeo(c.data)
        setRegionsGeo(r.data)
      })
      .catch(() => toast.error('Impossible de charger les couches cartographiques.'))
      .finally(() => {
        setChargement(false)
        enCours.current = false
      })
  }, [])

  const onResultatDistance = (r) => {
    setResultatCouverture(null)
    setZoneCouverture(null)
    setRecherche(null)
    setResultatDistance(r)
    setLigneDistance(r.ligne)
    setCible({
      type: 'bounds',
      bounds: [
        [r.objet_a.latitude, r.objet_a.longitude],
        [r.objet_b.latitude, r.objet_b.longitude],
      ],
    })
    toast.success(`Distance : ${formatKM(r.distance_km)}`)
  }

  const onResultatCouverture = (r) => {
    setResultatDistance(null)
    setLigneDistance(null)
    setRecherche(null)
    setResultatCouverture(r)
    setZoneCouverture(r.polygone)
    if (r.polygone?.coordinates?.[0]?.length) {
      const bounds = r.polygone.coordinates[0].map(([lng, lat]) => [lat, lng])
      setCible({ type: 'bounds', bounds })
    }
    toast.success(`${r.total_dans_zone} antenne(s) dans la zone de ${r.rayon_km} km`)
  }

  const onResultatRecherche = (r) => {
    setResultatDistance(null)
    setLigneDistance(null)
    setResultatCouverture(null)
    setZoneCouverture(null)
    setRecherche(r)
    if (r.cercle?.coordinates?.[0]?.length) {
      const bounds = r.cercle.coordinates[0].map(([lng, lat]) => [lat, lng])
      setCible({ type: 'bounds', bounds })
    }
    setModeClicRecherche(false)
    toast.success(`${r.total} infrastructure(s) trouvée(s) dans un rayon de ${r.rayon_km} km`)
  }

  const basculerCouche = (cle) => setCouches((c) => ({ ...c, [cle]: !c[cle] }))

  const voirDetails = (type, id) => {
    const route = type === 'antenne' ? 'antennes' : type === 'fibre' ? 'fibres' : 'centres'
    api
      .get(`/api/${route}/${id}`)
      .then((r) => setDetail({ type, donnees: r.data }))
      .catch(() => toast.error('Impossible de charger les détails.'))
  }

  const listeAntennes = useMemo(
    () => (antennesGeo?.features || []).map((f) => f.properties),
    [antennesGeo]
  )
  const listeCentres = useMemo(
    () => (centresGeo?.features || []).map((f) => f.properties),
    [centresGeo]
  )

  const effacerAnalyses = () => {
    setResultatDistance(null)
    setResultatCouverture(null)
    setRecherche(null)
    setLigneDistance(null)
    setZoneCouverture(null)
  }

  const titreModale =
    detail?.type === 'antenne'
      ? 'Détail de l' + "'" + 'antenne'
      : detail?.type === 'fibre'
        ? 'Détail du tronçon de fibre'
        : 'Détail du centre technique'

  return (
    <div className="relative h-full">
      <MapContainer
        center={CENTRE_CAMEROUN}
        zoom={ZOOM_CAMEROUN}
        zoomDelta={0.5}
        className="h-full w-full"
        preferCanvas
      >
        <TileLayer
          key={fond}
          url={FONDS_DE_CARTE[fond].url}
          attribution={FONDS_DE_CARTE[fond].attribution}
        />
        <AjusterVers cible={cible} />
        <ClicCarte
          actif={modeClicRecherche}
          onClic={(lat, lng) =>
            setPointRecherche({
              lat: lat.toFixed(4),
              lng: lng.toFixed(4),
            })
          }
        />

        {/* Limites administratives */}
        {couches.limites && regionsGeo && (
          <GeoJSON key="regions" data={regionsGeo} style={styleRegion} />
        )}

        {/* Fibres optiques */}
        {couches.fibres &&
          fibresGeo?.features.map((f) => (
            <Polyline
              key={f.properties.id}
              positions={f.geometry.coordinates.map(([lng, lat]) => [lat, lng])}
              pathOptions={styleFibre(f.properties)}
            >
              <Popup maxWidth={300}>
                <ContenuPopupFibre f={f} onDetails={(id) => voirDetails('fibre', id)} />
              </Popup>
            </Polyline>
          ))}

        {/* Antennes (clustering) */}
        {couches.antennes && antennesGeo && (
          <MarkerClusterGroup chunkedLoading maxClusterRadius={45} showCoverageOnHover={false}>
            {antennesGeo.features.map((f) => (
              <Marker
                key={f.properties.id}
                position={[f.geometry.coordinates[1], f.geometry.coordinates[0]]}
                icon={iconeAntenne(f.properties.operateur, f.properties.technologie)}
              >
                <Popup maxWidth={300}>
                  <ContenuPopupAntenne f={f} onDetails={(id) => voirDetails('antenne', id)} />
                </Popup>
                <TooltipLeaflet direction="top" offset={[0, -38]}>
                  <span className="text-xs">{f.properties.nom} — {f.properties.technologie}</span>
                </TooltipLeaflet>
              </Marker>
            ))}
          </MarkerClusterGroup>
        )}

        {/* Centres techniques */}
        {couches.centres &&
          centresGeo?.features.map((f) => (
            <Marker
              key={f.properties.id}
              position={[f.geometry.coordinates[1], f.geometry.coordinates[0]]}
              icon={iconeCentre()}
            >
              <Popup maxWidth={300}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-art-navy text-white">
                      <Landmark size={15} />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-art-navy">{f.properties.nom}</p>
                      <p className="text-[11px] text-slate-400">{f.properties.code}</p>
                    </div>
                  </div>
                  <dl className="mt-2.5 space-y-1 text-[12px]">
                    <div className="flex justify-between gap-4"><dt className="text-slate-500">Opérateur</dt><dd className="font-semibold text-slate-800">{f.properties.operateur}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-slate-500">Type</dt><dd className="font-semibold text-slate-800">{f.properties.type}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-slate-500">Ville</dt><dd className="font-semibold text-slate-800">{f.properties.ville}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-slate-500">Capacité</dt><dd className="font-semibold text-slate-800">{f.properties.capacite || '—'}</dd></div>
                  </dl>
                  <button
                    onClick={() => voirDetails('centre', f.properties.id)}
                    className="mt-3 w-full rounded-lg bg-art-navy px-3 py-2 text-xs font-bold text-white transition hover:bg-art-navy2"
                  >
                    Voir les détails
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Calques d'analyse */}
        {ligneDistance && (
          <>
            <Polyline
              positions={ligneDistance.coordinates.map(([lng, lat]) => [lat, lng])}
              pathOptions={{ color: '#EF3340', weight: 4, dashArray: '10 8' }}
            />
            {resultatDistance && (
              <>
                <Marker
                  position={[resultatDistance.objet_a.latitude, resultatDistance.objet_a.longitude]}
                  icon={iconeResultat('#00843D')}
                />
                <Marker
                  position={[resultatDistance.objet_b.latitude, resultatDistance.objet_b.longitude]}
                  icon={iconeResultat('#EF3340')}
                />
              </>
            )}
          </>
        )}

        {zoneCouverture && (
          <Polygon
            positions={zoneCouverture.coordinates[0].map(([lng, lat]) => [lat, lng])}
            pathOptions={{ color: '#FDB913', weight: 2.5, fillColor: '#FDB913', fillOpacity: 0.12 }}
          />
        )}

        {recherche?.cercle && (
          <Polygon
            positions={recherche.cercle.coordinates[0].map(([lng, lat]) => [lat, lng])}
            pathOptions={{ color: '#1B4480', weight: 2, fillColor: '#1B4480', fillOpacity: 0.08, dashArray: '6 6' }}
          />
        )}

        {recherche?.resultats
          .filter((r) => r.latitude != null && r.longitude != null)
          .map((r) => (
            <Marker
              key={`${r.type}-${r.id}`}
              position={[r.latitude, r.longitude]}
              icon={iconeResultat(
                r.type === 'antenne' ? '#00843D' : r.type === 'centre' ? '#1B4480' : '#FF7900'
              )}
            />
          ))}
      </MapContainer>

      {/* Badge de chargement */}
      {chargement && (
        <div className="absolute left-1/2 top-5 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-art-navy px-4 py-2 text-xs font-semibold text-white shadow-panel">
          <Loader2 size={14} className="animate-spin" /> Chargement des couches PostGIS…
        </div>
      )}

      {/* Panneau couches + légende */}
      <div className="absolute left-4 top-4 z-20 hidden max-h-[calc(100%-2rem)] space-y-3 overflow-y-auto pr-1 md:block">
        <PanneauCouches couches={couches} onBasculer={basculerCouche} fond={fond} onFond={setFond} />
        <Legende />
      </div>

      {/* Panneau outils */}
      <div className="absolute right-4 top-4 z-20 hidden max-h-[calc(100%-2rem)] w-64 space-y-3 overflow-y-auto md:block">
        <BarreOutils outilActif={outilActif} onSelect={(c) => setOutilActif(c)} />
        {outilActif === 'distance' && (
          <div className="maplibre-panel">
            <h4 className="mb-2.5 text-xs font-bold uppercase tracking-wide text-art-navy">
              Calcul de distance
            </h4>
            <OutilDistance antennes={listeAntennes} centres={listeCentres} onResultat={onResultatDistance} />
            {resultatDistance && (
              <div className="fade-up mt-3 rounded-xl bg-art-green/10 p-3 ring-1 ring-art-green/25">
                <p className="text-[10px] font-bold uppercase tracking-wide text-art-green">Résultat</p>
                <p className="mt-1 text-center text-2xl font-extrabold text-art-navy">
                  {formatKM(resultatDistance.distance_km)}
                </p>
                <p className="mt-1 text-center text-[10px] text-slate-500">
                  {resultatDistance.objet_a.nom} → {resultatDistance.objet_b.nom}
                </p>
                <p className="mt-1.5 text-center text-[9px] text-slate-400">
                  {resultatDistance.methode}
                </p>
              </div>
            )}
          </div>
        )}
        {outilActif === 'couverture' && (
          <div className="maplibre-panel">
            <h4 className="mb-2.5 text-xs font-bold uppercase tracking-wide text-art-navy">
              Zone de couverture
            </h4>
            <OutilCouverture antennes={listeAntennes} onResultat={onResultatCouverture} />
            {resultatCouverture && (
              <div className="fade-up mt-3 rounded-xl bg-art-gold/10 p-3 ring-1 ring-art-gold/30">
                <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600">Résultat</p>
                <p className="mt-1 text-center text-xl font-extrabold text-art-navy">
                  {resultatCouverture.total_dans_zone} antenne(s)
                </p>
                <p className="text-center text-[10px] text-slate-500">
                  dans un rayon de {resultatCouverture.rayon_km} km autour de{' '}
                  {resultatCouverture.antenne.nom}
                </p>
                <p className="mt-1.5 text-[9px] leading-snug text-slate-400">
                  {resultatCouverture.precision}
                </p>
              </div>
            )}
          </div>
        )}
        {outilActif === 'recherche' && (
          <div className="maplibre-panel">
            <h4 className="mb-2.5 text-xs font-bold uppercase tracking-wide text-art-navy">
              Recherche spatiale
            </h4>
            <OutilRecherche
              point={pointRecherche}
              onPoint={setPointRecherche}
              modeClic={modeClicRecherche}
              onModeClic={setModeClicRecherche}
              onResultat={onResultatRecherche}
            />
            {recherche && (
              <div className="fade-up mt-3">
                <div className="rounded-xl bg-art-navy/5 p-3 ring-1 ring-art-navy/15">
                  <p className="text-center text-sm font-extrabold text-art-navy">
                    {recherche.total} infrastructure(s) trouvée(s) dans un rayon de{' '}
                    {recherche.rayon_km} km
                  </p>
                </div>
                <ul className="mt-2 max-h-44 space-y-1.5 overflow-y-auto pr-1">
                  {recherche.resultats.map((r) => (
                    <li
                      key={`${r.type}-${r.id}`}
                      className="flex items-start gap-2 rounded-lg bg-white px-2.5 py-2 ring-1 ring-slate-100"
                    >
                      <span
                        className="mt-1 h-2 w-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            r.type === 'antenne' ? '#00843D' : r.type === 'centre' ? '#1B4480' : '#FF7900',
                        }}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-bold text-slate-700">{r.nom}</p>
                        <p className="truncate text-[10px] text-slate-400">
                          {r.operateur} — {r.distance_km} km
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        {(resultatDistance || resultatCouverture || recherche) && (
          <button
            onClick={effacerAnalyses}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-white/95 px-3 py-2 text-[11px] font-bold text-art-red shadow-panel ring-1 ring-red-100 transition hover:bg-red-50"
          >
            <X size={13} /> Effacer les analyses
          </button>
        )}
      </div>

      {/* Indicateur mode clic */}
      {modeClicRecherche && (
        <div className="absolute left-1/2 top-4 z-30 -translate-x-1/2 rounded-full bg-art-red px-4 py-2 text-xs font-bold text-white shadow-panel">
          Cliquez sur la carte pour définir le point de recherche
        </div>
      )}

      {/* Modale de détails */}
      <Modale ouvert={detail !== null} onFermer={() => setDetail(null)} titre={titreModale}>
        {detail && <FicheDetails type={detail.type} d={detail.donnees} />}
      </Modale>
    </div>
  )
}

/* ────────────── Fiche détaillée ────────────── */
function FicheDetails({ type, d }) {
  const libelleDate = 'Date d' + "'" + 'installation'
  const lignes =
    type === 'antenne'
      ? [
          ['Nom', d.nom], ['Code', d.code], ['Opérateur', d.operateur],
          ['Technologie', d.technologie], ['Type', d.type],
          ['Statut', LIBELLES_STATUTS[d.statut] || d.statut],
          ['Hauteur', d.hauteur ? `${d.hauteur} m` : '—'],
          ['Puissance', d.puissance ? `${d.puissance} W` : '—'],
          [libelleDate, d.date_installation || '—'],
          ['Adresse', d.adresse || '—'], ['Ville', d.ville], ['Région', d.region],
          ['Latitude', d.latitude], ['Longitude', d.longitude],
        ]
      : type === 'fibre'
        ? [
            ['Nom', d.nom], ['Code', d.code], ['Opérateur', d.operateur],
            ['Origine', d.origine], ['Destination', d.destination],
            ['Longueur', d.longueur ? formatKM(d.longueur) : '—'],
            ['Capacité', d.capacite || '—'], ['Type', d.type],
            ['Statut', LIBELLES_STATUTS[d.statut] || d.statut],
            [libelleDate, d.date_installation || '—'],
            ['Points du tracé', d.coordonnees?.length || 0],
          ]
        : [
            ['Nom', d.nom], ['Code', d.code], ['Opérateur', d.operateur],
            ['Type', d.type], ['Statut', LIBELLES_STATUTS[d.statut] || d.statut],
            ['Adresse', d.adresse || '—'], ['Ville', d.ville], ['Région', d.region],
            ['Capacité', d.capacite || '—'], ['Latitude', d.latitude], ['Longitude', d.longitude],
          ]

  return (
    <div>
      <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        {lignes.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 border-b border-slate-100 py-2.5">
            <span className="text-xs font-medium text-slate-500">{k}</span>
            <span className="text-right text-xs font-bold text-art-navy">{String(v)}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 rounded-lg bg-art-bg px-3 py-2 text-[10px] text-slate-400">
        Données de démonstration — prototype académique ART TELECOM GIS.
      </p>
    </div>
  )
}
