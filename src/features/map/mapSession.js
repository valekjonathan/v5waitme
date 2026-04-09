/** Estado de interacción del mapa singleton (para reaplicar tras cambiar estilo). */
let readOnly = true

/** Search: no seguir GPS al mover cámara. Parked/Home: alinear pin con ubicación real. */
let followUserGps = true

/** Solo pantalla parking «¿Dónde quieres aparcar?»: seguir cámara al GPS tras pulsar «Ubicación» hasta que el usuario arrastre. */
let searchFollowUserGps = false

/**
 * «Estoy aparcado aquí»: mientras true, cada tick GPS alinea el mapa al hueco del pin.
 * Se pone false al arrastrar/rotar/inclinar el mapa; solo vuelve true al pulsar «Ubicación» o al entrar de nuevo en parked.
 */
let parkedAutoAlignGps = true

export function setParkedAutoAlignGps(value) {
  parkedAutoAlignGps = Boolean(value)
}

export function getParkedAutoAlignGps() {
  return parkedAutoAlignGps
}

/** `search` | `parked` cuando `Map` usa `parkingBandPinAdjust`; null si no aplica. */
let parkingMapPinMode = null

/**
 * Home/Login (readOnly + pin hero): el centro se ajusta con la punta `[data-waitme-pin-tip]`.
 * Evita mezclar `__WAITME_PIN_OFFSET_Y__` en `jumpTo`/`flyTo` genéricos (`recenterGlobalMapOnUser`, etc.).
 */
let waitmePinOffsetYSuppressed = false

export function setWaitmePinOffsetYSuppressed(value) {
  waitmePinOffsetYSuppressed = Boolean(value)
}

export function getWaitmePinOffsetYSuppressed() {
  return waitmePinOffsetYSuppressed
}

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

export function setSearchFollowUserGps(value) {
  searchFollowUserGps = Boolean(value)
}

export function getSearchFollowUserGps() {
  return searchFollowUserGps
}

export function setParkingMapPinMode(mode) {
  parkingMapPinMode = mode === 'search' || mode === 'parked' ? mode : null
}

export function getParkingMapPinMode() {
  return parkingMapPinMode
}
