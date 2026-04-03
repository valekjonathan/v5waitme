/**
 * Copia de WaitMe: src/components/map/MapFilters.jsx (sliders alineados con CreateAlertCard).
 */
import React, { useEffect, useMemo, useState } from 'react'
import { IconClock, IconEuro, IconNavigation, IconX, WAITME_ROW_ICON_SLOT } from './icons.jsx'

/** Estado inicial Search (precio 10 euros, 30 min, 800 m). Exportado para el padre sin duplicar. */
export const WAITME_DEFAULT_SEARCH_FILTERS = {
  maxPrice: 10,
  maxMinutes: 30,
  maxDistance: 0.8,
}

const PRICE_MIN = 3
const PRICE_MAX = 30
const MINUTES_MIN = 5
const MINUTES_MAX = 60
const DIST_MIN = 0
const DIST_MAX = 1

/** Mismo `className` y reglas CSS que CreateAlertCard.jsx (`waitme-create-alert-range`). */
const rangeClass = 'waitme-create-alert-range'

function rangeGradientPercent(value, min, max) {
  if (max <= min) return 0
  return ((value - min) / (max - min)) * 100
}

/** `fixed` + capa alta: por encima del pin y del canvas/markers del mapa (stacking global). */
const panelOuterStyle = {
  position: 'fixed',
  right: 0,
  top: '50%',
  height: 'auto',
  zIndex: 200000,
  pointerEvents: 'auto',
  maxHeight: '100%',
}

const panelStyle = {
  backgroundColor: 'rgba(0, 0, 0, 0.95)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  borderRadius: 16,
  padding: 20,
  border: '2px solid #a855f7',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  width: 288,
  maxHeight: '85vh',
  overflow: 'visible',
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box',
}

function MapFilters({ filters, onFilterChange, onClose, alertsCount }) {
  const [panelIn, setPanelIn] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setPanelIn(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const distLabel =
    filters.maxDistance < 1
      ? `${Math.round(filters.maxDistance * 1000)} m`
      : `${filters.maxDistance} km`

  const pricePct = useMemo(
    () => rangeGradientPercent(filters.maxPrice, PRICE_MIN, PRICE_MAX),
    [filters.maxPrice]
  )
  const minutesPct = useMemo(
    () => rangeGradientPercent(filters.maxMinutes, MINUTES_MIN, MINUTES_MAX),
    [filters.maxMinutes]
  )
  const distancePct = useMemo(
    () => rangeGradientPercent(filters.maxDistance, DIST_MIN, DIST_MAX),
    [filters.maxDistance]
  )

  const priceTrackStyle = useMemo(
    () => ({
      marginTop: 4,
      background: `linear-gradient(to right, #8B5CF6 0%, #8B5CF6 ${pricePct}%, rgba(255,255,255,0.2) ${pricePct}%, rgba(255,255,255,0.2) 100%)`,
    }),
    [pricePct]
  )
  const minutesTrackStyle = useMemo(
    () => ({
      marginTop: 4,
      background: `linear-gradient(to right, #8B5CF6 0%, #8B5CF6 ${minutesPct}%, rgba(255,255,255,0.2) ${minutesPct}%, rgba(255,255,255,0.2) 100%)`,
    }),
    [minutesPct]
  )
  const distanceTrackStyle = useMemo(
    () => ({
      marginTop: 4,
      background: `linear-gradient(to right, #8B5CF6 0%, #8B5CF6 ${distancePct}%, rgba(255,255,255,0.2) ${distancePct}%, rgba(255,255,255,0.2) 100%)`,
    }),
    [distancePct]
  )

  return (
    <>
      <style>{`
        .${rangeClass} {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 3px;
          outline: none;
        }
        .${rangeClass}::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #8B5CF6;
          border: 2px solid #ffffff;
          cursor: pointer;
        }
        .${rangeClass}::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #8B5CF6;
          border: 2px solid #ffffff;
          cursor: pointer;
        }
        .${rangeClass}::-moz-range-track {
          height: 6px;
          border-radius: 3px;
          background: transparent;
        }
      `}</style>
      <div
        style={{
          ...panelOuterStyle,
          transform: panelIn ? 'translate(0, -50%)' : 'translate(100%, -50%)',
          transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div style={panelStyle}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  backgroundColor: 'rgba(168, 85, 247, 0.2)',
                  color: '#d8b4fe',
                  border: '1px solid rgba(192, 132, 252, 0.5)',
                  fontWeight: 700,
                  fontSize: 12,
                  height: 28,
                  padding: '0 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 6,
                }}
              >
                Filtros
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f87171',
                cursor: 'pointer',
                padding: 0,
              }}
              aria-label="Cerrar filtros"
            >
              <IconX size={20} />
            </button>
          </div>

          <div style={{ borderTop: '1px solid #374151', margin: '16px 0' }} />

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
              overflowY: 'auto',
              overflowX: 'visible',
              minHeight: 0,
              width: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  ...WAITME_ROW_ICON_SLOT,
                  position: 'relative',
                  top: 2,
                }}
              >
                <IconEuro size={22} strokeWidth={2} />
              </span>
              <div style={{ flex: 1, marginTop: 8 }}>
                <label style={{ color: '#fff', fontSize: 12, fontWeight: 500, display: 'block' }}>
                  Precio máximo:
                  <span
                    style={{
                      color: '#c084fc',
                      fontWeight: 700,
                      fontSize: 22,
                      lineHeight: 1,
                      marginLeft: 42,
                    }}
                  >
                    {Math.round(filters.maxPrice)} euros
                  </span>
                </label>
                <input
                  type="range"
                  className={rangeClass}
                  min={PRICE_MIN}
                  max={PRICE_MAX}
                  step={1}
                  value={filters.maxPrice}
                  onChange={(e) => onFilterChange({ ...filters, maxPrice: Number(e.target.value) })}
                  style={priceTrackStyle}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  ...WAITME_ROW_ICON_SLOT,
                  position: 'relative',
                  top: 2,
                }}
              >
                <IconClock size={22} strokeWidth={2} />
              </span>
              <div style={{ flex: 1, marginTop: 8 }}>
                <label style={{ color: '#fff', fontSize: 12, fontWeight: 500, display: 'block' }}>
                  Disponible en:
                  <span
                    style={{
                      color: '#c084fc',
                      fontWeight: 700,
                      fontSize: 22,
                      lineHeight: 1,
                      marginLeft: 8,
                    }}
                  >
                    {filters.maxMinutes} min
                  </span>
                </label>
                <input
                  type="range"
                  className={rangeClass}
                  min={MINUTES_MIN}
                  max={MINUTES_MAX}
                  step={5}
                  value={filters.maxMinutes}
                  onChange={(e) => onFilterChange({ ...filters, maxMinutes: Number(e.target.value) })}
                  style={minutesTrackStyle}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  ...WAITME_ROW_ICON_SLOT,
                  position: 'relative',
                  top: 2,
                }}
              >
                <IconNavigation size={22} strokeWidth={2} />
              </span>
              <div style={{ flex: 1, marginTop: 8 }}>
                <label style={{ color: '#fff', fontSize: 12, fontWeight: 500, display: 'block' }}>
                  Distancia máxima:
                  <span
                    style={{
                      color: '#c084fc',
                      fontWeight: 700,
                      fontSize: 22,
                      lineHeight: 1,
                      marginLeft: 8,
                    }}
                  >
                    {distLabel}
                  </span>
                </label>
                <input
                  type="range"
                  className={rangeClass}
                  min={DIST_MIN}
                  max={DIST_MAX}
                  step={0.1}
                  value={filters.maxDistance}
                  onChange={(e) =>
                    onFilterChange({ ...filters, maxDistance: Number(e.target.value) })
                  }
                  style={distanceTrackStyle}
                />
              </div>
            </div>

            <div style={{ paddingTop: 12, borderTop: '1px solid #374151' }}>
              <p style={{ textAlign: 'center', fontSize: 14, color: '#9ca3af', margin: 0 }}>
                <span style={{ color: '#c084fc', fontWeight: 700 }}>{alertsCount}</span> plazas
                encontradas
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: 6,
                backgroundColor: 'rgba(147, 51, 234, 0.3)',
                color: '#d8b4fe',
                border: '1px solid rgba(168, 85, 247, 0.5)',
                cursor: 'pointer',
                fontSize: 14,
                fontFamily: 'inherit',
                fontWeight: 500,
              }}
            >
              Aplicar filtros
            </button>

            <button
              type="button"
              onClick={() => onFilterChange({ ...WAITME_DEFAULT_SEARCH_FILTERS })}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: 6,
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                cursor: 'pointer',
                fontSize: 14,
                fontFamily: 'inherit',
                fontWeight: 500,
              }}
            >
              Restablecer filtros
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default React.memo(MapFilters)
