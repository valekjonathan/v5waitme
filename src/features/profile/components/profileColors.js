import { carColors } from './VehicleIcons'

export function resolveColorFill(value) {
  if (value === 'verde') return '#00ff3b'
  if (value === 'otro') return '#9ca3af'
  const c = carColors.find((x) => x.value === value)
  return c?.fill ?? '#9ca3af'
}
