/** Copiado de WaitMe original: src/utils/carUtils.js (extracto). */
export const CAR_COLOR_MAP = {
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

export function formatPlate(plate) {
  const p = String(plate || '')
    .replace(/\s+/g, '')
    .toUpperCase()
  if (!p) return '0000 XXX'
  return `${p.slice(0, 4)} ${p.slice(4)}`.trim()
}
