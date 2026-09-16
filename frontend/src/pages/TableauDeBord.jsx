import { Activity, Antenna, BarChart3, Building2, Cable, Layers, Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import api from '../services/api'
import { COULEURS_OPERATEURS, LIBELLES_STATUTS } from '../utils/couleurs.js'
import { EtatVide, KpiCard } from '../components/ui/Composants.jsx'

const COULEURS_TECHNO = { '2G': '#94A3B8', '3G': '#64748B', '4G': '#1B4480', '5G': '#00843D' }
const COULEURS_PIE = ['#00843D', '#F2B705', '#FF7900', '#2563EB', '#EF3340', '#14B8A6', '#8B5CF6']

function CarteGraphique({ titre, sousTitre, children, chargement }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-card">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-art-navy">{titre}</h3>
        {sousTitre && <p className="text-xs text-slate-400">{sousTitre}</p>}
      </div>
      {chargement ? (
        <div className="flex h-64 items-center justify-center text-slate-300">
          <Loader2 className="animate-spin" size={26} />
        </div>
      ) : (
        <div className="h-64">{children}</div>
      )}
    </div>
  )
}

const styleTooltip = {
  borderRadius: 12,
  border: '1px solid #E2E8F0',
  fontSize: 12,
  boxShadow: '0 8px 24px rgba(11,36,71,.12)',
}

export default function TableauDeBord() {
  const [resume, setResume] = useState(null)
  const [parRegion, setParRegion] = useState([])
  const [parOperateur, setParOperateur] = useState([])
  const [parTechnologie, setParTechnologie] = useState([])
  const [parStatut, setParStatut] = useState([])
  const [centresRegion, setCentresRegion] = useState([])
  const [evolution, setEvolution] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/api/statistiques'),
      api.get('/api/statistiques/antennes-region'),
      api.get('/api/statistiques/operateurs'),
      api.get('/api/statistiques/technologies'),
      api.get('/api/statistiques/statuts'),
      api.get('/api/statistiques/centres-region'),
      api.get('/api/statistiques/evolution'),
    ])
      .then(
        ([
          r1,
          r2,
          r3,
          r4,
          r5,
          r6,
          r7,
        ]) => {
          setResume(r1.data)
          setParRegion(r2.data)
          setParOperateur(r3.data)
          setParTechnologie(r4.data)
          setParStatut(r5.data)
          setCentresRegion(r6.data)
          setEvolution(r7.data)
        }
      )
      .catch(() => setErreur('Impossible de charger les statistiques depuis la base de données.'))
      .finally(() => setChargement(false))
  }, [])

  const donneesStatuts = useMemo(
    () => parStatut.map((s) => ({ nom: LIBELLES_STATUTS[s.statut] || s.statut, valeur: s.total })),
    [parStatut]
  )
  const donneesOperateurs = useMemo(
    () => parOperateur.map((o) => ({ nom: o.operateur, valeur: o.total })),
    [parOperateur]
  )

  if (erreur) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-art-red2">
          {erreur}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Bandeau */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-art-navy via-art-navy2 to-art-navy p-6 text-white shadow-card">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, #14A85C 0%, transparent 65%)' }}
        />
        <h2 className="text-lg font-extrabold md:text-xl">
          Suivi national des infrastructures de télécommunications
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-white/70">
          Indicateurs calculés en temps réel depuis la base spatiale PostgreSQL + PostGIS.
          Données de démonstration — prototype académique.
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard titre="Antennes relais" valeur={resume?.total_antennes ?? '—'} icone={Antenna} couleur="#00843D" chargement={chargement} sousTitre="sites de transmission" />
        <KpiCard titre="Centres techniques" valeur={resume?.total_centres ?? '—'} icone={Building2} couleur="#1B4480" chargement={chargement} sousTitre="nœuds et data centers" />
        <KpiCard titre="Longueur de fibre" valeur={resume ? `${resume.longueur_totale_fibre_km.toLocaleString('fr-FR')} km` : '—'} icone={Cable} couleur="#F2B705" chargement={chargement} sousTitre={`${resume?.total_fibres ?? 0} tronçons`} />
        <KpiCard titre="Opérateurs" valeur={resume?.nb_operateurs ?? '—'} icone={Layers} couleur="#FF7900" chargement={chargement} sousTitre="opérateurs déclarés" />
        <KpiCard titre="Antennes actives" valeur={resume?.antennes_actives ?? '—'} icone={Activity} couleur="#14B8A6" chargement={chargement} sousTitre="en service" />
        <KpiCard titre="Hors service" valeur={resume?.antennes_hors_service ?? '—'} icone={BarChart3} couleur="#EF3340" chargement={chargement} sousTitre="à la maintenance" />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <CarteGraphique titre="Antennes par région" sousTitre="répartition territoriale" chargement={chargement}>
          {parRegion.length === 0 ? (
            <EtatVide />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={parRegion} margin={{ top: 4, right: 8, left: -18, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EDF1F7" />
                <XAxis dataKey="region" tick={{ fontSize: 10, fill: '#64748B' }} angle={-28} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                <Tooltip contentStyle={styleTooltip} />
                <Bar dataKey="total" name="Antennes" fill="#00843D" radius={[6, 6, 0, 0]} maxBarSize={38} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CarteGraphique>

        <CarteGraphique titre="Antennes par opérateur" sousTitre="part des opérateurs" chargement={chargement}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={donneesOperateurs} dataKey="valeur" nameKey="nom" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {donneesOperateurs.map((entree, i) => (
                  <Cell key={entree.nom} fill={COULEURS_OPERATEURS[entree.nom] || COULEURS_PIE[i % COULEURS_PIE.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={styleTooltip} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </CarteGraphique>

        <CarteGraphique titre="Répartition des technologies" sousTitre="2G / 3G / 4G / 5G" chargement={chargement}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={parTechnologie} margin={{ top: 4, right: 8, left: -18, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDF1F7" />
              <XAxis dataKey="technologie" tick={{ fontSize: 12, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
              <Tooltip contentStyle={styleTooltip} />
              <Bar dataKey="total" name="Antennes" radius={[6, 6, 0, 0]} maxBarSize={54}>
                {parTechnologie.map((t) => (
                  <Cell key={t.technologie} fill={COULEURS_TECHNO[t.technologie] || '#1B4480'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CarteGraphique>

        <CarteGraphique titre="Répartition des statuts" sousTitre="état opérationnel des antennes" chargement={chargement}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={donneesStatuts} dataKey="valeur" nameKey="nom" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {donneesStatuts.map((entree, i) => (
                  <Cell key={entree.nom} fill={COULEURS_PIE[i % COULEURS_PIE.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={styleTooltip} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </CarteGraphique>

        <CarteGraphique titre="Centres techniques par région" sousTitre="couverture des nœuds techniques" chargement={chargement}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={centresRegion} margin={{ top: 4, right: 8, left: -18, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDF1F7" />
              <XAxis dataKey="region" tick={{ fontSize: 10, fill: '#64748B' }} angle={-28} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
              <Tooltip contentStyle={styleTooltip} />
              <Bar dataKey="total" name="Centres" fill="#1B4480" radius={[6, 6, 0, 0]} maxBarSize={38} />
            </BarChart>
          </ResponsiveContainer>
        </CarteGraphique>

        <CarteGraphique titre="Évolution des installations" sousTitre="antennes installées par année" chargement={chargement}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolution} margin={{ top: 4, right: 12, left: -18, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDF1F7" />
              <XAxis dataKey="annee" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
              <Tooltip contentStyle={styleTooltip} />
              <Line type="monotone" dataKey="total" name="Antennes installées" stroke="#00843D" strokeWidth={2.5} dot={{ r: 3.5, fill: '#F2B705', strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </CarteGraphique>
      </div>
    </div>
  )
}
