/**
 * Copia de WaitMe: src/components/StreetSearch.jsx (Input → input nativo, mismos estilos).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { getMapboxAccessToken } from '../../map/constants/mapbox.js'
import { getCurrentLocationFast } from '../../../services/location.js'
import { formatAddress, searchSpainStreets } from '../../../services/geocodingSpain.js'
import { IconSearch } from './icons.jsx'

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

export default function StreetSearch({
  onSelect,
  placeholder = '¿Dónde quieres aparcar?',
  className = '',
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const abortRef = useRef(null)
  const requestIdRef = useRef(0)

  const hasToken = Boolean(getMapboxAccessToken())

  const clearSearchField = useCallback(() => {
    setOpen(false)
    setQuery('')
  }, [])

  const fetchResults = useCallback(
    async (q) => {
      if (!hasToken || !q || q.trim().length < 2) return

      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const id = ++requestIdRef.current
      setLoading(true)
      try {
        const fast = getCurrentLocationFast()
        const proximity =
          fast && Number.isFinite(fast.longitude) && Number.isFinite(fast.latitude)
            ? { lng: fast.longitude, lat: fast.latitude }
            : null
        const res = await searchSpainStreets(q.trim(), {
          signal: controller.signal,
          proximity,
        })
        if (id !== requestIdRef.current) return
        setResults(Array.isArray(res) ? res : [])
      } catch (err) {
        if (id !== requestIdRef.current) return
        if (err?.name !== 'AbortError') {
          /* mantener lista anterior; no vaciar antes de respuesta */
        }
      } finally {
        if (id === requestIdRef.current) setLoading(false)
        abortRef.current = null
      }
    },
    [hasToken]
  )

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('RESULTS_UI:', results.length)
    }
  }, [results])

  useEffect(() => {
    const q = (query || '').trim()
    if (q.length < 2) {
      requestIdRef.current += 1
      if (abortRef.current) {
        abortRef.current.abort()
        abortRef.current = null
      }
      const t = window.setTimeout(() => {
        setResults([])
        setLoading(false)
      }, 200)
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(() => fetchResults(q), 150)
    return () => window.clearTimeout(t)
  }, [query, fetchResults])

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
    const center = feature?.center
    if (!Array.isArray(center) || center.length < 2) return
    const [lng, lat] = center
    const formatted =
      formatAddress(feature) ||
      (typeof feature.place_name === 'string' && feature.place_name.trim()) ||
      (typeof feature.text === 'string' && feature.text.trim()) ||
      ''
    setQuery(formatted)
    setResults([])
    setOpen(false)
    onSelect?.({ lng, lat, place_name: formatted })
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
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'relative', zIndex: 10, marginTop: 10 }}
    >
      <style>{`
        .${streetSearchInputClass}::placeholder {
          color: #FFFFFF;
          opacity: 0.82;
          -webkit-text-fill-color: #FFFFFF;
          text-align: center;
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

      {open && (query || '').trim().length >= 2 && (
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
            zIndex: 11,
            maxHeight: 220,
            overflowY: 'auto',
            listStyle: 'none',
            margin: 0,
            padding: 0,
          }}
        >
          {loading && results.length === 0 && (
            <li style={{ padding: '12px 16px', color: '#9ca3af', fontSize: 14 }}>Buscando...</li>
          )}
          {!loading && results.length === 0 && (
            <li style={{ padding: '12px 16px', color: '#9ca3af', fontSize: 14 }}>
              No se encontraron resultados
            </li>
          )}
          {results.map((f, i) => (
            <li
              key={String(f.id ?? f.place_name ?? i)}
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
              {formatAddress(f) ||
                (typeof f.place_name === 'string' ? f.place_name : '') ||
                (typeof f.text === 'string' ? f.text : '')}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
