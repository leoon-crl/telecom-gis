import { createContext, useContext, useEffect, useState } from 'react'
import api from '../services/api'

const ContexteAuth = createContext(null)

export function FournisseurAuth({ children }) {
  const [utilisateur, setUtilisateur] = useState(null)
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('art_token')
    if (!token) {
      setChargement(false)
      return
    }
    api
      .get('/api/auth/me')
      .then((r) => setUtilisateur(r.data))
      .catch(() => {
        localStorage.removeItem('art_token')
        localStorage.removeItem('art_utilisateur')
      })
      .finally(() => setChargement(false))
  }, [])

  const connexion = async (email, motDePasse) => {
    const r = await api.post('/api/auth/login', { email, password: motDePasse })
    localStorage.setItem('art_token', r.data.access_token)
    localStorage.setItem('art_utilisateur', JSON.stringify(r.data.user))
    setUtilisateur(r.data.user)
    return r.data.user
  }

  const deconnexion = () => {
    localStorage.removeItem('art_token')
    localStorage.removeItem('art_utilisateur')
    setUtilisateur(null)
  }

  return (
    <ContexteAuth.Provider
      value={{ utilisateur, connexion, deconnexion, chargement, setUtilisateur }}
    >
      {children}
    </ContexteAuth.Provider>
  )
}

export const useAuth = () => useContext(ContexteAuth)
