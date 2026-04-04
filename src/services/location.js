/**
 * GPS en producción (mapa, overlays):
 *   startLocationTracking() → watchPosition → persistAndNotifyLocation() → callbacks de subscribeToLocation().
 *
 * createPositionGuard() no forma parte de ese pipeline. Solo tests u opciones futuras explícitas:
 * enlazarlo a persistAndNotifyLocation cambiaría qué puntos ve el mapa (decisión de producto).
 */
const GEO_OPTS = { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
const MAX_REASONABLE_ACCURACY_M = 1500
const MAX_PLAUSIBLE_SPEED_MPS = 75
const MIN_IMPOSSIBLE_JUMP_M = 120

function isValidGps(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false
  return true
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

function validateRawPosition(pos) {
  const lat = pos?.coords?.latitude
  const lng = pos?.coords?.longitude
  if (!isValidGps(lat, lng)) return null

  const acc = typeof pos?.coords?.accuracy === 'number' ? pos.coords.accuracy : 100
  if (!Number.isFinite(acc) || acc < 0 || acc > MAX_REASONABLE_ACCURACY_M) return null

  const ts = Number.isFinite(pos?.timestamp) ? pos.timestamp : Date.now()
  return { lat, lng, accuracy: acc, ts }
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
  if (!navigator.geolocation) {
    onError?.({ type: 'unavailable', code: 0, raw: null })
    return
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => onSuccess?.(validateRawPosition(pos)),
    (err) => onError?.(normalizeGeoError(err)),
    GEO_OPTS
  )
}

/** Última posición en memoria; también se hidrata desde `localStorage` al cargar el módulo. */
let currentLocation = null
const locationSubscribers = new Set()
let locationTrackingStarted = false

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
      currentLocation = { latitude: parsed.latitude, longitude: parsed.longitude }
    }
  }
} catch {
  /* */
}

function persistAndNotifyLocation(lat, lng) {
  if (!isValidGps(lat, lng)) return
  currentLocation = { latitude: lat, longitude: lng }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('last_location', JSON.stringify(currentLocation))
    }
  } catch {
    /* */
  }
  for (const cb of locationSubscribers) {
    try {
      cb(currentLocation)
    } catch {
      /* */
    }
  }
}

/**
 * Un único `watchPosition` global para toda la app. Idempotente.
 * Un `getCurrentPosition` inicial acelera la primera posición si no hay caché.
 */
export function startLocationTracking() {
  if (locationTrackingStarted) return
  locationTrackingStarted = true
  if (typeof navigator === 'undefined' || !navigator.geolocation) return

  getCurrentPosition(
    (validated) => {
      if (validated) persistAndNotifyLocation(validated.lat, validated.lng)
    },
    () => {}
  )

  navigator.geolocation.watchPosition(
    (pos) => {
      const lat = pos?.coords?.latitude
      const lng = pos?.coords?.longitude
      persistAndNotifyLocation(lat, lng)
    },
    () => {
      /* errores puntuales: el stream sigue vivo */
    },
    GEO_OPTS
  )
}

export function subscribeToLocation(callback) {
  if (typeof callback !== 'function') return () => {}

  locationSubscribers.add(callback)
  if (currentLocation) {
    try {
      callback(currentLocation)
    } catch {
      /* */
    }
  }

  return () => {
    locationSubscribers.delete(callback)
  }
}

/** Última posición en caché (misma lectura síncrona para ambos nombres de API). */
export function getCurrentLocation() {
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
