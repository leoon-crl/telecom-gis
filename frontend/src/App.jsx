import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './hooks/useAuth.jsx'
import PageConnexion from './pages/Connexion.jsx'
import MainLayout from './layouts/MainLayout.jsx'
import TableauDeBord from './pages/TableauDeBord.jsx'
import CarteSIG from './pages/CarteSIG.jsx'
import Antennes from './pages/Antennes.jsx'
import Fibres from './pages/Fibres.jsx'
import Centres from './pages/Centres.jsx'
import Analyses from './pages/Analyses.jsx'
import Statistiques from './pages/Statistiques.jsx'
import ImportDonnees from './pages/ImportDonnees.jsx'
import Administration from './pages/Administration.jsx'
import Profil from './pages/Profil.jsx'

function RouteProtegee({ children, roleRequis }) {
  const { utilisateur, chargement } = useAuth()
  if (chargement) {
    return (
      <div className="flex h-screen items-center justify-center bg-art-navy">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
      </div>
    )
  }
  if (!utilisateur) return <Navigate to="/connexion" replace />
  if (roleRequis && utilisateur.role !== roleRequis) {
    return <Navigate to="/" replace />
  }
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<PageConnexion />} />
      <Route
        path="/"
        element={
          <RouteProtegee>
            <MainLayout />
          </RouteProtegee>
        }
      >
        <Route index element={<TableauDeBord />} />
        <Route path="carte" element={<CarteSIG />} />
        <Route path="antennes" element={<Antennes />} />
        <Route path="fibres" element={<Fibres />} />
        <Route path="centres" element={<Centres />} />
        <Route path="analyses" element={<Analyses />} />
        <Route path="statistiques" element={<Statistiques />} />
        <Route path="import" element={<ImportDonnees />} />
        <Route
          path="administration"
          element={
            <RouteProtegee roleRequis="ADMIN">
              <Administration />
            </RouteProtegee>
          }
        />
        <Route path="profil" element={<Profil />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
