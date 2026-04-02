/**
 * Copia de WaitMe: src/components/StreetSearch.jsx (Input → input nativo, mismos estilos).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { getMapboxAccessToken } from '../../map/constants/mapbox.js'
import { searchSpainStreets } from '../../../services/geocodingSpain.js'
import { IconSearch } from './icons.jsx'

function formatStreetName(placeName) {
  if (!placeName || typeof placeName !== 'string') return placeName || ''
  const parts = placeName
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length === 0) return placeName

  let street = parts[0] || ''
  street = street
    .replace(/^Calle\s+/i, 'C/ ')
    .replace(/^Avenida\s+/i, 'Av. ')
    .replace(/^Plaza\s+/i, 'Pl. ')

  return `${street}, Oviedo`
}

const inputStyle = {
  background: 'transparent',
  border: 'none',
  color: '#fff',
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

export default function StreetSearch({
  onSelect,
  placeholder = '¿Dónde quieres aparcar?',
  className = '',
}) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const abortRef = useRef(null)

  const hasToken = Boolean(getMapboxAccessToken())

  const clearSearchField = useCallback(() => {
    setOpen(false)
    setQuery('')
  }, [])

  const fetchSuggestions = useCallback(
    async (q) => {
      if (!hasToken || !q || q.trim().length < 2) {
        setSuggestions([])
        return
      }

      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setLoading(true)
      try {
        const rows = await searchSpainStreets(q, { signal: controller.signal })
        const features = rows
          .filter((r) => Array.isArray(r.center) && r.center.length >= 2)
          .map((r) => ({
            id: r.id,
            place_name: r.label,
            text: r.label,
            geometry: { coordinates: r.center },
          }))
        setSuggestions(features)
      } catch (err) {
        if (err?.name !== 'AbortError') setSuggestions([])
      } finally {
        setLoading(false)
        abortRef.current = null
      }
    },
    [hasToken]
  )

  useEffect(() => {
    const q = (query || '').trim()
    if (q.length < 2) {
      setSuggestions([])
      return
    }

    const t = setTimeout(() => fetchSuggestions(q), 250)
    return () => clearTimeout(t)
  }, [query, fetchSuggestions])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        clearSearchField()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [clearSearchField])

  const handleSelect = (feature) => {
    const center = feature?.geometry?.coordinates
    if (Array.isArray(center) && center.length >= 2) {
      const [lng, lat] = center
      const formatted = formatStreetName(feature.place_name || feature.text || '')
      setQuery(formatted)
      setSuggestions([])
      setOpen(false)
      onSelect?.({ lng, lat, place_name: formatted })
    }
  }

  const handleInputBlur = () => {
    window.setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        clearSearchField()
      }
    }, 0)
  }

  if (!hasToken) return null

  return (
    <div ref={containerRef} className={className} style={{ position: 'relative', marginTop: 10 }}>
      <style>{`
        .${streetSearchInputClass}::placeholder {
          color: #6b7280;
          opacity: 1;
          text-align: center;
        }
      `}</style>
      <div
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
              zIndex: 1,
            }}
          >
            <IconSearch size={20} />
          </span>
          <input
            className={streetSearchInputClass}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onBlur={handleInputBlur}
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

      {open && (suggestions.length > 0 || loading) && (
        <ul
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
            overflow: 'hidden',
            zIndex: 1000,
            maxHeight: 220,
            overflowY: 'auto',
            listStyle: 'none',
            margin: 0,
            padding: 0,
          }}
        >
          {loading && suggestions.length === 0 && (
            <li style={{ padding: '12px 16px', color: '#9ca3af', fontSize: 14 }}>Buscando...</li>
          )}
          {suggestions.map((f) => (
            <li
              key={f.id || f.place_name}
              role="button"
              tabIndex={0}
              style={{
                padding: '12px 16px',
                color: '#fff',
                fontSize: 14,
                cursor: 'pointer',
                borderBottom: '1px solid rgba(55, 65, 81, 0.5)',
              }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(f)}
              onKeyDown={(e) => e.key === 'Enter' && handleSelect(f)}
            >
              {formatStreetName(f.place_name || f.text || '')}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
