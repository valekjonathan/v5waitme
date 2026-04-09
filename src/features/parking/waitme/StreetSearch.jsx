/**
 * Copia de WaitMe: src/components/StreetSearch.jsx (Input → input nativo, mismos estilos).
 * Sugerencias: solo vía `streetSearchService.search` (una fuente).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getCurrentLocationFast } from '../../../services/location.js'
import {
  formatSuggestionLabel,
  search as streetSearch,
  selectionPayload,
} from '../../../services/streetSearchService.js'
import { IconSearch } from './icons.jsx'
import { LAYOUT } from '../../../ui/layout/layout'

const inputStyle = {
  background: 'transparent',
  border: 'none',
  color: '#FFFFFF',
  WebkitTextFillColor: '#FFFFFF',
  caretColor: '#FFFFFF',
  opacity: 1,
  outline: 'none',
  height: 32,
  fontSize: 14,
  padding: 0,
  minWidth: 0,
  fontFamily: 'inherit',
  width: '100%',
  boxSizing: 'border-box',
  textAlign: 'center',
}

const streetSearchInputClass = 'waitme-street-search-input'

const DEBOUNCE_MS = 80

const streetResultLiStyle = {
  padding: '12px 16px',
  color: '#fff',
  fontSize: 14,
  cursor: 'pointer',
  borderBottom: '1px solid rgba(55, 65, 81, 0.5)',
}

/**
 * @param {(q: string) => void} [onQueryChange]
 * @param {(payload: { address: string, lat: number | null, lng: number | null }) => void} [onSelect]
 * @param {boolean} [placeholderMuted] — placeholder tipo input muted (solo Chats).
 * @param {boolean} [enableSuggestions] — si false, solo texto (p. ej. Chats).
 * @param {{ latitude: number, longitude: number } | null} [userLocation] — proximidad Mapbox.
 */
export default function StreetSearch({
  placeholder = '¿Dónde quieres aparcar?',
  className = '',
  onQueryChange,
  onSelect,
  placeholderMuted = false,
  enableSuggestions = true,
  userLocation = null,
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const abortRef = useRef(null)
  const requestIdRef = useRef(0)

  const proximity = useMemo(() => {
    const lat = userLocation?.latitude
    const lng = userLocation?.longitude
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
    const fast = getCurrentLocationFast()
    if (fast && Number.isFinite(fast.latitude) && Number.isFinite(fast.longitude)) {
      return { lat: fast.latitude, lng: fast.longitude }
    }
    return null
  }, [userLocation?.latitude, userLocation?.longitude])

  const runSearch = useCallback(
    async (q) => {
      if (!enableSuggestions) return
      const trimmed = typeof q === 'string' ? q.trim() : ''
      if (trimmed.length < 2) {
        setResults([])
        return
      }

      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller
      const id = ++requestIdRef.current

      try {
        const list = await streetSearch(trimmed, {
          signal: controller.signal,
          proximity,
        })
        if (id !== requestIdRef.current) return
        setResults(Array.isArray(list) ? list : [])
      } catch {
        if (id !== requestIdRef.current) return
      } finally {
        if (id === requestIdRef.current) abortRef.current = null
      }
    },
    [enableSuggestions, proximity]
  )

  useEffect(() => {
    if (!enableSuggestions) return
    const q = (query || '').trim()
    if (q.length < 2) {
      requestIdRef.current += 1
      if (abortRef.current) {
        abortRef.current.abort()
        abortRef.current = null
      }
      const t = window.setTimeout(() => setResults([]), 0)
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(() => runSearch(q), DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [query, runSearch, enableSuggestions])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [])

  const handlePick = (feature) => {
    const label = formatSuggestionLabel(feature)
    const payload = selectionPayload(feature, label)
    setQuery(payload.address)
    setResults([])
    setOpen(false)
    onSelect?.(payload)
  }

  const showList =
    enableSuggestions && open && (query || '').trim().length >= 2 && results.length > 0

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        zIndex: LAYOUT.z.streetSearchLayer,
        marginTop: 10,
        overflow: 'visible',
      }}
    >
      <style>{`
        .${streetSearchInputClass}::placeholder {
          color: #FFFFFF;
          opacity: 0.82;
          -webkit-text-fill-color: #FFFFFF;
          text-align: center;
        }
        ${
          placeholderMuted
            ? `
        .${streetSearchInputClass}::placeholder {
          color: rgba(255, 255, 255, 0.4);
          opacity: 1;
          -webkit-text-fill-color: rgba(255, 255, 255, 0.4);
        }
        `
            : ''
        }
      `}</style>
      <div
        data-search-box
        data-waitme-parking-search-morado
        data-waitme-parking-gap-search-bottom
        style={{
          backgroundColor: 'rgba(17, 24, 39, 0.8)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          border: '2px solid rgba(168, 85, 247, 0.5)',
          borderRadius: 12,
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            position: 'relative',
            flex: 1,
            minWidth: 0,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#c084fc',
              display: 'flex',
              pointerEvents: 'none',
              zIndex: LAYOUT.z.streetSearchLayer,
            }}
          >
            <IconSearch size={20} />
          </span>
          <input
            className={streetSearchInputClass}
            value={query}
            onChange={(e) => {
              const v = e.target.value
              setQuery(v)
              onQueryChange?.(v)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            autoComplete="off"
            style={{
              ...inputStyle,
              paddingLeft: 28,
              paddingRight: 28,
            }}
          />
        </div>
      </div>

      {showList ? (
        <ul
          data-waitme-street-results
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '2px solid rgba(168, 85, 247, 0.5)',
            borderRadius: 12,
            zIndex: LAYOUT.z.streetSearchResults,
            maxHeight: 220,
            overflowY: 'auto',
            overflowX: 'hidden',
            listStyle: 'none',
            margin: 0,
            padding: 0,
          }}
        >
          {results.map((f, idx) => (
            <li
              key={String(f.id ?? f.place_name ?? idx)}
              role="button"
              tabIndex={0}
              style={streetResultLiStyle}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handlePick(f)}
              onKeyDown={(e) => e.key === 'Enter' && handlePick(f)}
            >
              {formatSuggestionLabel(f)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
