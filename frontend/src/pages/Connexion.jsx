import { Antenna, BarChart3, Cable, Map, Radio, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth.jsx'
import { Bouton } from '../components/ui/Formulaire.jsx'
import { LogoART } from '../components/layout/Sidebar.jsx'

const ARGUMENTS_PLATEFORME = [
  { icone: Map, titre: 'Cartographie interactive', texte: 'Antennes, fibre optique et centres techniques sur une carte unifiée' },
  { icone: Radio, titre: 'Analyses spatiales PostGIS', texte: 'Distances, zones de couverture, recherches par rayon, proximité' },
  { icone: BarChart3, titre: 'Statistiques et indicateurs', texte: 'Tableau de bord de suivi des infrastructures par région et opérateur' },
  { icone: ShieldCheck, titre: 'Sécurisée et fiable', texte: 'Authentification JWT, gestion des rôles et confidentialité des données' },
]

export default function PageConnexion() {
  const { connexion } = useAuth()
  const naviguer = useNavigate()
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(false)

  const soumettre = async (e) => {
    e.preventDefault()
    setErreur('')
    setChargement(true)
    try {
      await connexion(email.trim(), motDePasse)
      toast.success('Connexion réussie — bienvenue sur la plateforme SIG')
      naviguer('/', { replace: true })
    } catch (e2) {
      setErreur(e2.response?.data?.detail || 'Impossible de se connecter. Vérifiez vos identifiants.')
    } finally {
      setChargement(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Panneau gauche — identité ART */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-art-navy via-[#0d2c56] to-[#071830] p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #14A85C 0%, transparent 65%)' }}
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #FDB913 0%, transparent 60%)' }}
        />

        <div className="relative">
          <LogoART />
          <div className="mt-10">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-art-gold">
              Agence de Régulation des Télécommunications — Cameroun
            </p>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight">
              Cartographie <span className="text-art-green2">intelligente</span> des infrastructures
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70">
              Plateforme SIG pour la cartographie et l'analyse des infrastructures de
              télécommunications : antennes relais, réseaux de fibre optique et centres techniques.
            </p>
          </div>
        </div>

        <div className="relative grid grid-cols-2 gap-4">
          {ARGUMENTS_PLATEFORME.map(({ icone: Icone, titre, texte }) => (
            <div
              key={titre}
              className="rounded-2xl bg-white/7 p-4 ring-1 ring-white/10 backdrop-blur-sm"
            >
              <Icone size={22} className="text-art-gold" />
              <p className="mt-2.5 text-sm font-bold">{titre}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/60">{texte}</p>
            </div>
          ))}
        </div>

        <div className="relative flex items-center gap-6 border-t border-white/10 pt-6">
          <span className="flex items-center gap-2 text-xs text-white/50">
            <Antenna size={14} className="text-art-green2" /> Antennes relais
          </span>
          <span className="flex items-center gap-2 text-xs text-white/50">
            <Cable size={14} className="text-art-gold" /> Fibre optique
          </span>
          <span className="flex items-center gap-2 text-xs text-white/50">
            <ShieldCheck size={14} className="text-art-red" /> Sécurité et fiabilité
          </span>
        </div>
      </div>

      {/* Formulaire */}
      <div className="flex w-full flex-col justify-center bg-art-bg px-6 py-12 sm:px-12 lg:w-1/2">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <div className="rounded-2xl bg-art-navy px-5 py-4">
              <LogoART />
            </div>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-card sm:p-10">
            <h2 className="text-center text-xl font-extrabold text-art-navy">
              Plateforme SIG – Infrastructures Télécom
            </h2>
            <p className="mt-2 text-center text-sm text-slate-500">
              Connectez-vous avec vos identifiants professionnels
            </p>

            {erreur && (
              <div className="fade-up mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-art-red2">
                {erreur}
              </div>
            )}

            <form onSubmit={soumettre} className="mt-6 space-y-5">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="prenom.nom@art.cm"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-art-navy focus:ring-2 focus:ring-art-navy/25"
                />
              </div>
              <div>
                <label htmlFor="mdp" className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Mot de passe
                </label>
                <input
                  id="mdp"
                  type="password"
                  required
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-art-navy focus:ring-2 focus:ring-art-navy/25"
                />
              </div>
              <Bouton type="submit" chargement={chargement} className="w-full py-3" variante="primaire">
                Se connecter
              </Bouton>
            </form>

            <div className="mt-7 rounded-2xl bg-art-bg p-4 text-xs leading-relaxed text-slate-500 ring-1 ring-slate-200/70">
              <p className="font-semibold text-art-navy">Comptes de démonstration</p>
              <p className="mt-1">
                Administrateur : <code className="rounded bg-white px-1.5 py-0.5 font-semibold text-art-navy">admin@art.cm</code> / <code className="rounded bg-white px-1.5 py-0.5 font-semibold text-art-navy">Admin@2026</code>
                <br />
                Agent : <code className="rounded bg-white px-1.5 py-0.5 font-semibold text-art-navy">agent@art.cm</code> / <code className="rounded bg-white px-1.5 py-0.5 font-semibold text-art-navy">Agent@2026</code>
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-[11px] leading-relaxed text-slate-400">
            <span className="font-semibold text-slate-500">Prototype académique</span> — les données
            affichées sont des données de démonstration simulées et ne représentent pas des données
            officielles de l'ART.
          </p>
        </div>
      </div>
    </div>
  )
}
