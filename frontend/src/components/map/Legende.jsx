import { MoveHorizontal, Radio, Search, SquareStack } from 'lucide-react'

export const OUTILS = [
  { cle: 'distance', libelle: 'Calcul de distance', icone: MoveHorizontal, couleur: '#00843D' },
  { cle: 'couverture', libelle: 'Zone de couverture', icone: Radio, couleur: '#F2B705' },
  { cle: 'recherche', libelle: 'Recherche spatiale', icone: Search, couleur: '#1B4480' },
]

/** Liste des outils d'analyse (panneau droit, cf. couverture du cahier des charges). */
export function BarreOutils({ outilActif, onSelect }) {
  return (
    <div className="maplibre-panel w-60">
      <div className="flex items-center gap-2">
        <SquareStack size={16} className="text-art-navy" />
        <h3 className="text-sm font-bold text-art-navy">Outils d'analyse</h3>
      </div>
      <div className="mt-3 space-y-1.5">
        {OUTILS.map(({ cle, libelle, icone: Icone, couleur }) => (
          <button
            key={cle}
            onClick={() => onSelect(cle === outilActif ? null : cle)}
            data-outil={cle}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition ${
              outilActif === cle
                ? 'bg-art-navy text-white shadow'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-art-bg'
            }`}
          >
            <Icone size={15} style={outilActif === cle ? { color: '#FDB913' } : { color: couleur }} />
            {libelle}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-slate-400">
        Calculs effectués côté serveur avec PostGIS (ST_Distance, ST_Buffer, ST_DWithin).
      </p>
    </div>
  )
}

/** Légende cartographique (opérateurs, fibre, centres). */
export function Legende() {
  const operateurs = [
    ['CAMTEL', '#00843D'],
    ['MTN Cameroun', '#F2B705'],
    ['Orange Cameroun', '#FF7900'],
    ['Nexttel (Viettel)', '#2563EB'],
  ]
  return (
    <div className="maplibre-panel w-56">
      <h3 className="text-sm font-bold text-art-navy">Légende</h3>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Antennes par opérateur
      </p>
      <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1">
        {operateurs.map(([nom, couleur]) => (
          <div key={nom} className="flex items-center gap-1.5">
            <svg width="12" height="16" viewBox="0 0 30 42" className="shrink-0">
              <path
                d="M15 1C7.3 1 1 7.3 1 15c0 10.2 12.4 24.3 12.9 24.9.3.3.7.3 1 0C15.6 39.3 28 25.2 28 15 28 7.3 22.7 1 15 1z"
                fill={couleur}
                stroke="#fff"
                strokeWidth="2"
              />
            </svg>
            <span className="truncate text-[10.5px] font-medium text-slate-600">{nom}</span>
          </div>
        ))}
      </div>
      <div className="mt-2.5 space-y-1.5 border-t border-slate-100 pt-2.5">
        <div className="flex items-center gap-2">
          <span className="h-[3px] w-6 rounded bg-gradient-to-r from-[#00E676] to-[#FFD54F]" />
          <span className="text-[10.5px] font-medium text-slate-600">Tronçons fibre optique</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-4 w-4 items-center justify-center rounded-md bg-[#1B4480] text-[8px] font-bold text-white">CT</span>
          <span className="text-[10.5px] font-medium text-slate-600">Centre technique</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-[2px] w-6 rounded border-b border-dashed border-art-gold" />
          <span className="text-[10.5px] font-medium text-slate-600">Limites administratives</span>
        </div>
      </div>
    </div>
  )
}
