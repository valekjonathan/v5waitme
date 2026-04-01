/** Instancia única del mapa Mapbox (registrada desde Map.jsx). Solo para controles UI. */
let mapInstance = null

export function setGlobalMapInstance(map) {
  mapInstance = map
}

export function getGlobalMapInstance() {
  return mapInstance
}
