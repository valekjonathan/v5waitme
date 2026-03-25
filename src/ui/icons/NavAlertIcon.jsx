import { shadows } from '../../design/shadows'

export default function NavAlertIcon() {
  return (
    <svg
      style={{ width: 40, height: 40, filter: shadows.iconGlow }}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
    >
      <path d="M30 8 L14 8 L14 5 L8 10 L14 15 L14 12 L30 12 Z" fill="currentColor" />
      <path d="M2 20 L18 20 L18 17 L24 22 L18 27 L18 24 L2 24 Z" fill="currentColor" />
    </svg>
  )
}
