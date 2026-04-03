/** Estado de interacción del mapa singleton (para reaplicar tras cambiar estilo). */
let readOnly = true

/** Search: no seguir GPS al mover cámara. Parked/Home: alinear pin con ubicación real. */
let followUserGps = true

export function setMapReadOnlySession(value) {
  readOnly = Boolean(value)
}

export function getMapReadOnlySession() {
  return readOnly
}

export function setMapFollowUserGps(value) {
  followUserGps = Boolean(value)
}

export function getMapFollowUserGps() {
  return followUserGps
}
