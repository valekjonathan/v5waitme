/**
 * Copia de WaitMe: src/components/map/MapFilters.jsx (sin framer-motion; mismo layout).
 */
import React, { useEffect, useState } from 'react'
import { IconClock, IconEuro, IconNavigation, IconX } from './icons.jsx'

const panelOuterStyle = {
  position: 'absolute',
  right: 0,
  top: '50%',
  height: 'auto',
  zIndex: 1000,
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
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
}

const rangeClass = 'waitme-map-filters-range'

const labelBase = {
  fontSize: 14,
  color: '#fff',
  marginBottom: 8,
  display: 'block',
  fontWeight: 500,
}

const iconWrap = {
  display: 'inline-flex',
  alignItems: 'center',
  verticalAlign: 'middle',
  color: '#c084fc',
  marginRight: 4,
}

function FilterRangeBlock({ icon, title, valueEl, min, max, step, value, onChange }) {
  return (
    <div>
      <label style={labelBase}>
        <span style={iconWrap}>{icon}</span>
        {title} {valueEl}
      </label>
      <input
        type="range"
        className={rangeClass}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
      />
    </div>
  )
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

  return (
    <>
      <style>{`
        .${rangeClass} {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          background: #374151;
          border-radius: 3px;
          outline: none;
        }
        .${rangeClass}::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #a855f7;
          border: 2px solid #c084fc;
          cursor: pointer;
        }
        .${rangeClass}::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #a855f7;
          border: 2px solid #c084fc;
          cursor: pointer;
        }
        .${rangeClass}::-moz-range-track {
          height: 6px;
          background: #374151;
          border-radius: 3px;
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>
          <FilterRangeBlock
            icon={<IconEuro size={16} />}
            title="Precio máximo:"
            valueEl={
              <span style={{ color: '#c084fc', fontWeight: 700 }}>{Math.round(filters.maxPrice)} €</span>
            }
            min={3}
            max={30}
            step={1}
            value={filters.maxPrice}
            onChange={(e) => onFilterChange({ ...filters, maxPrice: Number(e.target.value) })}
          />
          <FilterRangeBlock
            icon={<IconClock size={16} />}
            title="Disponible en:"
            valueEl={<span style={{ color: '#c084fc', fontWeight: 700 }}>{filters.maxMinutes} min</span>}
            min={5}
            max={60}
            step={5}
            value={filters.maxMinutes}
            onChange={(e) => onFilterChange({ ...filters, maxMinutes: Number(e.target.value) })}
          />
          <FilterRangeBlock
            icon={<IconNavigation size={16} />}
            title="Distancia máxima:"
            valueEl={<span style={{ color: '#c084fc', fontWeight: 700 }}>{distLabel}</span>}
            min={0}
            max={1}
            step={0.1}
            value={filters.maxDistance}
            onChange={(e) => onFilterChange({ ...filters, maxDistance: Number(e.target.value) })}
          />

          <div style={{ paddingTop: 12, borderTop: '1px solid #374151' }}>
            <p style={{ textAlign: 'center', fontSize: 14, color: '#9ca3af', margin: 0 }}>
              <span style={{ color: '#c084fc', fontWeight: 700 }}>{alertsCount}</span> plazas encontradas
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
            onClick={() => onFilterChange({ maxPrice: 7, maxMinutes: 25, maxDistance: 1 })}
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
