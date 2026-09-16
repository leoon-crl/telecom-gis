import {
  Antenna,
  BarChart3,
  Building2,
  Cable,
  Crosshair,
  LayoutDashboard,
  LogOut,
  Map,
  ShieldCheck,
  Upload,
  UserCircle2,
  X,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'

const MENU = [
  { vers: '/', libelle: 'Tableau de bord', icone: LayoutDashboard },
  { vers: '/carte', libelle: 'Carte SIG', icone: Map },
  { vers: '/antennes', libelle: 'Antennes', icone: Antenna },
  { vers: '/fibres', libelle: 'Fibres optiques', icone: Cable },
  { vers: '/centres', libelle: 'Centres techniques', icone: Building2 },
  { vers: '/analyses', libelle: 'Analyses spatiales', icone: Crosshair },
  { vers: '/statistiques', libelle: 'Statistiques', icone: BarChart3 },
  { vers: '/import', libelle: 'Importation', icone: Upload },
  { vers: '/administration', libelle: 'Administration', icone: ShieldCheck, admin: true },
  { vers: '/profil', libelle: 'Profil', icone: UserCircle2 },
]

/** Logo ART stylisé (inspiré de l'identité visuelle de la couverture). */
export function LogoART({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-white/95 shadow-md">
        <svg viewBox="0 0 44 44" className="h-8 w-8">
          <g stroke="#FDB913" strokeWidth="2.4" fill="none" strokeLinecap="round">
            <path d="M27 15 a9 9 0 0 1 5.5 7" />
            <path d="M28 10.5 a14.5 14.5 0 0 1 8.5 11.5" />
          </g>
          <rect x="13" y="26" width="4.5" height="9" rx="1.2" fill="#00843D" />
          <rect x="19.8" y="21.5" width="4.5" height="13.5" rx="1.2" fill="#EF3340" />
          <rect x="26.6" y="29" width="4.5" height="6" rx="1.2" fill="#FDB913" />
          <circle cx="22" cy="15" r="3.2" fill="#0B2447" />
        </svg>
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="text-lg font-extrabold tracking-tight text-white">
            ART <span className="text-art-gold">TELECOM</span> <span className="text-art-green2">GIS</span>
          </p>
          <p className="text-[10.5px] font-medium uppercase tracking-wider text-white/60">
            Agence de Régulation des Télécom.
          </p>
        </div>
      )}
    </div>
  )
}

export default function Sidebar({ ouvert, onFermer }) {
  const { utilisateur, deconnexion } = useAuth()

  return (
    <>
      {ouvert && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onFermer}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-gradient-to-b from-art-navy via-art-navy to-[#081a34] transition-transform duration-300 lg:static lg:translate-x-0 ${
          ouvert ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 pb-5 pt-6">
          <LogoART />
          <button
            onClick={onFermer}
            className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Fermer le menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mx-5 mb-4 h-px bg-gradient-to-r from-art-green2/60 via-art-gold/40 to-transparent" />

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {MENU.map(({ vers, libelle, icone: Icone, admin }) => {
            if (admin && utilisateur?.role !== 'ADMIN') return null
            return (
              <NavLink
                key={vers}
                to={vers}
                end={vers === '/'}
                onClick={onFermer}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-white/12 text-white shadow-inner ring-1 ring-white/15'
                      : 'text-white/65 hover:bg-white/7 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icone
                      size={19}
                      className={isActive ? 'text-art-gold' : 'text-white/55 group-hover:text-white/85'}
                    />
                    {libelle}
                    {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-art-gold" />}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="border-t border-white/10 px-5 py-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-art-green/90 text-sm font-bold text-white">
              {utilisateur?.nom?.split(' ').map((m) => m[0]).slice(0, 2).join('') || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{utilisateur?.nom}</p>
              <p className="truncate text-xs text-white/55">
                {utilisateur?.role === 'ADMIN' ? 'Administrateur' : 'Agent SIG'} — {utilisateur?.email}
              </p>
            </div>
            <button
              onClick={deconnexion}
              title="Se déconnecter"
              className="rounded-lg p-2 text-white/60 transition hover:bg-art-red/90 hover:text-white"
            >
              <LogOut size={17} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center rounded-full bg-art-gold/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-art-gold ring-1 ring-art-gold/30">
              Prototype académique
            </span>
            <span className="text-[10px] text-white/40">v1.0.0</span>
          </div>
        </div>
      </aside>
    </>
  )
}
