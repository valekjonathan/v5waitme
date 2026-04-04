/**
 * Única fuente de verdad del mapa Mapbox (singleton). Map.jsx registra aquí; UI y mapControls leen.
 * @returns {import('mapbox-gl').Map | null}
 */
let mapInstance = null

/** Mismo `import()` para React.lazy y prefetch: una sola promesa en caché del runtime. */
export const loadMapModule = () => import('./components/Map.jsx')

/** Arranque temprano: descarga Map + mapbox-gl antes del primer Suspense del mapa. */
export function prefetchMapModule() {
  return loadMapModule()
}

export function setGlobalMapInstance(map) {
  mapInstance = map ?? null
}

export function getGlobalMapInstance() {
  return mapInstance
}
