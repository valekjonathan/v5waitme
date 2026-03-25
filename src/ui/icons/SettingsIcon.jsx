import { colors } from '../../design/colors'
import { shadows } from '../../design/shadows'

export default function SettingsIcon() {
  return (
    <svg
      style={{
        width: 28,
        height: 28,
        cursor: 'pointer',
        color: colors.primary,
        filter: shadows.iconGlow,
        overflow: 'visible',
      }}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 2.8a1.9 1.9 0 0 1 1.9 1.9v.46a1.32 1.32 0 0 0 .9 1.25 1.3 1.3 0 0 0 1.47-.37l.32-.33a1.9 1.9 0 1 1 2.68 2.69l-.33.32a1.3 1.3 0 0 0-.36 1.47 1.32 1.32 0 0 0 1.25.9h.46a1.9 1.9 0 1 1 0 3.8h-.46a1.32 1.32 0 0 0-1.25.9 1.3 1.3 0 0 0 .36 1.47l.33.32a1.9 1.9 0 0 1-2.68 2.69l-.32-.33a1.3 1.3 0 0 0-1.47-.37 1.32 1.32 0 0 0-.9 1.25v.46a1.9 1.9 0 1 1-3.8 0v-.46a1.32 1.32 0 0 0-.9-1.25 1.3 1.3 0 0 0-1.47.37l-.32.33a1.9 1.9 0 1 1-2.69-2.69l.33-.32a1.3 1.3 0 0 0 .37-1.47 1.32 1.32 0 0 0-1.25-.9H3.7a1.9 1.9 0 1 1 0-3.8h.46a1.32 1.32 0 0 0 1.25-.9 1.3 1.3 0 0 0-.37-1.47l-.33-.32a1.9 1.9 0 1 1 2.69-2.69l.32.33a1.3 1.3 0 0 0 1.47.37 1.32 1.32 0 0 0 .9-1.25V4.7A1.9 1.9 0 0 1 12 2.8z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
