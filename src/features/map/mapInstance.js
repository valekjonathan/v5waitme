/**
 * Única fuente de verdad del mapa Mapbox (singleton). Map.jsx registra aquí; UI y mapControls leen.
 * @returns {import('mapbox-gl').Map | null}
 */
let mapInstance = null

export function setGlobalMapInstance(map) {
  mapInstance = map ?? null
}

export function getGlobalMapInstance() {
  return mapInstance
}
