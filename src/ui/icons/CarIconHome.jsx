import { colors } from '../../design/colors'

/** Coche de la pantalla de entrada (Home); cuerpo fijo oscuro, distinto de VehicleIcon del perfil. */
export default function CarIconHome() {
  return (
    <svg viewBox="0 0 48 24" style={{ width: 80, height: 56 }} fill="none" aria-hidden>
      <path
        d="M8 16 L10 10 L16 8 L32 8 L38 10 L42 14 L42 18 L8 18 Z"
        fill={colors.carHomeBody}
        stroke="white"
        strokeWidth="1.5"
      />
      <path
        d="M16 9 L18 12 L30 12 L32 9 Z"
        fill={colors.carWindowTint}
        stroke="white"
        strokeWidth="0.5"
      />
      <circle cx="14" cy="18" r="4" fill={colors.wheelOuter} stroke="white" strokeWidth="1" />
      <circle cx="14" cy="18" r="2" fill={colors.wheelInner} />
      <circle cx="36" cy="18" r="4" fill={colors.wheelOuter} stroke="white" strokeWidth="1" />
      <circle cx="36" cy="18" r="2" fill={colors.wheelInner} />
    </svg>
  )
}
