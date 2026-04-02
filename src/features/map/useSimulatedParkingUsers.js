import { useEffect, useMemo, useState } from 'react'
import { OVIEDO_LAT, OVIEDO_LNG } from './constants/mapbox.js'
import { buildSimulatedUsers } from './simulatedUsers.js'
import {
  distanceMeters,
  getCurrentLocationFast,
  subscribeToLocation,
} from '../../services/location.js'

/**
 * Ancla GPS para generar 10 coches cercanos + 40 en Oviedo; una sola fuente de verdad.
 */
export function useSimulatedParkingUsers() {
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
      setAnchor({ lat: loc.latitude, lng: loc.longitude })
    })
  }, [])

  return useMemo(() => buildSimulatedUsers(anchor.lat, anchor.lng), [anchor.lat, anchor.lng])
}

/** Usuario simulado más cercano al GPS; solo cambia de fila si cambia el id (evita parpadeos). */
export function useClosestSimulatedUser(users) {
  const [userLocation, setUserLocation] = useState(() => {
    const fast = getCurrentLocationFast()
    if (fast && Number.isFinite(fast.latitude) && Number.isFinite(fast.longitude)) {
      return { latitude: fast.latitude, longitude: fast.longitude }
    }
    return null
  })
  const [closestUser, setClosestUser] = useState(null)

  useEffect(() => {
    const fast = getCurrentLocationFast()
    if (fast && Number.isFinite(fast.latitude) && Number.isFinite(fast.longitude)) {
      setUserLocation({ latitude: fast.latitude, longitude: fast.longitude })
    }
    return subscribeToLocation((loc) => {
      if (!loc || !Number.isFinite(loc.latitude) || !Number.isFinite(loc.longitude)) return
      setUserLocation({ latitude: loc.latitude, longitude: loc.longitude })
    })
  }, [])

  useEffect(() => {
    if (!users?.length) {
      setClosestUser(null)
      return
    }

    if (
      !userLocation ||
      !Number.isFinite(userLocation.latitude) ||
      !Number.isFinite(userLocation.longitude)
    ) {
      const stable = [...users].sort((a, b) => a.id.localeCompare(b.id))[0]
      setClosestUser((prev) => (prev?.id === stable.id ? prev : stable))
      return
    }

    const { latitude: lat, longitude: lng } = userLocation
    let best = users[0]
    let bestM = distanceMeters(lat, lng, best.lat, best.lng)
    for (let i = 1; i < users.length; i += 1) {
      const u = users[i]
      const m = distanceMeters(lat, lng, u.lat, u.lng)
      if (m < bestM) {
        bestM = m
        best = u
      }
    }
    setClosestUser((prev) => (prev?.id === best.id ? prev : best))
  }, [users, userLocation])

  return closestUser
}
