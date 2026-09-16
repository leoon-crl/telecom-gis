import { Menu } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'

const TITRES = {
  '/': 'Tableau de bord',
  '/carte': 'Carte SIG interactive',
  '/antennes': 'Antennes relais',
  '/fibres': 'Réseaux de fibre optique',
  '/centres': 'Centres techniques',
  '/analyses': 'Analyses spatiales',
  '/statistiques': 'Statistiques et indicateurs',
  '/import': 'Importation des données',
  '/administration': 'Administration',
  '/profil': 'Mon profil',
}

export default function Topbar({ onOuvrirMenu }) {
  const { pathname } = useLocation()
  const { utilisateur } = useAuth()

  return (
    <header className="z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm md:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onOuvrirMenu}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu size={22} />
        </button>
        <div>
          <h1 className="text-base font-bold text-art-navy md:text-lg">
            {TITRES[pathname] || 'ART TELECOM GIS'}
          </h1>
          <p className="hidden text-xs text-slate-500 md:block">
            Plateforme SIG de cartographie et d'analyse des infrastructures de télécommunications
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden rounded-full bg-art-navy/5 px-3 py-1.5 text-xs font-semibold text-art-navy ring-1 ring-art-navy/10 sm:inline-flex">
          {utilisateur?.role === 'ADMIN' ? 'ADMIN' : 'AGENT'} · {utilisateur?.email}
        </span>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-art-navy to-art-navy3 text-xs font-bold text-white ring-2 ring-art-gold/50">
          {utilisateur?.nom?.split(' ').map((m) => m[0]).slice(0, 2).join('') || 'U'}
        </div>
      </div>
    </header>
  )
}
