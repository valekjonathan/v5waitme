import { useEffect, useMemo, useState } from 'react'
import { OVIEDO_LAT, OVIEDO_LNG } from './constants/mapboxConstants.js'
import { buildSimulatedUsers } from './simulatedUsers.js'
import { getCurrentLocationFast, subscribeToLocation } from '../../services/location.js'

/**
 * Ancla GPS para generar 10 coches cercanos + 40 en Oviedo; una sola fuente de verdad.
 * @param {boolean} [suspendAnchorUpdates] Si true, no actualiza el ancla (mapa oculto bajo overlay).
 */
export function useSimulatedParkingUsers(suspendAnchorUpdates = false) {
  const [anchor, setAnchor] = useState(() => {
    const fast = getCurrentLocationFast()
    if (fast && Number.isFinite(fast.latitude) && Number.isFinite(fast.longitude)) {
      return { lat: fast.latitude, lng: fast.longitude }
    }
    return { lat: OVIEDO_LAT, lng: OVIEDO_LNG }
  })

  useEffect(() => {
    const fast = getCurrentLocationFast()
    if (fast && Number.isFinite(fast.latitude) && Number.isFinite(fast.longitude)) {
      setAnchor({ lat: fast.latitude, lng: fast.longitude })
    }
    return subscribeToLocation((loc) => {
      if (!loc || !Number.isFinite(loc.latitude) || !Number.isFinite(loc.longitude)) return
      if (suspendAnchorUpdates) return
      setAnchor({ lat: loc.latitude, lng: loc.longitude })
    })
  }, [suspendAnchorUpdates])

  return useMemo(() => buildSimulatedUsers(anchor.lat, anchor.lng), [anchor.lat, anchor.lng])
}
