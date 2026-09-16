/** Palette opérateurs / statuts / technologies — identité visuelle ART. */

export const COULEURS_OPERATEURS = {
  CAMTEL: '#00843D',
  'MTN Cameroun': '#F2B705',
  'Orange Cameroun': '#FF7900',
  'Nexttel (Viettel)': '#2563EB',
}

export const COULEURS_STATUTS = {
  ACTIF: '#16A34A',
  MAINTENANCE: '#F59E0B',
  PROJET: '#6366F1',
  HORS_SERVICE: '#EF3340',
}

export const LIBELLES_STATUTS = {
  ACTIF: 'En service',
  MAINTENANCE: 'En maintenance',
  PROJET: 'En projet',
  HORS_SERVICE: 'Hors service',
}

export const TECHNOLOGIES = ['2G', '3G', '4G', '5G']
export const STATUTS = ['ACTIF', 'MAINTENANCE', 'PROJET', 'HORS_SERVICE']

/** Bascule carte : fond sombre « cartographie intelligente » (Esri, sans clé), OSM et satellite. */
export const FONDS_DE_CARTE = {
  sombre: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri — Sources: Esri, HERE, Garmin, FAO, NOAA, USGS',
  },
  standard: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">Contributeurs OpenStreetMap</a>',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics',
  },
}

export const CENTRE_CAMEROUN = [5.7, 12.35]
export const ZOOM_CAMEROUN = 6.2
