import { usePostHog } from '@posthog/react'
import { useCallback, useEffect, useState } from 'react'
import CenterPin from './CenterPin'
import Map from '../../map/components/Map'
import logo from '../../../assets/logo.png'
import { EVENTS, track } from '../../../lib/tracking.js'
import { colors } from '../../../design/colors'
import { spacing } from '../../../design/spacing'
import { radius } from '../../../design/radius'
import Button from '../../../ui/Button'
import MagnifierIcon from '../../../ui/icons/MagnifierIcon'
import CarIconHome from '../../../ui/icons/CarIconHome'

const loginEntranceEase = 'opacity 400ms ease-out, transform 400ms ease-out'

export default function HomePage({ centerContent = null }) {
  const posthog = usePostHog()
  const isLoginLayout = Boolean(centerContent)
  const [loginHeroIn, setLoginHeroIn] = useState(!isLoginLayout)
  const [loginCtaIn, setLoginCtaIn] = useState(!isLoginLayout)
  const [mapLayerSettled, setMapLayerSettled] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setMapLayerSettled(true), 2000)
    return () => window.clearTimeout(t)
  }, [])

  const onMapSettled = useCallback(() => {
    setMapLayerSettled(true)
  }, [])

  useEffect(() => {
    if (!isLoginLayout) {
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
  }, [isLoginLayout])

  useEffect(() => {
    track(EVENTS.HOME_VIEW, { device: 'web', screen: 'home' }, posthog)
  }, [posthog])

  useEffect(() => {
    let engaged = false
    const onFirstEngage = () => {
      if (engaged) return
      engaged = true
      track(EVENTS.USER_ENGAGED, { device: 'web', screen: 'home' }, posthog)
    }
    const opts = { passive: true, capture: true }
    window.addEventListener('wheel', onFirstEngage, opts)
    window.addEventListener('touchmove', onFirstEngage, opts)
    window.addEventListener('scroll', onFirstEngage, opts)
    return () => {
      window.removeEventListener('wheel', onFirstEngage, opts)
      window.removeEventListener('touchmove', onFirstEngage, opts)
      window.removeEventListener('scroll', onFirstEngage, opts)
    }
  }, [posthog])

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          backgroundColor: colors.background,
        }}
        aria-busy={!mapLayerSettled}
        aria-label="Capa de mapa"
      >
        <Map onSettled={onMapSettled} />
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 5,
          pointerEvents: 'none',
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
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            pointerEvents: 'none',
          }}
        >
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
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: '100%',
                  ...(isLoginLayout
                    ? {
                        opacity: loginHeroIn ? 1 : 0,
                        transform: loginHeroIn ? 'translateY(0)' : 'translateY(20px)',
                        transition: loginEntranceEase,
                      }
                    : {}),
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
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    padding: `${spacing.lg}px 0`,
                  }}
                >
                  <CenterPin />
                </div>
              </div>
              <div
                style={{
                  marginTop: spacing.lg,
                  display: 'flex',
                  width: '100%',
                  flexDirection: 'column',
                  gap: spacing.md,
                  ...(isLoginLayout
                    ? {
                        opacity: loginCtaIn ? 1 : 0,
                        transform: loginCtaIn ? 'translateY(0)' : 'translateY(20px)',
                        transition: loginEntranceEase,
                      }
                    : {}),
                }}
              >
                {centerContent || (
                  <>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() =>
                        track(EVENTS.SEARCH_CLICK, { device: 'web', screen: 'home' }, posthog)
                      }
                    >
                      <MagnifierIcon />
                      ¿Dónde quieres aparcar?
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        track(EVENTS.PARK_CLICK, { device: 'web', screen: 'home' }, posthog)
                      }
                    >
                      <CarIconHome />
                      ¡Estoy aparcado aquí!
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
