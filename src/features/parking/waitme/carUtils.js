/** Copiado de WaitMe original: src/utils/carUtils.js (extracto). */
const CAR_COLOR_MAP = {
  blanco: '#FFFFFF',
  blanca: '#FFFFFF',
  negro: '#1a1a1a',
  negra: '#1a1a1a',
  gris: '#6b7280',
  grisaceo: '#6b7280',
  plata: '#d1d5db',
  plateado: '#d1d5db',
  rojo: '#ef4444',
  roja: '#ef4444',
  azul: '#3b82f6',
  verde: '#22c55e',
  amarillo: '#eab308',
  naranja: '#f97316',
  morado: '#7c3aed',
  rosa: '#ec4899',
  beige: '#d4b483',
  marron: '#92400e',
  marrón: '#92400e',
  dorado: '#d97706',
}

function normalizeColorKey(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function getCarFill(colorName) {
  if (!colorName) return '#6b7280'
  const key = normalizeColorKey(colorName)
  return CAR_COLOR_MAP[key] ?? '#6b7280'
}

/**
 * Solo `normal` | `suv` | `van` para `VehicleIcon` en mapas (perfil usa `car` → normal).
 */
export function normalizeVehicleTypeForMapIcon(t) {
  if (t === 'suv') return 'suv'
  if (t === 'van' || t === 'furgoneta') return 'van'
  if (t === 'car' || t === 'normal' || t === 'sedan') return 'normal'
  return 'normal'
}

/**
 * Tipos simulados en mapa: solo coche normal, SUV o furgoneta (reproducible).
 */
export function vehicleTypeForSimulatedIndex(index) {
  const cycle = ['normal', 'suv', 'van', 'suv', 'normal', 'van', 'suv', 'normal', 'van', 'suv']
  return cycle[((index % cycle.length) + cycle.length) % cycle.length]
}
