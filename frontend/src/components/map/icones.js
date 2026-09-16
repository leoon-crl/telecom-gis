/** Marqueurs personnalisés Leaflet (divIcon SVG) — style inspiré de la couverture ART. */
import L from 'leaflet'

const COULEURS_OPERATEURS = {
  CAMTEL: '#00843D',
  'MTN Cameroun': '#F2B705',
  'Orange Cameroun': '#FF7900',
  'Nexttel (Viettel)': '#2563EB',
}

export function couleurAntenne(operateur) {
  return COULEURS_OPERATEURS[operateur] || '#1B4480'
}

function iconePoint(couleur, symboleInterieur) {
  return L.divIcon({
    className: 'art-marker',
    html: `
      <svg width="30" height="42" viewBox="0 0 30 42">
        <path d="M15 1C7.3 1 1 7.3 1 15c0 10.2 12.4 24.3 12.9 24.9.3.3.7.3 1 0C15.6 39.3 28 25.2 28 15 28 7.3 22.7 1 15 1z"
              fill="${couleur}" stroke="#ffffff" stroke-width="1.8"/>
        <g transform="translate(6,6) scale(0.75)">${symboleInterieur}</g>
      </svg>`,
    iconSize: [30, 42],
    iconAnchor: [15, 40],
    popupAnchor: [0, -38],
  })
}

const SVG_ANTENNE = `
  <g fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round">
    <path d="M4 13 L9 4 L14 13 Z" fill="#fff" fill-opacity="0.9" stroke="none"/>
    <rect x="8.1" y="12" width="1.8" height="5" fill="#fff" stroke="none" rx="0.8"/>
    <path d="M2.2 5.5 a6.5 6.5 0 0 1 3-3" stroke-opacity="0.95"/>
    <path d="M13.8 2.5 a6.5 6.5 0 0 1 3 3" stroke-opacity="0.95"/>
  </g>`

const SVG_CENTRE = `
  <g fill="#fff">
    <rect x="3.2" y="6.5" width="11.6" height="9" rx="1"/>
    <rect x="5.4" y="8.4" width="2.2" height="2.2" fill="${'#0B2447'}"/>
    <rect x="10.4" y="8.4" width="2.2" height="2.2" fill="#0B2447"/>
    <rect x="5.4" y="11.8" width="2.2" height="2.2" fill="#0B2447"/>
    <rect x="10.4" y="11.8" width="2.2" height="2.2" fill="#0B2447"/>
    <rect x="7.6" y="2.6" width="2.8" height="4" rx="0.6"/>
  </g>`

export const iconeAntenne = (operateur, technologie) =>
  iconePoint(couleurAntenne(operateur), SVG_ANTENNE)

export const iconeCentre = () => iconePoint('#1B4480', SVG_CENTRE)

export const iconeResultat = (couleur = '#EF3340') =>
  L.divIcon({
    className: 'art-marker',
    html: `<svg width="22" height="22" viewBox="0 0 22 22">
      <circle cx="11" cy="11" r="8.5" fill="${couleur}" stroke="#fff" stroke-width="2.4"/>
    </svg>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })

export function styleFibre(fibre, selectionnee = false) {
  const couleurs = {
    CAMTEL: '#00E676',
    'MTN Cameroun': '#FFD54F',
    'Orange Cameroun': '#FF8A65',
    'Nexttel (Viettel)': '#64B5F6',
  }
  const statuts = { ACTIF: 3.2, MAINTENANCE: 2.6, PROJET: 2.2, HORS_SERVICE: 1.6 }
  return {
    color: selectionnee ? '#ffffff' : couleurs[fibre.operateur] || '#00E676',
    weight: selectionnee ? 5.5 : statuts[fibre.statut] || 3,
    opacity: fibre.statut === 'HORS_SERVICE' ? 0.45 : 0.92,
    dashArray: fibre.statut === 'PROJET' ? '6 8' : fibre.statut === 'MAINTENANCE' ? '10 6' : undefined,
  }
}

export function styleRegion() {
  return {
    color: '#FDB913',
    weight: 1.6,
    opacity: 0.55,
    fillColor: '#FDB913',
    fillOpacity: 0.05,
    dashArray: '4 6',
  }
}
