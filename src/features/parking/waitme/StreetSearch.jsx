/**
 * Copia de WaitMe: src/components/StreetSearch.jsx (Input → input nativo, mismos estilos).
 * Una tubería: `useStreetSearchMapbox` → `searchStreets`; lista en portal para no quedar recortada por overflow del shell.
 */
import { createPortal } from 'react-dom'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { getCurrentLocationFast } from '../../../services/location.js'
import { suggestionDisplayText } from '../../../services/streetSearchService.js'
import { OVIEDO_LAT, OVIEDO_LNG } from '../../../features/map/constants/mapbox.js'
import { IconSearch } from './icons.jsx'
import { LAYOUT } from '../../../ui/layout/layout'
import { useStreetSearchMapbox } from './useStreetSearchMapbox.js'

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
  userLocation: locationProp = null,
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [menuRect, setMenuRect] = useState(
    /** @type {{ top: number, left: number, width: number } | null} */ (null)
  )
  const containerRef = useRef(null)
  const listRef = useRef(null)

  const proximity = useMemo(() => {
    const lat = locationProp?.latitude
    const lng = locationProp?.longitude
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
    const fast = getCurrentLocationFast()
    if (fast && Number.isFinite(fast.latitude) && Number.isFinite(fast.longitude)) {
      return { lat: fast.latitude, lng: fast.longitude }
    }
    return { lat: OVIEDO_LAT, lng: OVIEDO_LNG }
  }, [locationProp?.latitude, locationProp?.longitude])

  const { runSearch, abortAndNewSession, pickSuggestion } = useStreetSearchMapbox({
    proximity,
    enableSuggestions,
  })

  const applyResults = useCallback((list) => {
    const arr = Array.isArray(list) ? list : []
    if (import.meta.env.DEV) {
      console.log('[StreetSearch] setResults', arr.length)
    }
    setResults(arr)
  }, [])

  useEffect(() => {
    if (!enableSuggestions) return

    const q = (query || '').trim()
    if (q.length < 2) {
      abortAndNewSession()
      const t = window.setTimeout(() => setResults([]), 0)
      return () => window.clearTimeout(t)
    }

    const t = window.setTimeout(() => runSearch(q, applyResults), DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [query, runSearch, enableSuggestions, abortAndNewSession, applyResults])

  const updateMenuPosition = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setMenuRect({ top: r.bottom + 4, left: r.left, width: r.width })
  }, [])

  const showList =
    enableSuggestions && open && (query || '').trim().length >= 2 && results.length > 0

  useLayoutEffect(() => {
    if (!showList) {
      setMenuRect(null)
      return
    }
    updateMenuPosition()
  }, [showList, query, results, updateMenuPosition])

  useEffect(() => {
    if (!showList) return undefined
    window.addEventListener('scroll', updateMenuPosition, true)
    window.addEventListener('resize', updateMenuPosition)
    return () => {
      window.removeEventListener('scroll', updateMenuPosition, true)
      window.removeEventListener('resize', updateMenuPosition)
    }
  }, [showList, updateMenuPosition])

  useEffect(() => {
    if (import.meta.env.DEV && showList) {
      console.log('[StreetSearch] render dropdown', results.length)
    }
  }, [showList, results.length])

  useEffect(() => {
    const handleClickOutside = (e) => {
      const t = e.target
      if (containerRef.current?.contains(t)) return
      if (listRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [])

  const handlePick = async (suggestion) => {
    await pickSuggestion(suggestion, (payload) => {
      setQuery(payload.address)
      setResults([])
      setOpen(false)
      onSelect?.(payload)
    })
  }

  const listEl =
    showList && menuRect ? (
      <ul
        ref={listRef}
        data-waitme-street-results
        style={{
          position: 'fixed',
          top: menuRect.top,
          left: menuRect.left,
          width: menuRect.width,
          boxSizing: 'border-box',
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
            key={String(f.mapbox_id ?? idx)}
            role="button"
            tabIndex={0}
            style={streetResultLiStyle}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handlePick(f)}
            onKeyDown={(e) => e.key === 'Enter' && handlePick(f)}
          >
            {suggestionDisplayText(f)}
          </li>
        ))}
      </ul>
    ) : null

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
              setQuery(e.target.value)
              onQueryChange?.(e.target.value)
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

      {listEl && typeof document !== 'undefined' ? createPortal(listEl, document.body) : null}
    </div>
  )
}
