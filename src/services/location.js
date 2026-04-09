/**
 * Fuente global de ubicación: un solo `watchPosition`, sin debounce/throttle ni descarte de ticks.
 * Cada lectura válida → low-pass (α dinámico por accuracy) + velocidad (deg/s→m/s) + predicción solo en movimiento → `notify()`.
 * Sin batching: un tick GPS procesado → una emisión.
 *
 * Simulación de deriva (solo dev explícito): `import.meta.env.DEV && import.meta.env.VITE_SIMULATE_GPS === '1'`.
 * Mac / PWA / WebView iOS: mismo código; `navigator.geolocation` (permisos del sistema / navegador).
 *
 * `createPositionGuard()` no interviene en este pipeline (tests u observabilidad opcional).
 */

/** Punto de partida solo para `VITE_SIMULATE_GPS` (no se usa como sustituto del GPS en dev). */
const DEV_BROWSER_MOCK_LAT = 43.3619
const DEV_BROWSER_MOCK_LNG = -5.8494

/** Opciones exigidas por producto: máxima frescura y alta precisión cuando el SO lo permite. */
const GEO_OPTS = { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }

const MAX_PLAUSIBLE_SPEED_MPS = 75
const MIN_IMPOSSIBLE_JUMP_M = 120

function isValidGps(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false
  return true
}

/** Lectura del `GeolocationPosition` del navegador → campos canónicos (sin filtrar por distancia). */
function payloadFromBrowserPosition(pos) {
  const lat = pos?.coords?.latitude
  const lng = pos?.coords?.longitude
  if (!isValidGps(lat, lng)) return null
  const c = pos?.coords
  const ts = Number.isFinite(pos?.timestamp) ? pos.timestamp : Date.now()
  const acc = typeof c?.accuracy === 'number' && Number.isFinite(c.accuracy) ? c.accuracy : null
  const heading = typeof c?.heading === 'number' && Number.isFinite(c.heading) ? c.heading : null
  const speed = typeof c?.speed === 'number' && Number.isFinite(c.speed) ? c.speed : null
  return { lat, lng, accuracy: acc, ts, heading, speed }
}

export function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

function normalizeGeoError(err) {
  const type = err?.code === 1 ? 'denied' : err?.code === 3 ? 'timeout' : 'error'
  return { type, code: err?.code ?? 0, raw: err }
}

function normalizeEvent(type, payload = {}) {
  return {
    type,
    timestamp: Number.isFinite(payload.timestamp) ? payload.timestamp : Date.now(),
    lat: Number.isFinite(payload.lat) ? payload.lat : null,
    lng: Number.isFinite(payload.lng) ? payload.lng : null,
    accuracy: Number.isFinite(payload.accuracy) ? payload.accuracy : null,
    confidence: Number.isFinite(payload.confidence) ? payload.confidence : null,
    tracking: typeof payload.tracking === 'string' ? payload.tracking : null,
    reason: typeof payload.reason === 'string' ? payload.reason : null,
  }
}

export async function sendEventToBackend(event) {
  const enabled = import.meta.env?.VITE_ENABLE_TRACKING_EVENT_FORWARD === '1'
  const endpoint = import.meta.env?.VITE_TRACKING_EVENTS_URL
  if (!enabled || !endpoint || typeof fetch !== 'function') return false

  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      keepalive: true,
    })
    return true
  } catch {
    return false
  }
}

function emit(emitEvent, persistEvent, type, payload) {
  const event = normalizeEvent(type, payload)
  if (typeof emitEvent === 'function') emitEvent(event)
  if (typeof persistEvent === 'function') void persistEvent(event)
}

export function getCurrentPosition(onSuccess, onError) {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    onError?.({ type: 'unavailable', code: 0, raw: null })
    return
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => onSuccess?.(payloadFromBrowserPosition(pos)),
    (err) => onError?.(normalizeGeoError(err)),
    GEO_OPTS
  )
}

let currentLocation = null
/** @type {Array<(loc: NonNullable<typeof currentLocation>) => void>} */
let subscribers = []
let locationTrackingStarted = false
/** @type {number | null} */
let geoWatchId = null

try {
  const cached = typeof localStorage !== 'undefined' ? localStorage.getItem('last_location') : null
  if (cached) {
    const parsed = JSON.parse(cached)
    if (
      parsed &&
      typeof parsed === 'object' &&
      Number.isFinite(parsed.latitude) &&
      Number.isFinite(parsed.longitude)
    ) {
      currentLocation = {
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        timestamp: Number.isFinite(parsed.timestamp) ? parsed.timestamp : Date.now(),
        accuracy: Number.isFinite(parsed.accuracy) ? parsed.accuracy : null,
        heading: Number.isFinite(parsed.heading) ? parsed.heading : null,
        speed: Number.isFinite(parsed.speed) ? parsed.speed : null,
      }
    }
  }
} catch {
  /* */
}

/** Raw GPS ya validado (antes del low-pass). */
let lastRaw = null
/** Última posición emitida (tras filtro + predicción); base del siguiente low-pass. */
let lastFiltered = null
let velocity = { lat: 0, lng: 0 }

function getAlpha(accuracy) {
  if (!accuracy) return 0.2
  if (accuracy < 10) return 0.15
  if (accuracy < 30) return 0.25
  return 0.35
}

/** Velocidad escalar (m/s) desde componentes en grados/s a la latitud dada (coherente con `speed` del API). */
function speedMetersPerSecondFromDegVelocity(velLatDegS, velLngDegS, latDeg) {
  if (!Number.isFinite(velLatDegS) || !Number.isFinite(velLngDegS) || !Number.isFinite(latDeg)) return 0
  const φ = (latDeg * Math.PI) / 180
  const mPerDegLat = 111320
  const mPerDegLng = 111320 * Math.cos(φ)
  const vn = velLatDegS * mPerDegLat
  const ve = velLngDegS * mPerDegLng
  return Math.sqrt(vn * vn + ve * ve)
}

/** Por debajo de esto se considera quieto: sin lookahead (evita “respirar” el mapa con ruido estático). */
const STATIONARY_SPEED_MPS = 0.35

/**
 * Low-pass (α por accuracy) + velocidad + predicción solo si hay movimiento real; un tick → una emisión vía `notify`.
 */
function emitSmoothedLocation(raw) {
  if (
    !raw ||
    !Number.isFinite(raw.latitude) ||
    !Number.isFinite(raw.longitude) ||
    !isValidGps(raw.latitude, raw.longitude)
  ) {
    return
  }

  const alpha = getAlpha(raw.accuracy)

  const filteredLat = lastFiltered
    ? lastFiltered.latitude + alpha * (raw.latitude - lastFiltered.latitude)
    : raw.latitude
  const filteredLng = lastFiltered
    ? lastFiltered.longitude + alpha * (raw.longitude - lastFiltered.longitude)
    : raw.longitude

  const dt = Math.max(
    (raw.timestamp - (lastRaw?.timestamp ?? raw.timestamp)) / 1000,
    0.016
  )

  velocity.lat = (filteredLat - (lastFiltered?.latitude ?? filteredLat)) / dt
  velocity.lng = (filteredLng - (lastFiltered?.longitude ?? filteredLng)) / dt

  const derivedMps = speedMetersPerSecondFromDegVelocity(velocity.lat, velocity.lng, raw.latitude)
  const speedForPrediction =
    raw.speed != null && Number.isFinite(raw.speed) && raw.speed >= 0 ? raw.speed : derivedMps

  let predictionTime = 0
  if (speedForPrediction > STATIONARY_SPEED_MPS) {
    if (speedForPrediction > 2.5) predictionTime = 0.42
    else if (speedForPrediction > 1.2) predictionTime = 0.25
    else predictionTime = 0.1
  }

  if (
    predictionTime > 0 &&
    typeof raw.accuracy === 'number' &&
    Number.isFinite(raw.accuracy) &&
    raw.accuracy > 40
  ) {
    predictionTime *= Math.max(0, 1 - (raw.accuracy - 40) / 120)
  }

  const predictedLat = filteredLat + velocity.lat * predictionTime
  const predictedLng = filteredLng + velocity.lng * predictionTime

  const finalLocation = {
    latitude: predictedLat,
    longitude: predictedLng,
    accuracy: raw.accuracy,
    heading: raw.heading ?? null,
    speed: raw.speed ?? null,
    timestamp: raw.timestamp,
  }

  notify(finalLocation)

  lastRaw = raw
  lastFiltered = finalLocation
}

/**
 * Única escritura de `currentLocation` desde el stream GPS / simulación.
 * Forma canónica: lat/lng obligatorios; resto opcional pero estable (null si no aplica).
 */
function notify(location) {
  if (
    !location ||
    !Number.isFinite(location.latitude) ||
    !Number.isFinite(location.longitude)
  ) {
    return
  }
  currentLocation = {
    latitude: location.latitude,
    longitude: location.longitude,
    timestamp: Number.isFinite(location.timestamp) ? location.timestamp : Date.now(),
    accuracy: Number.isFinite(location.accuracy) ? location.accuracy : null,
    heading:
      location.heading != null && Number.isFinite(location.heading) ? location.heading : null,
    speed: location.speed != null && Number.isFinite(location.speed) ? location.speed : null,
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('last_location', JSON.stringify(currentLocation))
    }
  } catch {
    /* */
  }
  subscribers.forEach((cb) => {
    try {
      cb(currentLocation)
    } catch {
      /* */
    }
  })
}

/**
 * Un único `watchPosition` global para toda la app. Idempotente.
 * Sin `getCurrentPosition` previo: el stream es la única fuente continua (evita doble notify inicial).
 *
 * Simulación de deriva GPS (solo dev, opcional): `VITE_SIMULATE_GPS=1` en `.env.local`.
 * @returns {void | (() => void)} cleanup solo si se activó el simulador (para `clearInterval`).
 */
export function startLocationTracking() {
  if (locationTrackingStarted) return
  locationTrackingStarted = true

  const simulateGpsEnabled =
    import.meta.env.DEV &&
    import.meta.env.VITE_SIMULATE_GPS === '1' &&
    typeof window !== 'undefined'

  if (simulateGpsEnabled) {
    let lat = DEV_BROWSER_MOCK_LAT
    let lng = DEV_BROWSER_MOCK_LNG
    const simulate = () => {
      lat += 0.00002
      lng += 0.00002
      emitSmoothedLocation({
        latitude: lat,
        longitude: lng,
        accuracy: 5,
        timestamp: Date.now(),
        heading: null,
        speed: null,
      })
    }
    simulate()
    const interval = window.setInterval(simulate, 1000)
    return () => {
      window.clearInterval(interval)
      locationTrackingStarted = false
    }
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) return

  if (geoWatchId != null) {
    try {
      navigator.geolocation.clearWatch(geoWatchId)
    } catch {
      /* */
    }
    geoWatchId = null
  }

  geoWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      const p = payloadFromBrowserPosition(pos)
      if (p)
        emitSmoothedLocation({
          latitude: p.lat,
          longitude: p.lng,
          accuracy: p.accuracy,
          timestamp: p.ts,
          heading: p.heading,
          speed: p.speed,
        })
    },
    () => {
      /* errores puntuales: el stream sigue vivo */
    },
    GEO_OPTS
  )
}

export function subscribeToLocation(cb) {
  if (typeof cb !== 'function') return () => {}

  subscribers.push(cb)
  if (currentLocation) {
    try {
      cb(currentLocation)
    } catch {
      /* */
    }
  }

  return () => {
    subscribers = subscribers.filter((x) => x !== cb)
  }
}

function getCurrentLocation() {
  return currentLocation
}

export const getCurrentLocationFast = getCurrentLocation

export function createPositionGuard(options = {}) {
  const { onEvent: emitEvent, persistEvent = sendEventToBackend, trajectoryValidator } = options

  let prevAccepted = null
  let badSpeedBursts = 0
  let teleportBursts = 0
  let suspiciousAccuracyShifts = 0
  let stableStreak = 0
  let unstableStreak = 0

  return function acceptPosition(nextValidated) {
    if (!nextValidated) {
      emit(emitEvent, persistEvent, 'position_discarded', { reason: 'invalid_payload' })
      return null
    }

    if (!prevAccepted) {
      const bootstrap = {
        ...nextValidated,
        confidence: clamp(1 - nextValidated.accuracy / 220, 0.35, 0.9),
        tracking: 'searching',
      }
      prevAccepted = bootstrap
      emit(emitEvent, persistEvent, 'tracking_changed', bootstrap)
      return bootstrap
    }

    const dtMs = Math.max(1, nextValidated.ts - prevAccepted.ts)
    const dtSec = Math.max(0.5, dtMs / 1000)
    const dMeters = distanceMeters(
      prevAccepted.lat,
      prevAccepted.lng,
      nextValidated.lat,
      nextValidated.lng
    )
    const speedMps = dMeters / dtSec

    if (speedMps > MAX_PLAUSIBLE_SPEED_MPS) badSpeedBursts += 1
    else badSpeedBursts = Math.max(0, badSpeedBursts - 1)

    if (dMeters > Math.max(MIN_IMPOSSIBLE_JUMP_M, prevAccepted.accuracy * 3.5) && dtSec < 2.2)
      teleportBursts += 1
    else teleportBursts = Math.max(0, teleportBursts - 1)

    const precisionRatio = nextValidated.accuracy / Math.max(1, prevAccepted.accuracy)
    if (precisionRatio > 3.2 || precisionRatio < 0.18) suspiciousAccuracyShifts += 1
    else suspiciousAccuracyShifts = Math.max(0, suspiciousAccuracyShifts - 1)

    if (speedMps > MAX_PLAUSIBLE_SPEED_MPS && dMeters > MIN_IMPOSSIBLE_JUMP_M) {
      emit(emitEvent, persistEvent, 'position_discarded', {
        reason: 'impossible_jump',
        lat: nextValidated.lat,
        lng: nextValidated.lng,
        accuracy: nextValidated.accuracy,
      })
      return null
    }

    const jitterThreshold = Math.max(7, Math.min(24, nextValidated.accuracy * 0.32))
    const isJitter = dMeters < jitterThreshold

    let lat = nextValidated.lat
    let lng = nextValidated.lng
    let accuracy = nextValidated.accuracy

    if (isJitter) {
      const alpha = clamp(0.18 + (prevAccepted.accuracy - nextValidated.accuracy) / 220, 0.08, 0.35)
      lat = prevAccepted.lat + (nextValidated.lat - prevAccepted.lat) * alpha
      lng = prevAccepted.lng + (nextValidated.lng - prevAccepted.lng) * alpha
      accuracy = Math.min(prevAccepted.accuracy, nextValidated.accuracy)
    }

    const accPenalty = clamp((accuracy - 15) / 220, 0, 0.68)
    const speedPenalty = clamp((speedMps - 12) / 45, 0, 0.22)
    const burstPenalty = clamp(
      badSpeedBursts * 0.08 + teleportBursts * 0.1 + suspiciousAccuracyShifts * 0.05,
      0,
      0.55
    )
    const jitterPenalty = isJitter && nextValidated.accuracy > prevAccepted.accuracy ? 0.07 : 0
    let confidence = clamp(1 - accPenalty - speedPenalty - burstPenalty - jitterPenalty, 0.02, 0.99)

    if (typeof trajectoryValidator === 'function') {
      const trustResult = trajectoryValidator({
        previous: prevAccepted,
        current: { lat, lng, accuracy, ts: nextValidated.ts, speedMps },
      })
      if (trustResult?.drop) {
        emit(emitEvent, persistEvent, 'position_discarded', {
          reason: trustResult.reason || 'trajectory_validator_drop',
          lat,
          lng,
          accuracy,
          confidence,
          tracking: prevAccepted.tracking,
        })
        return null
      }
      if (Number.isFinite(trustResult?.confidencePenalty)) {
        confidence = clamp(confidence - trustResult.confidencePenalty, 0.02, 0.99)
      }
    }

    const isLostCandidate = confidence < 0.28
    const isUnstableCandidate = confidence < 0.62 || accuracy > 90
    let tracking = 'searching'

    if (isLostCandidate) {
      stableStreak = 0
      unstableStreak += 1
      tracking = unstableStreak >= 2 ? 'lost' : 'unstable'
    } else if (isUnstableCandidate) {
      stableStreak = 0
      unstableStreak += 1
      tracking = unstableStreak >= 2 ? 'unstable' : 'searching'
    } else {
      unstableStreak = 0
      stableStreak += 1
      tracking = stableStreak >= 2 ? 'stable' : 'searching'
    }

    const accepted = {
      lat,
      lng,
      accuracy,
      ts: nextValidated.ts,
      confidence,
      tracking,
      speedMps,
    }

    if (confidence < 0.35) {
      emit(emitEvent, persistEvent, 'low_confidence', accepted)
    }
    if (tracking !== prevAccepted.tracking) {
      emit(emitEvent, persistEvent, 'tracking_changed', accepted)
    }

    prevAccepted = accepted
    return accepted
  }
}
