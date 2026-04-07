import { useEffect, useState } from 'react'
import { useAppScreen } from '../../../lib/AppScreenContext'
import Map from '../../map/components/Map.jsx'
import SimulatedCarsOnMap from '../../map/components/SimulatedCarsOnMap'
import { useSimulatedParkingUsers } from '../../map/useSimulatedParkingUsers'
import { colors } from '../../../design/colors'
import { radius } from '../../../design/radius'
import { LAYOUT } from '../../../ui/layout/layout'
import Section from '../../../ui/layout/Section'

const s = LAYOUT.spacing
const loginEntranceEase = 'opacity 400ms ease-out, transform 400ms ease-out'
const rootStyle = {
  position: 'relative',
  flex: '1 1 0%',
  minHeight: 0,
  minWidth: 0,
  height: '100%',
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflowX: 'hidden',
  overflowY: 'hidden',
}
const mapLayerStyle = {
  position: 'absolute',
  inset: 0,
  zIndex: LAYOUT.z.map,
  backgroundColor: colors.background,
}
const overlayStyleBase = {
  position: 'absolute',
  inset: 0,
  zIndex: LAYOUT.z.overlay,
  pointerEvents: 'none',
}
const centeredLayerStyle = {
  position: 'absolute',
  inset: 0,
  zIndex: LAYOUT.z.content,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}
const contentViewportStyle = {
  pointerEvents: 'none',
  position: 'absolute',
  inset: 0,
  zIndex: LAYOUT.z.content,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'visible',
  padding: 0,
}
const contentColumnStyle = {
  pointerEvents: 'auto',
  position: 'relative',
  zIndex: LAYOUT.z.content,
  display: 'flex',
  height: '100%',
  width: '100%',
  maxWidth: 340,
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: s.sm,
  textAlign: 'center',
}
const logoImageStyle = { width: 120, height: 120, objectFit: 'contain' }
const meTextStyle = { color: colors.primary }
/** Reserva el mismo hueco vertical que el pin decorativo del hero (padding lg + 18+36 en flujo). */
const heroPinWrapStyle = { display: 'flex', justifyContent: 'center', padding: `${s.lg}px 0` }
const heroPinSpacerStyle = { width: 18, height: 54, flexShrink: 0 }
const heroSectionBaseStyle = { alignItems: 'center' }
const heroTitleStyle = {
  margin: 0,
  marginTop: s.xs,
  padding: 0,
  fontSize: 36,
  fontWeight: 700,
  lineHeight: 1,
  letterSpacing: '-0.025em',
  color: colors.textPrimary,
}
const heroSubtitleStyle = {
  margin: 0,
  marginTop: '8px',
  padding: 0,
  fontSize: 18,
  fontWeight: 600,
  lineHeight: 1,
  color: colors.textPrimary,
}
const ctaSectionBaseStyle = { marginTop: s.lg }
const heroLogoOuterStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' }
const heroLogoBoxStyle = {
  display: 'flex',
  width: 140,
  height: 140,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: radius.logo,
}
/** No altera el gap del Section; permite medir `[data-home-cta-region] button` en Home. */
const homeCtaRegionWrapStyle = { display: 'contents' }

function withLoginEntrance(baseStyle, isLoginLayout, visible) {
  if (!isLoginLayout) return baseStyle
  return {
    ...baseStyle,
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(20px)',
    transition: loginEntranceEase,
  }
}

function overlayLayerStyle(background) {
  return { ...overlayStyleBase, background }
}

/**
 * Layout base compartido por Login y Home: mapa, overlay, hero (logo, título). Pin en Map.jsx.
 * `loginEntrance`: solo Login; Home puede tener children (botones) sin animación escalonada.
 * @param {object} props
 * @param {import('react').ReactNode} [props.children]
 * @param {boolean} [props.loginEntrance]
 */
export default function MainLayout({ children = null, loginEntrance = false }) {
  const { mapFocusGeneration } = useAppScreen()
  const simulatedUsers = useSimulatedParkingUsers()
  const hasCta = children != null
  const [loginHeroIn, setLoginHeroIn] = useState(!loginEntrance)
  const [loginCtaIn, setLoginCtaIn] = useState(!loginEntrance)

  useEffect(() => {
    if (!loginEntrance) {
      setLoginHeroIn(true)
      setLoginCtaIn(true)
      return
    }
    setLoginHeroIn(false)
    setLoginCtaIn(false)
    const raf = requestAnimationFrame(() => setLoginHeroIn(true))
    const t = window.setTimeout(() => setLoginCtaIn(true), 120)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(t)
    }
  }, [loginEntrance])

  /** Mismo tratamiento que Login: Home queda idéntico salvo el bloque CTA (children). */
  const overlayBackground =
    'linear-gradient(180deg, rgba(55, 20, 90, 0.34) 0%, rgba(40, 16, 70, 0.42) 100%)'

  return (
    <div style={rootStyle}>
      <div style={mapLayerStyle} aria-label="Capa de mapa">
        <Map readOnly mapFocusGeneration={mapFocusGeneration} />
        <SimulatedCarsOnMap enabled users={simulatedUsers} />
      </div>

      <div style={overlayLayerStyle(overlayBackground)} />

      <div style={centeredLayerStyle}>
        <div style={contentViewportStyle}>
          <div style={contentColumnStyle}>
            <Section
              gap={0}
              align="center"
              style={withLoginEntrance(heroSectionBaseStyle, loginEntrance, loginHeroIn)}
            >
              <div style={heroLogoOuterStyle}>
                <div style={heroLogoBoxStyle}>
                  <img
                    src="/logo.png"
                    alt="WaitMe"
                    style={logoImageStyle}
                    loading="eager"
                    draggable={false}
                  />
                </div>
              </div>
              <h1 style={heroTitleStyle}>
                Wait<span style={meTextStyle}>Me!</span>
              </h1>
              <p data-home-subtitle style={heroSubtitleStyle}>
                Aparca donde te <span style={meTextStyle}>avisen!</span>
              </p>
              <div style={heroPinWrapStyle} aria-hidden>
                <div style={heroPinSpacerStyle} />
              </div>
            </Section>
            {hasCta ? (
              <Section
                gap={s.md}
                style={withLoginEntrance(ctaSectionBaseStyle, loginEntrance, loginCtaIn)}
              >
                <div data-home-cta-region style={homeCtaRegionWrapStyle}>
                  {children}
                </div>
              </Section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
