/**
 * Copia de WaitMe: src/components/StreetSearch.jsx (Input → input nativo, mismos estilos).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { getCurrentLocationFast } from '../../../services/location.js'
import { formatAddress, searchSpainStreets } from '../../../services/geocodingSpain.js'
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

const DEBOUNCE_MS = 185

const streetResultLiStyle = {
  padding: '12px 16px',
  color: '#fff',
  fontSize: 14,
  cursor: 'pointer',
  borderBottom: '1px solid rgba(55, 65, 81, 0.5)',
}

/**
 * @param {{ id: string, label: string, matchText?: string }[]} [localFilterItems] — si hay ítems, no se llama a Mapbox; filtra en cliente.
 * @param {(item: { id: string, label: string }) => void} [onLocalSelect]
 * @param {(q: string) => void} [onQueryChange]
 */
export default function StreetSearch({
  onSelect,
  placeholder = '¿Dónde quieres aparcar?',
  className = '',
  localFilterItems,
  onLocalSelect,
  onQueryChange,
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const abortRef = useRef(null)
  const requestIdRef = useRef(0)

  const clearSearchField = useCallback(() => {
    setOpen(false)
    setQuery('')
  }, [])

  const useLocal = Array.isArray(localFilterItems) && localFilterItems.length > 0

  const fetchResults = useCallback(async (q) => {
    if (useLocal) return
    const trimmed = typeof q === 'string' ? q.trim() : ''

    if (!trimmed || trimmed.length < 2) {
      setResults([])
      return
    }

    if (abortRef.current) abortRef.current.abort()

    const controller = new AbortController()
    abortRef.current = controller

    const id = ++requestIdRef.current

    try {
      const fast = getCurrentLocationFast()
      const proximity =
        fast && Number.isFinite(fast.longitude) && Number.isFinite(fast.latitude)
          ? { lng: fast.longitude, lat: fast.latitude }
          : null

      const res = await searchSpainStreets(trimmed, {
        signal: controller.signal,
        proximity,
      })

      if (id !== requestIdRef.current) return

      setResults(Array.isArray(res) ? res : [])
    } catch (e) {
      if (id !== requestIdRef.current) return
    } finally {
      if (id === requestIdRef.current) {
        abortRef.current = null
      }
    }
  }, [useLocal])

  useEffect(() => {
    if (!useLocal) return
    const q = (query || '').trim().toLowerCase()
    if (q.length < 2) {
      setResults([])
      return
    }
    const filtered = localFilterItems.filter((it) => {
      const hay = String(it.matchText ?? it.label ?? '').toLowerCase()
      return hay.includes(q)
    })
    setResults(filtered)
  }, [query, localFilterItems, useLocal])

  useEffect(() => {
    if (useLocal) return
    const q = (query || '').trim()
    if (q.length < 2) {
      requestIdRef.current += 1
      if (abortRef.current) {
        abortRef.current.abort()
        abortRef.current = null
      }
      const t = window.setTimeout(() => {
        setResults([])
      }, 200)
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(() => fetchResults(q), DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [query, fetchResults, useLocal])

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
      (typeof feature.place_name === 'string' ? feature.place_name : '') ||
      (typeof feature.text === 'string' ? feature.text : '') ||
      ''
    setQuery(formatted)
    setResults([])
    setOpen(false)
    onSelect?.({ lng, lat, place_name: formatted })
  }

  const handleLocalPick = (item) => {
    setQuery('')
    setResults([])
    setOpen(false)
    onLocalSelect?.({ id: item.id, label: item.label })
  }

  const handleInputBlur = () => {
    window.setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        clearSearchField()
      }
    }, 0)
  }

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

      {open && (query || '').trim().length >= 2 && results.length > 0 ? (
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
          {useLocal
            ? results.map((it) => (
                <li
                  key={it.id}
                  role="button"
                  tabIndex={0}
                  style={streetResultLiStyle}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleLocalPick(it)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLocalPick(it)}
                >
                  {it.label}
                </li>
              ))
            : results.map((f) => (
                <li
                  key={f.id}
                  role="button"
                  tabIndex={0}
                  style={streetResultLiStyle}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(f)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSelect(f)}
                >
                  {formatAddress(f) || f.place_name || f.text || '—'}
                </li>
              ))}
        </ul>
      ) : null}
    </div>
  )
}
