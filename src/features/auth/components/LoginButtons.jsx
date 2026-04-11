import { useEffect, useState } from 'react'
import Button from '../../../ui/Button'
import IconSlot from '../../../ui/IconSlot'
import ButtonBase from '../../../ui/primitives/ButtonBase'
import { colors } from '../../../design/colors'
import { useAuth } from '../../../lib/AuthContext'
import { LAYOUT } from '../../../ui/layout/layout'

const OAUTH_ICON_SLOT_PX = 24
const GOOGLE_ICON_PX = 22
const APPLE_ICON_PX = 26
const iconSvgStyle = { display: 'block' }

/** Official multicolor G (viewBox 24x24), escala uniforme con Apple */
function GoogleMark() {
  return (
    <svg
      width={GOOGLE_ICON_PX}
      height={GOOGLE_ICON_PX}
      viewBox="-2 0 24 24"
      aria-hidden
      style={iconSvgStyle}
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

function AppleMark() {
  return (
    <svg
      width={APPLE_ICON_PX}
      height={APPLE_ICON_PX}
      viewBox="0 0 24 24"
      aria-hidden
      style={iconSvgStyle}
    >
      <path
        fill="#FFFFFF"
        d="M16.6 12.8c0-2.2 1.8-3.2 1.9-3.3-1-1.5-2.7-1.8-3.3-1.9-1.4-.1-2.7.8-3.4.8-.7 0-1.8-.8-3-.8-1.6 0-3 .9-3.8 2.2-1.6 2.8-.4 6.9 1.1 9.1.7 1.1 1.6 2.3 2.8 2.2 1.1 0 1.6-.7 3-.7 1.4 0 1.8.7 3 .7 1.2 0 2-.9 2.8-2 .8-1.2 1.2-2.4 1.2-2.5 0 0-2.3-.9-2.3-3.8zM14.3 6.1c.6-.7 1.1-1.8 1-2.9-.9 0-2 .6-2.6 1.3-.6.6-1.1 1.7-1 2.8 1 .1 2-.5 2.6-1.2z"
      />
    </svg>
  )
}

const OAUTH_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)'
const oauthTransitionBase = `background 180ms ${OAUTH_EASE}, background-image 180ms ${OAUTH_EASE}, box-shadow 180ms ${OAUTH_EASE}, filter 180ms ${OAUTH_EASE}, border-color 180ms ${OAUTH_EASE}, backdrop-filter 180ms ${OAUTH_EASE}`

const googleShadow = {
  idle: '0 4px 16px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(168, 85, 247, 0.06)',
  hover:
    '0 10px 32px rgba(0, 0, 0, 0.18), 0 0 40px rgba(168, 85, 247, 0.14), 0 0 0 1px rgba(255, 255, 255, 0.1)',
  pressed:
    '0 2px 10px rgba(0, 0, 0, 0.35), 0 0 14px rgba(168, 85, 247, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.08)',
}

const appleShadow = {
  idle: '0 4px 16px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(147, 51, 234, 0.08)',
  hover:
    '0 10px 32px rgba(0, 0, 0, 0.22), 0 0 36px rgba(147, 51, 234, 0.18), 0 0 0 1px rgba(255, 255, 255, 0.06)',
  pressed:
    '0 2px 10px rgba(0, 0, 0, 0.4), 0 0 12px rgba(147, 51, 234, 0.14), 0 0 0 1px rgba(0, 0, 0, 0.2)',
}

const googleBg =
  'linear-gradient(165deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 42%, rgba(24,24,32,0.92) 100%)'
const appleBg =
  'linear-gradient(165deg, rgba(124,58,237,0.35) 0%, rgba(88,28,135,0.55) 45%, rgba(59,7,100,0.95) 100%)'

const oauthButtonBase = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2px 24px',
  cursor: 'pointer',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
}

const oauthLabel = {
  lineHeight: '22px',
  transition: 'opacity 220ms ease-out',
  pointerEvents: 'none',
  whiteSpace: 'nowrap',
  display: 'block',
  width: '100%',
  textAlign: 'center',
}

const slowNoticeWrapStyle = {
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
  marginTop: 0,
}

const slowNoticePillStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 12,
  color: colors.textPrimary,
  background: 'rgba(168, 85, 247, 0.14)',
  border: '1px solid rgba(168, 85, 247, 0.38)',
  borderRadius: 999,
  padding: `${LAYOUT.spacing.sm - 2}px ${LAYOUT.spacing.md - 2}px`,
}

const slowNoticeDotStyle = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: '#a855f7',
  animation: 'waitme-oauth-pulse 1s ease-out infinite',
}

const spinnerStyle = {
  width: 18,
  height: 18,
  borderRadius: '50%',
  border: '2px solid rgba(255,255,255,0.22)',
  borderTopColor: 'rgba(255,255,255,0.92)',
  animation: 'waitme-oauth-spin 900ms linear infinite',
  flexShrink: 0,
}

const alertStyle = {
  margin: 0,
  marginTop: LAYOUT.spacing.sm,
  width: '100%',
  fontSize: 13,
  fontWeight: 500,
  color: colors.danger,
  lineHeight: 1.4,
}

/** Columna OAuth: el padre `[data-home-cta-region]` es flex sin `gap`; sin esto Google/Apple quedan pegados. */
const oauthStackStyle = {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  alignItems: 'stretch',
  gap: 14,
}

const oauthSpinStyleTag = `
  @keyframes waitme-oauth-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes waitme-oauth-pulse {
    0% { box-shadow: 0 0 0 0 rgba(168,85,247,0.45); }
    80% { box-shadow: 0 0 0 7px rgba(168,85,247,0); }
    100% { box-shadow: 0 0 0 0 rgba(168,85,247,0); }
  }
`

const googleIconStyle = {
  size: OAUTH_ICON_SLOT_PX,
  'aria-hidden': true,
}
const appleIconStyle = { size: OAUTH_ICON_SLOT_PX, 'aria-hidden': true }

function oauthPointerHandlers(setHover, setPressed, clearPress) {
  return {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false)
      clearPress()
    },
    onMouseDown: () => setPressed(true),
    onMouseUp: clearPress,
    onTouchStart: () => setPressed(true),
    onTouchEnd: clearPress,
    onTouchCancel: clearPress,
    onPointerLeave: () => {
      setHover(false)
      clearPress()
    },
  }
}

function OAuthButton({ variant, disabled, onClick, handlers, style, icon, label, ...rest }) {
  return (
    <Button
      type="button"
      variant={variant}
      disabled={disabled}
      onClick={onClick}
      {...handlers}
      style={style}
      {...rest}
    >
      <ButtonBase icon={icon} label={<span style={oauthLabel}>{label}</span>} />
    </Button>
  )
}

export default function LoginButtons() {
  const { authError, status, signInWithGoogle, authActionLoading } = useAuth()
  const [appleMessage, setAppleMessage] = useState('')
  const [googleHover, setGoogleHover] = useState(false)
  const [googlePressed, setGooglePressed] = useState(false)
  const [appleHover, setAppleHover] = useState(false)
  const [applePressed, setApplePressed] = useState(false)
  const [showSlowNotice, setShowSlowNotice] = useState(false)

  useEffect(() => {
    if (status !== 'authenticated') return
    try {
      window.localStorage?.setItem?.('hasSeenLogin', 'true')
    } catch {
      /* */
    }
  }, [status])

  useEffect(() => {
    if (!authActionLoading) {
      setShowSlowNotice(false)
      return undefined
    }
    const t = window.setTimeout(() => setShowSlowNotice(true), 1000)
    return () => window.clearTimeout(t)
  }, [authActionLoading])

  const onApple = () => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(8)
    }
    setAppleMessage('Apple login estará disponible próximamente.')
  }

  const clearGooglePress = () => setGooglePressed(false)
  const clearApplePress = () => setApplePressed(false)

  const googleHandlers = oauthPointerHandlers(setGoogleHover, setGooglePressed, clearGooglePress)
  const appleHandlers = oauthPointerHandlers(setAppleHover, setApplePressed, clearApplePress)

  const googleTransform = googlePressed ? 'scale(0.96)' : 'scale(1)'
  const googleTransition = `${oauthTransitionBase}, transform 260ms cubic-bezier(0.34, 1.35, 0.64, 1)`

  const googleShadowKey = googlePressed ? 'pressed' : googleHover ? 'hover' : 'idle'
  const googleStyle = {
    ...oauthButtonBase,
    backgroundColor: colors.surface,
    backgroundImage: googleBg,
    color: colors.textPrimary,
    boxShadow: googleShadow[googleShadowKey],
    transform: googleTransform,
    transition: googleTransition,
    filter: googleHover && !googlePressed ? 'brightness(1.04)' : 'none',
    opacity: authActionLoading ? 0.86 : 1,
  }

  const appleTransform = applePressed ? 'scale(0.96)' : 'scale(1)'
  const appleTransition = `${oauthTransitionBase}, transform 260ms cubic-bezier(0.34, 1.35, 0.64, 1)`

  const appleShadowKey = applePressed ? 'pressed' : appleHover ? 'hover' : 'idle'
  const appleStyle = {
    ...oauthButtonBase,
    backgroundColor: colors.primaryStrong,
    backgroundImage: appleBg,
    color: colors.textPrimary,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: appleShadow[appleShadowKey],
    transform: appleTransform,
    transition: appleTransition,
    filter: appleHover && !applePressed ? 'brightness(1.05)' : 'none',
  }

  return (
    <>
      <style>{oauthSpinStyleTag}</style>
      <div style={oauthStackStyle}>
        <OAuthButton
          variant="primary"
          disabled={authActionLoading}
          onClick={async () => {
            if (authActionLoading) return
            setAppleMessage('')
            await signInWithGoogle()
          }}
          handlers={googleHandlers}
          data-home-google-button=""
          style={googleStyle}
          icon={
            <IconSlot {...googleIconStyle}>
              {authActionLoading ? <span style={spinnerStyle} /> : <GoogleMark />}
            </IconSlot>
          }
          label={authActionLoading ? 'Conectando...' : 'Continuar con Google'}
        />
        {showSlowNotice ? (
          <div role="status" aria-live="polite" style={slowNoticeWrapStyle}>
            <span style={slowNoticePillStyle}>
              <span aria-hidden style={slowNoticeDotStyle} />
              Verificando acceso seguro...
            </span>
          </div>
        ) : null}
        <OAuthButton
          variant="secondary"
          disabled={authActionLoading}
          onClick={onApple}
          handlers={appleHandlers}
          style={appleStyle}
          icon={
            <IconSlot {...appleIconStyle}>
              <AppleMark />
            </IconSlot>
          }
          label="Continuar con Apple"
        />
      </div>
      {authError || appleMessage ? (
        <p role="alert" style={alertStyle}>
          {authError || appleMessage}
        </p>
      ) : null}
    </>
  )
}
