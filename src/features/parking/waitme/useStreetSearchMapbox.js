import { useCallback, useRef } from 'react'
import {
  newSearchSessionToken,
  retrieveStreetSuggestion,
  search as mapboxStreetSearch,
  selectionPayload,
} from '../../../services/streetSearchService.js'

/**
 * Sesión Mapbox Search Box + abort/replay: una fuente para StreetSearch y CreateAlertCard.
 */
export function useStreetSearchMapbox({ proximity, enableSuggestions = true }) {
  const sessionRef = useRef(newSearchSessionToken())
  const abortRef = useRef(null)
  const requestIdRef = useRef(0)

  const abortAndNewSession = useCallback(() => {
    requestIdRef.current += 1
    sessionRef.current = newSearchSessionToken()
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
  }, [])

  const runSearch = useCallback(
    async (q, applyResults) => {
      if (!enableSuggestions) return
      const trimmed = typeof q === 'string' ? q.trim() : ''
      if (trimmed.length < 2) {
        applyResults([])
        return
      }

      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller
      const id = ++requestIdRef.current

      try {
        const list = await mapboxStreetSearch(trimmed, {
          signal: controller.signal,
          proximity,
          sessionToken: sessionRef.current,
        })
        if (id !== requestIdRef.current) return
        applyResults(Array.isArray(list) ? list : [])
      } catch {
        if (id !== requestIdRef.current) return
      } finally {
        if (id === requestIdRef.current) abortRef.current = null
      }
    },
    [enableSuggestions, proximity]
  )

  const pickSuggestion = useCallback(async (suggestion, onResolved) => {
    if (!suggestion?.mapbox_id) return null
    const controller = new AbortController()
    try {
      const feature = await retrieveStreetSuggestion(
        suggestion.mapbox_id,
        sessionRef.current,
        controller.signal
      )
      if (!feature) return null
      const payload = selectionPayload(feature)
      sessionRef.current = newSearchSessionToken()
      onResolved?.(payload)
      return payload
    } catch (e) {
      if (e?.name === 'AbortError') return null
      return null
    }
  }, [])

  return { runSearch, abortAndNewSession, pickSuggestion }
}
