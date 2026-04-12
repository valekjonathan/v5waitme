import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import CenterPin from '../../home/components/CenterPin'
import logo from '../../../assets/logo.png'
import { colors } from '../../../design/colors'
import { radius } from '../../../design/radius'
import { LAYOUT } from '../../../ui/layout/layout'
import Section from '../../../ui/layout/Section'

const Map = lazy(() => import('../../map/components/Map'))

const mapSuspenseFallbackStyle = {
  width: '100%',
  height: '100%',
  backgroundColor: colors.background,
  pointerEvents: 'none',
}

const s = LAYOUT.spacing
const loginEntranceEase = 'opacity 400ms ease-out, transform 400ms ease-out'
const rootStyle = { position: 'relative', height: '100%', width: '100%', overflow: 'hidden' }
const mapLayerStyle = {
  position: 'absolute',
  inset: 0,
  zIndex: LAYOUT.z.map,
  backgroundColor: colors.background,
  /** Toda la capa (canvas Mapbox / fallback Suspense) no debe robar hits; WebKit + apilado puede desordenar. */
  pointerEvents: 'none',
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
  /**
   * Bajo IphoneFrame (transform: scale) WebKit falla a entregar eventos a hijos con pointer-events: auto
   * si demasiados ancestros usan pointer-events: none. La capa de contenido debe participar en hit-test
   * como superficie; el mapa ya tiene pointer-events: none en mapLayerStyle.
   */
  pointerEvents: 'auto',
}
const contentViewportStyle = {
  position: 'absolute',
  inset: 0,
  zIndex: LAYOUT.z.content,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'visible',
  padding: `0 ${LAYOUT.spacing.xl}px`,
  pointerEvents: 'auto',
}
const contentColumnStyle = {
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
  pointerEvents: 'auto',
}
const sectionInteractiveStyle = { pointerEvents: 'auto' }
const logoImageStyle = { width: 120, height: 120, objectFit: 'contain' }
const meTextStyle = { color: colors.primary }
const heroPinWrapStyle = { display: 'flex', justifyContent: 'center', padding: `${s.lg}px 0` }
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

function heroSectionInteractiveStyle(loginEntrance, loginHeroIn) {
  return {
    ...withLoginEntrance(heroSectionBaseStyle, loginEntrance, loginHeroIn),
    ...sectionInteractiveStyle,
  }
}

function ctaSectionInteractiveStyle(loginEntrance, loginCtaIn) {
  return {
    ...withLoginEntrance(ctaSectionBaseStyle, loginEntrance, loginCtaIn),
    ...sectionInteractiveStyle,
  }
}

/**
 * Layout base compartido por Login y Home: mapa, overlay, hero (logo, título, pin).
 * `loginEntrance`: solo Login; Home puede tener children (botones) sin animación escalonada.
 * @param {object} props
 * @param {import('react').ReactNode} [props.children]
 * @param {boolean} [props.loginEntrance]
 */
export default function MainLayout({ children = null, loginEntrance = false }) {
  const hasCta = children != null
  const [loginHeroIn, setLoginHeroIn] = useState(!loginEntrance)
  const [loginCtaIn, setLoginCtaIn] = useState(!loginEntrance)
  const [mapLayerSettled, setMapLayerSettled] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setMapLayerSettled(true), 2000)
    return () => window.clearTimeout(t)
  }, [])

  const onMapSettled = useCallback(() => {
    setMapLayerSettled(true)
  }, [])

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
    <div data-waitme-hit="mainLayoutRoot" style={rootStyle}>
      <div
        data-waitme-hit="mapLayer"
        style={mapLayerStyle}
        aria-busy={!mapLayerSettled}
        aria-label="Capa de mapa"
      >
        <Suspense fallback={<div style={mapSuspenseFallbackStyle} />}>
          <Map onSettled={onMapSettled} />
        </Suspense>
      </div>

      <div style={overlayLayerStyle(overlayBackground)} />

      <div data-waitme-hit="centeredLayer" style={centeredLayerStyle}>
        <div data-waitme-hit="contentViewport" style={contentViewportStyle}>
          <div data-waitme-hit="contentColumn" style={contentColumnStyle}>
            <Section gap={0} align="center" style={heroSectionInteractiveStyle(loginEntrance, loginHeroIn)}>
              <div style={heroLogoOuterStyle}>
                <div style={heroLogoBoxStyle}>
                  <img
                    src={logo}
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
              <p style={heroSubtitleStyle}>
                Aparca donde te <span style={meTextStyle}>avisen!</span>
              </p>
              <div style={heroPinWrapStyle}>
                <CenterPin />
              </div>
            </Section>
            {hasCta ? (
              <Section gap={s.md} style={ctaSectionInteractiveStyle(loginEntrance, loginCtaIn)}>
                {children}
              </Section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
