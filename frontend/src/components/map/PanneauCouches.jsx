import { Cable, Landmark, Layers, MapPin, RadioTower } from 'lucide-react'

const COUCHES = [
  { cle: 'antennes', libelle: 'Antennes relais', icone: RadioTower, couleur: '#00843D' },
  { cle: 'fibres', libelle: 'Réseaux fibre optique', icone: Cable, couleur: '#F2B705' },
  { cle: 'centres', libelle: 'Centres techniques', icone: Landmark, couleur: '#1B4480' },
  { cle: 'limites', libelle: 'Limites administratives', icone: MapPin, couleur: '#FDB913' },
]

const FONDS = [
  { cle: 'sombre', libelle: 'Sombre' },
  { cle: 'standard', libelle: 'OSM' },
  { cle: 'satellite', libelle: 'Satellite' },
]

export default function PanneauCouches({ couches, onBasculer, fond, onFond }) {
  return (
    <div className="maplibre-panel w-64">
      <div className="flex items-center gap-2">
        <Layers size={16} className="text-art-navy" />
        <h3 className="text-sm font-bold text-art-navy">Couches</h3>
      </div>
      <div className="mt-3 space-y-1">
        {COUCHES.map(({ cle, libelle, icone: Icone, couleur }) => (
          <label
            key={cle}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-art-bg"
          >
            <input
              type="checkbox"
              checked={couches[cle]}
              onChange={() => onBasculer(cle)}
              className="h-4 w-4 rounded accent-art-green"
              data-couche={cle}
            />
            <Icone size={15} style={{ color: couleur }} />
            <span className="text-xs font-medium text-slate-700">{libelle}</span>
            <span className="ml-auto text-[10px] font-bold text-slate-300">
              {couches[cle] ? 'ON' : 'OFF'}
            </span>
          </label>
        ))}
      </div>

      <div className="my-3 h-px bg-slate-200" />
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Fond cartographique
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {FONDS.map((f) => (
          <button
            key={f.cle}
            onClick={() => onFond(f.cle)}
            className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold transition ${
              fond === f.cle
                ? 'bg-art-navy text-white shadow'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.libelle}
          </button>
        ))}
      </div>
    </div>
  )
}
