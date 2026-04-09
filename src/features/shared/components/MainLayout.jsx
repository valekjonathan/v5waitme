import Map from '../../map/components/Map.jsx'
import SimulatedCarsOnMap from '../../map/components/SimulatedCarsOnMap'
import CenterPin from '../../home/components/CenterPin'
import { useSimulatedParkingUsers } from '../../map/useSimulatedParkingUsers'
import { colors } from '../../../design/colors'
import { radius } from '../../../design/radius'
import { LAYOUT } from '../../../ui/layout/layout'
import Section from '../../../ui/layout/Section'

const s = LAYOUT.spacing
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
/** No altera el gap del Section; permite medir `[data-home-cta-region] button` en Home. */
const homeCtaRegionWrapStyle = { display: 'contents' }

function overlayLayerStyle(background) {
  return { ...overlayStyleBase, background }
}

/**
 * Layout base compartido por Login y Home: mapa, overlay, hero (logo, título, frase, pin, CTAs).
 * Ancla GPS: `MapViewportCenterPin` en Map (medición, punta en centro); pin visible en columna (mismo CenterPin).
 * `loginEntrance` se acepta por compatibilidad con LoginPage; la entrada es instantánea.
 */
export default function MainLayout({ children = null, loginEntrance: _loginEntrance = false }) {
  const simulatedUsers = useSimulatedParkingUsers()
  const hasCta = children != null

  const overlayBackground =
    'linear-gradient(180deg, rgba(55, 20, 90, 0.34) 0%, rgba(40, 16, 70, 0.42) 100%)'

  return (
    <div style={rootStyle}>
      <div style={mapLayerStyle} aria-label="Capa de mapa">
        <Map readOnly hideViewportCenterPin />
        <SimulatedCarsOnMap enabled users={simulatedUsers} />
      </div>

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
                <CenterPin />
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
  )
}
