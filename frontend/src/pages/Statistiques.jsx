import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
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
import api, { telechargerFichier } from '../services/api'
import { EtatVide } from '../components/ui/Composants.jsx'
import { COULEURS_OPERATEURS, LIBELLES_STATUTS } from '../utils/couleurs.js'
import toast from 'react-hot-toast'

const COULEURS_TECHNO = { '2G': '#94A3B8', '3G': '#64748B', '4G': '#1B4480', '5G': '#00843D' }
const styleTooltip = {
  borderRadius: 12,
  border: '1px solid #E2E8F0',
  fontSize: 12,
  boxShadow: '0 8px 24px rgba(11,36,71,.12)',
}

function CarteGraphique({ titre, sousTitre, children, hauteur = 'h-72' }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-card">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-art-navy">{titre}</h3>
        {sousTitre && <p className="text-xs text-slate-400">{sousTitre}</p>}
      </div>
      <div className={hauteur}>{children}</div>
    </div>
  )
}

function TableauStat({ titre, colonnes, lignes }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-card">
      <h3 className="mb-3 text-sm font-bold text-art-navy">{titre}</h3>
      <table className="table-art w-full">
        <thead>
          <tr className="bg-art-bg/60">
            {colonnes.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.map((l, i) => (
            <tr key={i}>
              {l.map((cellule, j) => (
                <td key={j} className={j === 0 ? 'font-semibold text-art-navy' : 'text-slate-600'}>
                  {cellule}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Statistiques() {
  const [donnee, setDonnee] = useState({})
  const [chargement, setChargement] = useState(true)

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
          r1, r2, r3, r4, r5, r6, r7,
        ]) =>
          setDonnee({
            resume: r1.data,
            region: r2.data,
            operateurs: r3.data,
            technologies: r4.data,
            statuts: r5.data,
            centresRegion: r6.data,
            evolution: r7.data,
          })
      )
      .catch(() => toast.error('Impossible de charger les statistiques.'))
      .finally(() => setChargement(false))
  }, [])

  const exporter = async (entite, format) => {
    try {
      await telechargerFichier(
        `/api/export/${entite}`,
        { format },
        `${entite}_art.${format === 'geojson' ? 'geojson' : 'csv'}`
      )
      toast.success('Export téléchargé.')
    } catch {
      toast.error("L'export a échoué.")
    }
  }

  if (chargement) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-300">
        <Loader2 size={30} className="animate-spin" />
      </div>
    )
  }

  const { resume, region, operateurs, technologies, statuts, centresRegion, evolution } = donnee

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-art-navy">Statistiques détaillées</h2>
          <p className="text-xs text-slate-500">
            Agrégats calculés par PostgreSQL (GROUP BY, SUM, COUNT, EXTRACT) — aucune valeur codée en dur.
          </p>
        </div>
        <div className="flex gap-2">
          {[
            ['antennes', 'Antennes'],
            ['fibres', 'Fibres'],
            ['centres', 'Centres'],
          ].map(([entite, libelle]) => (
            <div key={entite} className="flex overflow-hidden rounded-xl ring-1 ring-slate-200">
              <span className="bg-white px-3 py-2 text-xs font-bold text-art-navy">{libelle}</span>
              <button onClick={() => exporter(entite, 'csv')} className="bg-white px-2.5 py-2 text-[10px] font-bold text-art-green transition hover:bg-art-bg">
                CSV
              </button>
              <button onClick={() => exporter(entite, 'geojson')} className="bg-white px-2.5 py-2 text-[10px] font-bold text-art-navy transition hover:bg-art-bg">
                GeoJSON
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Synthèse chiffrée */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
        {[
          ['Antennes', resume?.total_antennes],
          ['Centres', resume?.total_centres],
          ['Tronçons fibre', resume?.total_fibres],
          ['Fibre (km)', resume?.longueur_totale_fibre_km?.toLocaleString('fr-FR')],
          ['Opérateurs', resume?.nb_operateurs],
          ['Ant. actives', resume?.antennes_actives],
          ['Centres actifs', resume?.centres_actifs],
          ['Fibres actives', resume?.fibres_actives],
        ].map(([t, v]) => (
          <div key={t} className="rounded-xl bg-white p-4 text-center shadow-card">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{t}</p>
            <p className="mt-1 text-xl font-extrabold text-art-navy">{v ?? '—'}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <CarteGraphique titre="Antennes par région" sousTitre="COUNT par GROUP BY région">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={region} margin={{ top: 4, right: 8, left: -18, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDF1F7" />
              <XAxis dataKey="region" tick={{ fontSize: 10, fill: '#64748B' }} angle={-28} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
              <Tooltip contentStyle={styleTooltip} />
              <Bar dataKey="total" name="Antennes" fill="#00843D" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </CarteGraphique>

        <CarteGraphique titre="Antennes par opérateur">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={operateurs} dataKey="total" nameKey="operateur" innerRadius={60} outerRadius={100} paddingAngle={2}>
                {operateurs.map((o) => (
                  <Cell key={o.operateur} fill={COULEURS_OPERATEURS[o.operateur] || '#1B4480'} />
                ))}
              </Pie>
              <Tooltip contentStyle={styleTooltip} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </CarteGraphique>

        <CarteGraphique titre="Technologies déployées">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={technologies} margin={{ top: 4, right: 8, left: -18, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDF1F7" />
              <XAxis dataKey="technologie" tick={{ fontSize: 12, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
              <Tooltip contentStyle={styleTooltip} />
              <Bar dataKey="total" name="Antennes" radius={[6, 6, 0, 0]} maxBarSize={56}>
                {technologies.map((t) => (
                  <Cell key={t.technologie} fill={COULEURS_TECHNO[t.technologie] || '#1B4480'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CarteGraphique>

        <CarteGraphique titre="Centres techniques par région">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={centresRegion} margin={{ top: 4, right: 8, left: -18, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDF1F7" />
              <XAxis dataKey="region" tick={{ fontSize: 10, fill: '#64748B' }} angle={-28} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
              <Tooltip contentStyle={styleTooltip} />
              <Bar dataKey="total" name="Centres" fill="#1B4480" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </CarteGraphique>

        <CarteGraphique titre="Évolution des installations par année" sousTitre="EXTRACT(YEAR FROM date_installation)">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolution} margin={{ top: 4, right: 12, left: -18, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDF1F7" />
              <XAxis dataKey="annee" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
              <Tooltip contentStyle={styleTooltip} />
              <Line type="monotone" dataKey="total" name="Antennes" stroke="#00843D" strokeWidth={2.5} dot={{ r: 3.5, fill: '#F2B705', strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </CarteGraphique>

        <div className="grid gap-4">
          <TableauStat
            titre="Antennes par région (tableau)"
            colonnes={['Région', 'Antennes']}
            lignes={region.map((r) => [r.region, r.total])}
          />
          <TableauStat
            titre="Statuts des antennes"
            colonnes={['Statut', 'Nombre']}
            lignes={statuts.map((s) => [LIBELLES_STATUTS[s.statut] || s.statut, s.total])}
          />
        </div>
      </div>

      {region.length === 0 && <EtatVide titre="Aucune donnée" />}
    </div>
  )
}
