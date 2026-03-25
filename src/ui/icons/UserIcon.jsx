import { colors } from '../../design/colors'
import { shadows } from '../../design/shadows'

export default function UserIcon() {
  return (
    <svg
      style={{
        width: 28,
        height: 28,
        cursor: 'pointer',
        color: colors.primary,
        filter: shadows.iconGlow,
      }}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
