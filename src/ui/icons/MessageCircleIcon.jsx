import { shadows } from '../../design/shadows'

export default function MessageCircleIcon() {
  return (
    <svg
      style={{ width: 40, height: 40, filter: shadows.iconGlow }}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  )
}
