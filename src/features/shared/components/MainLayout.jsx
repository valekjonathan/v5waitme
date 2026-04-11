import { lazy, Suspense } from 'react'

const MainLayoutMapStack = lazy(() => import('../../map/components/MainLayoutMapStack.jsx'))
import CenterPin from '../../home/components/CenterPin'
import { useSimulatedParkingUsers } from '../../map/useSimulatedParkingUsers'
import { colors } from '../../../design/colors'
import { radius } from '../../../design/radius'
import { LAYOUT } from '../../../ui/layout/layout'
import Section from '../../../ui/layout/Section'

const s = LAYOUT.spacing
/** Contenedor único: mapa (fondo) + chrome (cadena flex WKWebView). */
export const mainLayoutRootStyle = {
  display: 'flex',
  flexDirection: 'column',
  flex: '1 1 0%',
  minHeight: 0,
  position: 'relative',
  isolation: 'isolate',
  alignSelf: 'stretch',
  minWidth: 0,
  width: '100%',
  overflowX: 'hidden',
  overflowY: 'hidden',
}
/** Capa mapa detrás: absolute z0; en Home (AuthenticatedMapScreen) se añade pointerEvents: none. */
export const mainLayoutMapBackgroundStyle = {
  position: 'absolute',
  inset: 0,
  zIndex: LAYOUT.z.map,
  backgroundColor: colors.background,
}
/** Capa Home/chrome delante del mapa (mismo shell que login). */
export const mainLayoutHomeSlotStyle = {
  display: 'flex',
  flexDirection: 'column',
  flex: '1 1 0%',
  minHeight: 0,
  position: 'relative',
  zIndex: 1,
  alignSelf: 'stretch',
  width: '100%',
}
/**
 * WKWebView: un flex con solo hijos `position:absolute` puede tener altura de contenido 0.
 * Este bloque está en flujo normal y recibe la altura del padre flex (cadena root → Home slot).
 */
const mainLayoutChromeFlowStyle = {
  position: 'relative',
  flex: '1 1 0%',
  minHeight: 0,
  width: '100%',
  alignSelf: 'stretch',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}
/** Contenedor del velo + hero + CTAs: relativo + flex para altura fiable (no solo capas absolute sueltas). */
const mainLayoutChromeStackStyle = {
  position: 'relative',
  flex: '1 1 0%',
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  alignSelf: 'stretch',
  width: '100%',
  pointerEvents: 'none',
  isolation: 'isolate',
  overflow: 'hidden',
}
/** Mismo fondo que la capa mapa mientras carga el chunk async (sin parpadeo de color). */
const mapLazyFallbackStyle = {
  position: 'absolute',
  inset: 0,
  minHeight: 0,
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
  flex: '1 1 0%',
  minHeight: 0,
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
/** Pin entre frase y CTAs: encima del velo (z content); medición/ancla real sigue en MapViewportCenterPin (opacity 0). */
const heroPinRowStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-start',
  width: '100%',
  paddingTop: s.lg,
  paddingBottom: s.lg,
  pointerEvents: 'none',
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
/**
 * WKWebView: `display: contents` en el envoltorio de CTAs puede romper caja de formato / hit-test;
 * flujo flex real conserva medición `[data-home-cta-region] button`.
 */
const homeCtaRegionWrapStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: '100%',
  /** Espaciado vertical entre CTAs (login OAuth, home); requiere hijos directos en columna, no un solo wrapper. */
  gap: 14,
}

function overlayLayerStyle(background) {
  return { ...overlayStyleBase, background }
}

/**
 * Velo + hero + CTAs (sin capa de mapa). Login y `AuthenticatedMapScreen` (home) comparten el mismo chrome.
 */
export function MainLayoutChrome({ children = null }) {
  const hasCta = children != null
  const overlayBackground =
    'linear-gradient(180deg, rgba(55, 20, 90, 0.34) 0%, rgba(40, 16, 70, 0.42) 100%)'

  return (
    <div style={mainLayoutChromeStackStyle}>
      <div style={mainLayoutChromeFlowStyle}>
        <div style={overlayLayerStyle(overlayBackground)} />

        <div style={centeredLayerStyle}>
          <div style={contentViewportStyle}>
            <div style={contentColumnStyle}>
              <Section gap={0} align="center" style={heroSectionBaseStyle}>
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
                <div style={heroPinRowStyle} aria-hidden>
                  <CenterPin waitmePinTipAnchor />
                </div>
              </Section>
              {hasCta ? (
                <Section gap={s.md} style={ctaSectionBaseStyle}>
                  <div data-home-cta-region style={homeCtaRegionWrapStyle}>
                    {children}
                  </div>
                </Section>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Layout base compartido por Login y Home: mapa, overlay, hero (logo, título, frase, pin, CTAs).
 * `mapLayer` opcional sustituye `MainLayoutMapStack` (p. ej. mapa autenticado en home).
 */
export default function MainLayout({
  children = null,
  loginEntrance: _loginEntrance = false,
  mapLayer = null,
  mapBackgroundExtraStyle = undefined,
}) {
  const simulatedUsers = useSimulatedParkingUsers()

  const mapBgStyle =
    mapBackgroundExtraStyle != null
      ? { ...mainLayoutMapBackgroundStyle, ...mapBackgroundExtraStyle }
      : mainLayoutMapBackgroundStyle

  return (
    <div style={mainLayoutRootStyle}>
      <div style={mapBgStyle} aria-label="Capa de mapa">
        {mapLayer != null ? (
          mapLayer
        ) : (
          <Suspense fallback={<div style={mapLazyFallbackStyle} aria-hidden />}>
            <MainLayoutMapStack simulatedUsers={simulatedUsers} />
          </Suspense>
        )}
      </div>

      <div style={mainLayoutHomeSlotStyle}>
        <MainLayoutChrome>{children}</MainLayoutChrome>
      </div>
    </div>
  )
}
