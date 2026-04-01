/** Estado de interacción del mapa singleton (para reaplicar tras cambiar estilo). */
let readOnly = true

export function setMapReadOnlySession(value) {
  readOnly = Boolean(value)
}

export function getMapReadOnlySession() {
  return readOnly
}
