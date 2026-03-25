export const carColors = [
  { value: 'blanco', label: 'Blanco', fill: '#FFFFFF' },
  { value: 'negro', label: 'Negro', fill: '#1a1a1a' },
  { value: 'rojo', label: 'Rojo', fill: '#ef4444' },
  { value: 'azul', label: 'Azul', fill: '#3b82f6' },
  { value: 'amarillo', label: 'Amarillo', fill: '#facc15' },
  { value: 'gris', label: 'Gris', fill: '#6b7280' },
]

function iconStyle(size) {
  if (size === 'header') return { width: 64, height: 40 }
  return { width: 56, height: 36 }
}

export function VehicleIconProfile({ type, color, size = 'default' }) {
  if (type === 'suv') {
    return (
      <svg viewBox="0 0 48 24" style={iconStyle(size)} fill="none" aria-label="Todoterreno">
        <path
          d="M6 18 V13 L9.5 10.8 L16 8.8 H28.5 L36.5 10.8 L42 14.2 L43 18 H6 Z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M16.8 9.6 L19.2 12.6 H28.2 L30.4 9.6 Z"
          fill="rgba(255,255,255,0.22)"
          stroke="white"
          strokeWidth="0.5"
        />
        <path d="M29.1 9.6 V12.6" stroke="white" strokeWidth="0.5" opacity="0.6" />
        <path d="M42.7 15.6 H41.2" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="14.2" cy="18" r="3.8" fill="#333" stroke="white" strokeWidth="1" />
        <circle cx="14.2" cy="18" r="2" fill="#666" />
        <circle cx="35.6" cy="18" r="3.8" fill="#333" stroke="white" strokeWidth="1" />
        <circle cx="35.6" cy="18" r="2" fill="#666" />
      </svg>
    )
  }

  if (type === 'van' || type === 'furgoneta') {
    return (
      <svg viewBox="0 0 48 24" style={iconStyle(size)} fill="none" aria-label="Furgoneta">
        <path
          d="M4 18 V12.8 L7.5 10.8 L14 8.8 H32.2 L40.2 10.2 L45.6 13.8 L46 18 H4 Z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M15.5 9.6 L18 12.6 H31.2 L33.2 9.6 Z"
          fill="rgba(255,255,255,0.22)"
          stroke="white"
          strokeWidth="0.5"
        />
        <path d="M24.2 9.6 V12.6" stroke="white" strokeWidth="0.5" opacity="0.6" />
        <path d="M12.4 12.8 V18" stroke="white" strokeWidth="0.6" opacity="0.45" />
        <path d="M33.8 12.6 V18" stroke="white" strokeWidth="0.6" opacity="0.45" />
        <path d="M46 15.6 H44.4" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="13.6" cy="18" r="3.8" fill="#333" stroke="white" strokeWidth="1" />
        <circle cx="13.6" cy="18" r="2" fill="#666" />
        <circle cx="37.6" cy="18" r="3.8" fill="#333" stroke="white" strokeWidth="1" />
        <circle cx="37.6" cy="18" r="2" fill="#666" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 48 24" style={iconStyle(size)} fill="none" aria-label="Coche">
      <path
        d="M8 16 L10 10 L16 8 L32 8 L38 10 L42 14 L42 18 L8 18 Z"
        fill={color}
        stroke="white"
        strokeWidth="1.5"
      />
      <path
        d="M16 9 L18 12 L30 12 L32 9 Z"
        fill="rgba(255,255,255,0.3)"
        stroke="white"
        strokeWidth="0.5"
      />
      <circle cx="14" cy="18" r="4" fill="#333" stroke="white" strokeWidth="1" />
      <circle cx="14" cy="18" r="2" fill="#666" />
      <circle cx="36" cy="18" r="4" fill="#333" stroke="white" strokeWidth="1" />
      <circle cx="36" cy="18" r="2" fill="#666" />
    </svg>
  )
}

export function vehicleLabel(t) {
  if (t === 'suv') return 'Voluminoso'
  if (t === 'van' || t === 'furgoneta') return 'Furgoneta'
  if (t === 'moto') return 'Moto'
  return 'Normal'
}

function isWhiteVehicleColor(color) {
  const s = String(color || '')
    .trim()
    .toUpperCase()
  return s === '#FFF' || s === '#FFFFFF'
}

export function VehicleIcon({ type, color, size = 'default' }) {
  if (!isWhiteVehicleColor(color)) {
    return <VehicleIconProfile type={type} color={color} size={size} />
  }
  const body = '#FFFFFF'
  const windowFill = '#111'
  const sz = iconStyle(size)
  if (type === 'suv') {
    return (
      <svg viewBox="0 0 48 24" style={sz} fill="none" aria-hidden>
        <path
          d="M6 18 V13 L9.5 10.8 L16 8.8 H28.5 L36.5 10.8 L42 14.2 L43 18 H6 Z"
          fill={body}
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M16.8 9.6 L19.2 12.6 H28.2 L30.4 9.6 Z" fill={windowFill} stroke="#222" strokeWidth="0.5" />
        <path d="M29.1 9.6 V12.6" stroke="#222" strokeWidth="0.5" opacity="0.6" />
        <path d="M42.7 15.6 H41.2" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="14.2" cy="18" r="3.8" fill="#333" stroke="white" strokeWidth="1" />
        <circle cx="14.2" cy="18" r="2" fill="#666" />
        <circle cx="35.6" cy="18" r="3.8" fill="#333" stroke="white" strokeWidth="1" />
        <circle cx="35.6" cy="18" r="2" fill="#666" />
      </svg>
    )
  }
  if (type === 'van' || type === 'furgoneta') {
    return (
      <svg viewBox="0 0 48 24" style={sz} fill="none" aria-hidden>
        <path
          d="M4 18 V12.8 L7.5 10.8 L14 8.8 H32.2 L40.2 10.2 L45.6 13.8 L46 18 H4 Z"
          fill={body}
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M15.5 9.6 L18 12.6 H31.2 L33.2 9.6 Z" fill={windowFill} stroke="#222" strokeWidth="0.5" />
        <path d="M24.2 9.6 V12.6" stroke="#222" strokeWidth="0.5" opacity="0.6" />
        <path d="M12.4 12.8 V18" stroke="white" strokeWidth="0.6" opacity="0.45" />
        <path d="M33.8 12.6 V18" stroke="white" strokeWidth="0.6" opacity="0.45" />
        <path d="M46 15.6 H44.4" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="13.6" cy="18" r="3.8" fill="#333" stroke="white" strokeWidth="1" />
        <circle cx="13.6" cy="18" r="2" fill="#666" />
        <circle cx="37.6" cy="18" r="3.8" fill="#333" stroke="white" strokeWidth="1" />
        <circle cx="37.6" cy="18" r="2" fill="#666" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 48 24" style={sz} fill="none" aria-hidden>
      <path d="M8 16 L10 10 L16 8 L32 8 L38 10 L42 14 L42 18 L8 18 Z" fill={body} stroke="white" strokeWidth="1.5" />
      <path d="M16 9 L18 12 L30 12 L32 9 Z" fill={windowFill} stroke="#222" strokeWidth="0.5" />
      <circle cx="14" cy="18" r="4" fill="#333" stroke="white" strokeWidth="1" />
      <circle cx="14" cy="18" r="2" fill="#666" />
      <circle cx="36" cy="18" r="4" fill="#333" stroke="white" strokeWidth="1" />
      <circle cx="36" cy="18" r="2" fill="#666" />
    </svg>
  )
}

