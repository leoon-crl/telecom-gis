import { CloudUpload, FileCheck2, FileWarning, Info, Loader2 } from 'lucide-react'
import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import api, { messageErreur } from '../services/api'
import { EtatVide } from '../components/ui/Composants.jsx'
import { Bouton } from '../components/ui/Formulaire.jsx'

const TYPES = [
  { cle: 'antennes', libelle: 'Antennes relais (CSV / GeoJSON Point)' },
  { cle: 'centres', libelle: 'Centres techniques (CSV / GeoJSON Point)' },
  { cle: 'fibres', libelle: 'Tronçons fibre (GeoJSON LineString)' },
]

export default function ImportDonnees() {
  const [typeInfra, setTypeInfra] = useState('antennes')
  const [fichier, setFichier] = useState(null)
  const [aperçu, setApercu] = useState(null)
  const [chargement, setChargement] = useState(false)
  const [erreurFichier, setErreurFichier] = useState('')
  const referenceFichier = useRef(null)

  const choisirFichier = (ev) => {
    const f = ev.target.files?.[0]
    setApercu(null)
    setErreurFichier('')
    if (!f) return
    const ext = f.name.toLowerCase().split('.').pop()
    if (!['csv', 'geojson', 'json'].includes(ext)) {
      setErreurFichier(`Format « .${ext} » non pris en charge. Formats acceptés : CSV, GeoJSON.`)
      setFichier(null)
      return
    }
    if (typeInfra === 'fibres' && ext === 'csv') {
      setErreurFichier("L'import de tronçons de fibre nécessite un fichier GeoJSON (LineString).")
      setFichier(null)
      return
    }
    setFichier(f)
  }

  const envoyer = (confirmer) => {
    if (!fichier) return toast.error('Sélectionnez d' + "'" + 'abord un fichier.')
    setChargement(true)
    const donnees = new FormData()
    donnees.append('fichier', fichier)
    donnees.append('type_infra', typeInfra === 'fibres' ? 'auto' : typeInfra)
    donnees.append('confirmer', confirmer)
    api
      .post('/api/import/geojson', donnees, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => setApercu(r.data))
      .catch((e) => {
        setApercu(null)
        toast.error(messageErreur(e, "L'import a échoué."))
      })
      .finally(() => setChargement(false))
  }

  const envoyerCSV = (confirmer) => {
    if (!fichier) return toast.error('Sélectionnez d' + "'" + 'abord un fichier.')
    setChargement(true)
    const donnees = new FormData()
    donnees.append('fichier', fichier)
    donnees.append('type_infra', typeInfra)
    donnees.append('confirmer', confirmer)
    api
      .post('/api/import/csv', donnees, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => {
        setApercu(r.data)
        if (confirmer && r.data.inserte) {
          toast.success(`${r.data.nb_insertions} enregistrement(s) inséré(s) dans PostGIS.`)
        }
      })
      .catch((e) => {
        setApercu(null)
        toast.error(messageErreur(e, "L'import a échoué."))
      })
      .finally(() => setChargement(false))
  }

  const estGeoJSON = fichier?.name.toLowerCase().endsWith('.geojson') || fichier?.name.toLowerCase().endsWith('.json')
  const importer = (confirmer) => (estGeoJSON ? envoyer(confirmer) : envoyerCSV(confirmer))

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
        {/* Panneau de configuration */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-5 shadow-card">
            <h3 className="flex items-center gap-2 text-sm font-bold text-art-navy">
              <CloudUpload size={17} className="text-art-green" /> Importer des données
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Formats : CSV (lat/lng) et GeoJSON (Points, LineStrings). Les données sont validées,
              présentées en aperçu puis insérées dans PostgreSQL + PostGIS après confirmation.
            </p>

            <p className="mt-4 mb-1.5 text-xs font-semibold text-slate-600">Type d'infrastructures</p>
            <div className="space-y-1.5">
              {TYPES.map((t) => (
                <label
                  key={t.cle}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium transition ${
                    typeInfra === t.cle ? 'bg-art-navy text-white' : 'bg-art-bg text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <input
                    type="radio"
                    name="type"
                    checked={typeInfra === t.cle}
                    onChange={() => {
                      setTypeInfra(t.cle)
                      setFichier(null)
                      setApercu(null)
                      setErreurFichier('')
                    }}
                    className="h-3.5 w-3.5 accent-art-gold"
                  />
                  {t.libelle}
                </label>
              ))}
            </div>

            <p className="mt-4 mb-1.5 text-xs font-semibold text-slate-600">Fichier</p>
            <button
              onClick={() => referenceFichier.current?.click()}
              className={`flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 transition ${
                fichier ? 'border-art-green bg-green-50/50' : 'border-slate-300 bg-art-bg hover:border-art-navy/50'
              }`}
            >
              {fichier ? (
                <>
                  <FileCheck2 size={26} className="text-art-green" />
                  <p className="text-xs font-bold text-art-navy">{fichier.name}</p>
                  <p className="text-[10px] text-slate-400">{(fichier.size / 1024).toFixed(1)} Ko — cliquez pour changer</p>
                </>
              ) : (
                <>
                  <CloudUpload size={26} className="text-slate-400" />
                  <p className="text-xs font-semibold text-slate-500">Cliquez pour sélectionner un fichier</p>
                  <p className="text-[10px] text-slate-400">CSV (.csv) ou GeoJSON (.geojson, .json)</p>
                </>
              )}
            </button>
            <input ref={referenceFichier} type="file" accept=".csv,.geojson,.json" onChange={choisirFichier} className="hidden" />
            {erreurFichier && (
              <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-art-red">
                <FileWarning size={14} className="mt-0.5 shrink-0" /> {erreurFichier}
              </p>
            )}

            <div className="mt-4 flex gap-2.5">
              <Bouton onClick={() => importer(false)} chargement={chargement} variante="secondaire" className="flex-1" disabled={!fichier}>
                Vérifier et prévisualiser
              </Bouton>
              <Bouton onClick={() => importer(true)} chargement={chargement} variante="vert" className="flex-1" disabled={!fichier || !aperçu}>
                Confirmer l'insertion
              </Bouton>
            </div>
          </div>

          <div className="rounded-2xl bg-art-navy p-5 text-white shadow-card">
            <h4 className="flex items-center gap-2 text-sm font-bold">
              <Info size={16} className="text-art-gold" /> Format attendu
            </h4>
            <ul className="mt-3 space-y-1.5 text-[11px] leading-relaxed text-white/70">
              <li>• <strong>CSV</strong> : colonnes <code>nom</code>, <code>latitude</code>, <code>longitude</code> obligatoires (alias : lat/lng, lon…). Champs optionnels : operateur, technologie, statut, ville, region, hauteur, puissance, date_installation.</li>
              <li>• <strong>GeoJSON Point</strong> : propriétés <code>nom</code> obligatoire, autres champs reconnus automatiquement.</li>
              <li>• <strong>GeoJSON LineString</strong> : tracé du tronçon + propriétés <code>nom</code>, <code>origine</code>, <code>destination</code>.</li>
              <li>• La longueur des tronçons est calculée par PostGIS (ST_Length).</li>
            </ul>
          </div>
        </div>

        {/* Résultat de validation */}
        <div className="rounded-2xl bg-white p-5 shadow-card">
          <h3 className="text-sm font-bold text-art-navy">Contrôle de cohérence et aperçu</h3>

          {!aperçu && chargement && (
            <div className="flex items-center justify-center py-20 text-slate-300">
              <Loader2 size={26} className="animate-spin" />
            </div>
          )}

          {!aperçu && !chargement && (
            <EtatVide
              titre="Aucun fichier analysé"
              texte="Sélectionnez un fichier puis cliquez sur « Vérifier et prévisualiser » pour afficher le contrôle de validation."
            />
          )}

          {aperçu && (
            <div className="fade-up mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ['Lignes du fichier', aperçu.total_lignes, 'text-art-navy'],
                  ['Lignes valides', aperçu.lignes_valides, 'text-art-green'],
                  ['Erreurs', aperçu.nb_erreurs, aperçu.nb_erreurs ? 'text-art-red' : 'text-slate-400'],
                  ['Doublons en base', aperçu.codes_deja_presents?.length || 0, 'text-amber-600'],
                ].map(([t, v, c]) => (
                  <div key={t} className="rounded-xl bg-art-bg p-3 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{t}</p>
                    <p className={`mt-0.5 text-xl font-extrabold ${c}`}>{v}</p>
                  </div>
                ))}
              </div>

              {aperçu.nb_erreurs > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-xs font-bold text-art-red2">
                    {aperçu.nb_erreurs} erreur(s) de validation détectée(s) :
                  </p>
                  <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-[11px] text-art-red2/90">
                    {aperçu.erreurs.map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] font-medium text-art-red2">
                    Seules les lignes valides seront insérées dans la base.
                  </p>
                </div>
              )}

              {aperçu.codes_deja_presents?.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-700">
                  Codes déjà présents en base (ils seront ignorés ou créeront un doublon à
                  vérifier) : {aperçu.codes_deja_presents.slice(0, 8).join(', ')}
                  {aperçu.codes_deja_presents.length > 8 ? '…' : ''}
                </div>
              )}

              <div>
                <p className="mb-2 text-xs font-bold text-slate-600">
                  Aperçu des 10 premières lignes valides {aperçu.inserte ? '— DONNÉES INSÉRÉES ✓' : ''}
                </p>
                <div className="overflow-x-auto rounded-xl ring-1 ring-slate-100">
                  <table className="table-art w-full min-w-[640px]">
                    <thead>
                      <tr className="bg-art-bg/60">
                        <th>Nom</th><th>Code</th><th>Opérateur</th><th>Type</th>
                        {aperçu.type_infra === 'antennes' && <th>Techno.</th>}
                        {aperçu.type_infra !== 'antennes' && <th>Capacité</th>}
                        <th>Lat / Lng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aperçu.apercu.map((l, i) => (
                        <tr key={i}>
                          <td className="font-semibold text-art-navy">{l.nom}</td>
                          <td className="text-slate-500">{l.code}</td>
                          <td className="text-slate-600">{l.operateur}</td>
                          <td className="text-slate-500">{l.type}</td>
                          {aperçu.type_infra === 'antennes' ? (
                            <td><span className="badge bg-art-navy text-white">{l.technologie}</span></td>
                          ) : (
                            <td className="text-slate-500">{l.capacite || '—'}</td>
                          )}
                          <td className="font-mono text-[11px] text-slate-500">
                            {l.latitude?.toFixed(4)}, {l.longitude?.toFixed(4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {aperçu.inserte && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-xs font-semibold text-green-800">
                  ✓ Import terminé : {aperçu.nb_insertions} enregistrement(s) inséré(s) dans la base
                  spatiale. L'action a été journalisée. Consultez la carte ou les tableaux pour vérifier.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
