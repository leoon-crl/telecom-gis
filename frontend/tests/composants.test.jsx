import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import toast from 'react-hot-toast'

import PageConnexion from '../src/pages/Connexion.jsx'
import PanneauCouches from '../src/components/map/PanneauCouches.jsx'
import TableauDeBord from '../src/pages/TableauDeBord.jsx'

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const connexion = vi.fn()
const contexteFictif = {
  utilisateur: null,
  connexion,
  deconnexion: vi.fn(),
  chargement: false,
  setUtilisateur: vi.fn(),
}

vi.mock('../src/hooks/useAuth.jsx', () => ({
  useAuth: () => contexteFictif,
  FournisseurAuth: ({ children }) => <div>{children}</div>,
}))

vi.mock('../src/services/api', () => ({
  default: {
    get: vi.fn((url) => {
      if (url.endsWith('/statistiques')) {
        return Promise.resolve({
          data: {
            total_antennes: 134,
            total_centres: 30,
            total_fibres: 36,
            longueur_totale_fibre_km: 4197.4,
            nb_operateurs: 4,
            antennes_actives: 112,
            antennes_hors_service: 4,
          },
        })
      }
      return Promise.resolve({ data: [] })
    }),
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  messageErreur: (e, d) => d,
  telechargerFichier: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  contexteFictif.connexion = connexion
})

describe('Page de connexion', () => {
  it('affiche le titre de la plateforme', () => {
    render(
      <MemoryRouter>
        <PageConnexion />
      </MemoryRouter>
    )
    expect(screen.getByText('Plateforme SIG – Infrastructures Télécom')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument()
  })

  it('appelle la connexion puis affiche un succès', async () => {
    connexion.mockResolvedValue({ nom: 'Admin', role: 'ADMIN' })
    render(
      <MemoryRouter>
        <PageConnexion />
      </MemoryRouter>
    )
    await userEvent.type(screen.getByLabelText('Email'), 'admin@art.cm')
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'Admin@2026')
    await userEvent.click(screen.getByRole('button', { name: /se connecter/i }))
    await waitFor(() => expect(connexion).toHaveBeenCalledWith('admin@art.cm', 'Admin@2026'))
    expect(toast.success).toHaveBeenCalled()
  })

  it('affiche une erreur en cas de mauvais identifiants', async () => {
    connexion.mockRejectedValue({ response: { data: { detail: 'Email ou mot de passe incorrect' } } })
    render(
      <MemoryRouter>
        <PageConnexion />
      </MemoryRouter>
    )
    await userEvent.type(screen.getByLabelText('Email'), 'admin@art.cm')
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'faux')
    await userEvent.click(screen.getByRole('button', { name: /se connecter/i }))
    await waitFor(() =>
      expect(screen.getByText('Email ou mot de passe incorrect')).toBeInTheDocument()
    )
  })
})

describe('Panneau des couches cartographiques', () => {
  it('affiche les 4 couches et gère le basculement', async () => {
    const basculer = vi.fn()
    const couches = { antennes: true, fibres: true, centres: true, limites: false }
    render(
      <PanneauCouches couches={couches} onBasculer={basculer} fond="sombre" onFond={vi.fn()} />
    )
    expect(screen.getByText('Antennes relais')).toBeInTheDocument()
    expect(screen.getByText('Réseaux fibre optique')).toBeInTheDocument()
    expect(screen.getByText('Centres techniques')).toBeInTheDocument()
    expect(screen.getByText('Limites administratives')).toBeInTheDocument()

    const caseAntennes = screen.getByRole('checkbox', { name: /antennes relais/i })
    expect(caseAntennes.checked).toBe(true)
    await userEvent.click(caseAntennes)
    expect(basculer).toHaveBeenCalledWith('antennes')
  })
})

describe('Tableau de bord', () => {
  it('affiche les KPI issus de l API', async () => {
    render(
      <MemoryRouter>
        <TableauDeBord />
      </MemoryRouter>
    )
    await waitFor(() => expect(screen.getByText('134')).toBeInTheDocument())
    expect(screen.getByText('30')).toBeInTheDocument()
    expect(screen.getByText(/4 197,4 km/i)).toBeInTheDocument()
  })
})
