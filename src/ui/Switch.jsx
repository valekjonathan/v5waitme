import { colors } from '../design/colors'
import { radius } from '../design/radius'

/**
 * Interruptor "Permitir llamadas" (perfil / teléfono).
 */
export default function Switch({ checked, onToggle, ariaLabel }) {
  const trackStyle = {
    width: 44,
    height: 24,
    borderRadius: radius.xl,
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    background: checked ? colors.success : colors.danger,
    position: 'relative',
    flexShrink: 0,
  }

  const knobStyle = {
    position: 'absolute',
    top: 3,
    left: checked ? 23 : 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    background: colors.white,
    transition: 'left 0.12s ease-out',
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onToggle(!checked)}
      style={trackStyle}
    >
      <span style={knobStyle} />
    </button>
  )
}
