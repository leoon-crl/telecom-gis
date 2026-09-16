import axios from 'axios'

/** Instance Axios centralisée — JWT automatique + déconnexion sur 401.
 *  VITE_API_URL : URL absolue de l'API quand le frontend est servi séparément
 *  (déploiement Render en site statique). Vide en local/Docker (même origine). */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('art_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (reponse) => reponse,
  (erreur) => {
    if (erreur.response?.status === 401 && !erreur.config.url.includes('/auth/login')) {
      localStorage.removeItem('art_token')
      localStorage.removeItem('art_utilisateur')
      if (window.location.pathname !== '/connexion') {
        window.location.href = '/connexion'
      }
    }
    return Promise.reject(erreur)
  }
)

export const messageErreur = (erreur, defaut = 'Une erreur est survenue') =>
  erreur?.response?.data?.detail || defaut

/** Télécharge un fichier exporté via l'API (avec en-tête JWT, via blob). */
export const telechargerFichier = async (url, params, nomFichier) => {
  const reponse = await api.get(url, { params, responseType: 'blob' })
  const lien = document.createElement('a')
  lien.href = URL.createObjectURL(reponse.data)
  lien.download = nomFichier
  document.body.appendChild(lien)
  lien.click()
  lien.remove()
  URL.revokeObjectURL(lien.href)
}

export default api
