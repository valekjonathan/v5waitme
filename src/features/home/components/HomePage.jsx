import Header from '../../../ui/Header'
import BottomNav from '../../../ui/BottomNav'
import CenterPin from './CenterPin'
import Map from '../../map/components/Map'
import logo from '../../../assets/logo.png'
import { colors } from '../../../design/colors'
import { spacing } from '../../../design/spacing'
import { radius } from '../../../design/radius'
import Button from '../../../ui/Button'
import MagnifierIcon from '../../../ui/icons/MagnifierIcon'
import CarIconHome from '../../../ui/icons/CarIconHome'

export default function HomePage() {
  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <Map />
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 5,
          pointerEvents: 'none',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: colors.overlayPurple,
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', pointerEvents: 'none' }}>
          <div
            style={{
              pointerEvents: 'none',
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'visible',
              padding: `0 ${spacing.xl}px`,
            }}
          >
            <div
              style={{
                pointerEvents: 'auto',
                position: 'relative',
                zIndex: 10,
                display: 'flex',
                height: '100%',
                width: '100%',
                maxWidth: 340,
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.sm,
                textAlign: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div
                  style={{
                    display: 'flex',
                    width: 140,
                    height: 140,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: radius.logo,
                  }}
                >
                  <img
                    src={logo}
                    alt="WaitMe"
                    style={{ width: 120, height: 120, objectFit: 'contain' }}
                    loading="eager"
                    draggable={false}
                  />
                </div>
              </div>
              <h1
                style={{
                  margin: 0,
                  marginTop: spacing.xs,
                  padding: 0,
                  fontSize: 36,
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: '-0.025em',
                  color: colors.textPrimary,
                }}
              >
                Wait<span style={{ color: colors.primary }}>Me!</span>
              </h1>
              <p
                style={{
                  margin: 0,
                  padding: 0,
                  fontSize: 18,
                  fontWeight: 600,
                  lineHeight: 1,
                  color: colors.textPrimary,
                }}
              >
                Aparca donde te <span style={{ color: colors.primary }}>avisen!</span>
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', padding: `${spacing.lg}px 0` }}>
                <CenterPin />
              </div>
              <div style={{ marginTop: spacing.lg, display: 'flex', width: '100%', flexDirection: 'column', gap: spacing.md }}>
                <Button type="button" variant="primary">
                  <MagnifierIcon />
                  ¿Dónde quieres aparcar?
                </Button>
                <Button type="button" variant="secondary">
                  <CarIconHome />
                  ¡Estoy aparcado aquí!
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Header />
      <BottomNav />
    </div>
  )
}
