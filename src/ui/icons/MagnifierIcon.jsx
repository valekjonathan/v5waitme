import { colors } from '../../design/colors'

export default function MagnifierIcon() {
  return (
    <svg viewBox="0 0 48 48" style={{ width: 56, height: 56 }} fill="none" aria-hidden>
      <circle cx="20" cy="20" r="12" fill={colors.violet} stroke="white" strokeWidth="1.5" />
      <path
        d="M15 16 C16 13, 18 12, 21 12"
        stroke={colors.magnifierGlassStroke}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M28 28 L38 38" stroke="white" strokeWidth="4" strokeLinecap="round" />
      <path
        d="M36.8 36.8 L40.8 40.8"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  )
}
