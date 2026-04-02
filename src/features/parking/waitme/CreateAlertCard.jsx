/**
 * Copia de WaitMe: src/components/cards/CreateAlertCard.jsx (input nativo + sliders nativos).
 */
import { useState } from 'react'
import { recenterGlobalMapOnUser } from '../../map/mapControls.js'
import { IconClock, IconEuro, IconLocateFixed, IconMapPin } from './icons.jsx'

const rangeClass = 'waitme-create-alert-range'

export default function CreateAlertCard({
  address,
  onAddressChange,
  onRecenter,
  onCreateAlert,
  isLoading = false,
  mapRef: _mapRef,
}) {
  const [price, setPrice] = useState(3)
  const [minutes, setMinutes] = useState(10)

  const handleCreate = () => {
    onCreateAlert?.({ price, minutes })
  }

  const handleLocate = () => {
    recenterGlobalMapOnUser()
    onRecenter?.({ lat: null, lng: null })
  }

  return (
    <div
      data-create-alert-card
      style={{
        pointerEvents: 'auto',
        backgroundColor: 'rgba(17, 24, 39, 0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: 16,
        padding: '16px 20px',
        border: '2px solid rgba(168, 85, 247, 0.7)',
        boxShadow: '0 0 30px rgba(168, 85, 247, 0.4), inset 0 0 20px rgba(168, 85, 247, 0.15)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
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
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flex: 1,
          minHeight: 0,
          gap: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#c084fc', flexShrink: 0, display: 'flex' }}>
            <IconMapPin size={22} />
          </span>
          <input
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            placeholder="C/ Campoamor, 13"
            autoComplete="off"
            style={{
              flex: 1,
              height: 32,
              fontSize: 12,
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: 6,
              color: '#fff',
              padding: '0 10px',
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
          <button
            type="button"
            style={{
              pointerEvents: 'auto',
              height: 32,
              width: 32,
              minHeight: 32,
              minWidth: 32,
              padding: 0,
              border: '1px solid rgba(168, 85, 247, 0.5)',
              color: '#fff',
              backgroundColor: 'rgba(147, 51, 234, 0.5)',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            onClick={handleLocate}
            aria-label="Ubicar"
          >
            <IconLocateFixed size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              color: '#c084fc',
              flexShrink: 0,
              alignSelf: 'center',
              transform: 'translateY(4px)',
              display: 'flex',
            }}
          >
            <IconClock size={22} />
          </span>
          <div style={{ flex: 1, marginTop: 8 }}>
            <label style={{ color: '#fff', fontSize: 12, fontWeight: 500, display: 'block' }}>
              Me voy en:
              <span
                style={{
                  color: '#c084fc',
                  fontWeight: 700,
                  fontSize: 22,
                  lineHeight: 1,
                  marginLeft: 8,
                }}
              >
                {minutes} minutos
              </span>
            </label>
            <input
              type="range"
              className={rangeClass}
              min={5}
              max={60}
              step={5}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              style={{ marginTop: 4 }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              color: '#c084fc',
              flexShrink: 0,
              alignSelf: 'center',
              transform: 'translateY(4px)',
              display: 'flex',
            }}
          >
            <IconEuro size={22} />
          </span>
          <div style={{ flex: 1, marginTop: 8 }}>
            <label style={{ color: '#fff', fontSize: 12, fontWeight: 500, display: 'block' }}>
              Precio:
              <span
                style={{
                  color: '#c084fc',
                  fontWeight: 700,
                  fontSize: 22,
                  lineHeight: 1,
                  marginLeft: 42,
                }}
              >
                {price} euros
              </span>
            </label>
            <input
              type="range"
              className={rangeClass}
              min={3}
              max={20}
              step={1}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              style={{ marginTop: 4 }}
            />
          </div>
        </div>

        <button
          type="button"
          style={{
            display: 'inline-flex',
            padding: '0 24px',
            backgroundColor: '#9333ea',
            color: '#fff',
            fontWeight: 600,
            height: 32,
            fontSize: 14,
            alignSelf: 'center',
            width: 'fit-content',
            border: 'none',
            borderRadius: 6,
            cursor: isLoading || !address ? 'not-allowed' : 'pointer',
            opacity: isLoading || !address ? 0.7 : 1,
            fontFamily: 'inherit',
          }}
          onClick={handleCreate}
          disabled={isLoading || !address}
        >
          {isLoading ? 'Publicando...' : 'Publicar mi WaitMe!'}
        </button>
      </div>
    </div>
  )
}
