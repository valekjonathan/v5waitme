import { carColors } from './VehicleIcons'

export function resolveColorFill(value) {
  if (value === 'verde') return '#00ff3b'
  const c = carColors.find((x) => x.value === value)
  return c?.fill ?? carColors[5].fill
}
