import { useAppScreen } from '../lib/AppScreenContext'
import { useAuth } from '../lib/AuthContext'
import {
  ProfileIncompleteNoticeProvider,
  useProfileIncompleteNotice,
} from '../lib/ProfileIncompleteNoticeContext.jsx'
import ErrorBoundary from '../lib/ErrorBoundary.jsx'
import { Providers } from './Providers.jsx'
import { useAppHeight } from './useAppHeight.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import HomePage from '../features/home/components/HomePage'
import ProfilePage from '../features/profile/components/ProfilePage'
import ReviewsPage from '../features/reviews/pages/ReviewsPage'
import LoginPage from '../features/auth/components/LoginPage'
import IphoneFrame from '../ui/IphoneFrame'
import ScreenShell from '../ui/layout/ScreenShell'
import { SCREEN_SHELL_MAIN_MODE } from '../ui/layout/layout'
import { profileReviewsShellContentStyle } from '../features/shared/layout/ProfileReviewsLayout'
import Button from '../ui/Button'
import { colors } from '../design/colors'
import { APP_SCREEN_PROFILE, APP_SCREEN_REVIEWS } from '../lib/appScreenState.js'

const homeGateStyle = { height: '100%', width: '100%' }

const insetShellStyle = { backgroundColor: colors.background }

const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 2147483646,
  backgroundColor: 'rgba(0,0,0,0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  boxSizing: 'border-box',
}

const modalBoxStyle = {
  maxWidth: 320,
  width: '100%',
  backgroundColor: colors.background,
  borderRadius: 16,
  padding: 20,
  border: `1px solid ${colors.border}`,
  boxSizing: 'border-box',
}

const modalTextStyle = {
  margin: 0,
  marginBottom: 16,
  fontSize: 15,
  fontWeight: 600,
  lineHeight: 1.4,
  color: colors.textPrimary,
  textAlign: 'center',
}

function IncompleteProfileModal({ open, onClose, onConfirm }) {
  if (!open) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="waitme-incomplete-profile-title"
      style={modalOverlayStyle}
      onClick={onClose}
    >
      <div style={modalBoxStyle} onClick={(e) => e.stopPropagation()}>
        <p id="waitme-incomplete-profile-title" style={modalTextStyle}>
          Debes completar tu perfil para usar esta función
        </p>
        <Button type="button" variant="primary" style={{ width: '100%' }} onClick={onConfirm}>
          OK
        </Button>
      </div>
    </div>
  )
}

function IncompleteProfileModalHost({ open, onClose }) {
  const { openProfile } = useAppScreen()
  return (
    <IncompleteProfileModal
      open={open}
      onClose={onClose}
      onConfirm={() => {
        openProfile()
        onClose()
      }}
    />
  )
}

/** Home: acciones bloqueadas si el perfil no cumple reglas (modal, sin eventos window). */
function HomeActionGate({ children }) {
  const { isProfileComplete } = useAuth()
  const notice = useProfileIncompleteNotice()
  const complete = Boolean(isProfileComplete)
  const rootRef = useRef(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined

    const onPointerDownCapture = (e) => {
      if (complete) return
      const t = e.target
      if (!(t instanceof Element)) return
      const btn = t.closest('button')
      if (!btn || !root.contains(btn)) return
      const label = (btn.textContent || '').trim()
      if (
        label.includes('¿Dónde quieres aparcar') ||
        label.includes('Estoy aparcado') ||
        label.includes('aparcado aquí') ||
        label.includes('Crear alerta') ||
        label.includes('primera alerta')
      ) {
        e.preventDefault()
        e.stopPropagation()
        notice?.requestNotice?.()
      }
    }

    root.addEventListener('pointerdown', onPointerDownCapture, true)
    return () => root.removeEventListener('pointerdown', onPointerDownCapture, true)
  }, [complete, notice])

  return (
    <div ref={rootRef} data-waitme-home-gate style={homeGateStyle}>
      {children}
    </div>
  )
}

function AuthenticatedShellWithBoundary({ children }) {
  const { screen } = useAppScreen()
  return (
    <ErrorBoundary resetKeys={[screen]} name="shell">
      {children}
    </ErrorBoundary>
  )
}

function AppLayout({ children }) {
  return <IphoneFrame>{children}</IphoneFrame>
}

/** Home: fullBleed bajo el ScreenShell global. Perfil/reseñas: solo contenido (mismo shell). */
function AuthenticatedMainChrome() {
  const { screen } = useAppScreen()
  if (screen === APP_SCREEN_PROFILE) return <ProfilePage />
  if (screen === APP_SCREEN_REVIEWS) return <ReviewsPage />
  return (
    <HomeActionGate>
      <HomePage />
    </HomeActionGate>
  )
}

function AuthBootScreen() {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
        color: colors.textMuted,
        fontSize: 14,
        fontWeight: 500,
      }}
    >
      Cargando…
    </div>
  )
}

function MainAppContent() {
  const { isProfileComplete } = useAuth()
  const [incompleteModalOpen, setIncompleteModalOpen] = useState(false)

  const noticeValue = useMemo(
    () => ({
      requestNotice: () => setIncompleteModalOpen(true),
    }),
    []
  )

  const closeIncompleteModal = useCallback(() => setIncompleteModalOpen(false), [])

  return (
    <AuthenticatedShellWithBoundary>
      <ProfileIncompleteNoticeProvider value={noticeValue}>
        <IncompleteProfileModalHost open={incompleteModalOpen} onClose={closeIncompleteModal} />
        {!isProfileComplete ? <ProfilePage /> : <AuthenticatedMainChrome />}
      </ProfileIncompleteNoticeProvider>
    </AuthenticatedShellWithBoundary>
  )
}

function isAuthReady(status, user, profileBootstrapReady) {
  if (status === 'loading') return false
  if (status === 'authenticated' && user && !profileBootstrapReady) return false
  return true
}

/**
 * Solo rutas / contenido (boot | login | main). Sin ScreenShell aquí: una sola instancia en `AppScreenShell`.
 */
function AppRoutes() {
  const { user, status, profileBootstrapReady } = useAuth()

  const authResolved = useMemo(
    () => isAuthReady(status, user, profileBootstrapReady),
    [status, user, profileBootstrapReady]
  )

  return (
    <>
      {!authResolved && <AuthBootScreen />}
      {authResolved && !user && <LoginPage />}
      {authResolved && user && <MainAppContent />}
    </>
  )
}

/**
 * Único `ScreenShell` del producto: bajo `AppLayout` (IphoneFrame), encima de `AppRoutes`.
 */
function AppScreenShell() {
  const { user, status, profileBootstrapReady, isProfileComplete } = useAuth()
  const { screen } = useAppScreen()

  const authResolved = useMemo(
    () => isAuthReady(status, user, profileBootstrapReady),
    [status, user, profileBootstrapReady]
  )

  const shellConfig = useMemo(() => {
    if (!authResolved) {
      return {
        interactive: false,
        mainMode: SCREEN_SHELL_MAIN_MODE.FULL_BLEED,
        mainOverflow: 'auto',
        style: {},
        contentStyle: {},
      }
    }
    if (!user) {
      return {
        interactive: false,
        mainMode: SCREEN_SHELL_MAIN_MODE.FULL_BLEED,
        mainOverflow: 'auto',
        style: {},
        contentStyle: {},
      }
    }
    if (!isProfileComplete) {
      return {
        interactive: true,
        mainMode: SCREEN_SHELL_MAIN_MODE.INSET,
        mainOverflow: 'hidden',
        style: insetShellStyle,
        contentStyle: profileReviewsShellContentStyle,
      }
    }
    if (screen === APP_SCREEN_PROFILE) {
      return {
        interactive: true,
        mainMode: SCREEN_SHELL_MAIN_MODE.INSET,
        mainOverflow: 'hidden',
        style: insetShellStyle,
        contentStyle: profileReviewsShellContentStyle,
      }
    }
    if (screen === APP_SCREEN_REVIEWS) {
      return {
        interactive: true,
        mainMode: SCREEN_SHELL_MAIN_MODE.INSET,
        mainOverflow: 'hidden',
        style: insetShellStyle,
        contentStyle: profileReviewsShellContentStyle,
      }
    }
    return {
      interactive: true,
      mainMode: SCREEN_SHELL_MAIN_MODE.FULL_BLEED,
      mainOverflow: 'auto',
      style: {},
      contentStyle: {},
    }
  }, [authResolved, user, isProfileComplete, screen])

  return (
    <ScreenShell
      interactive={shellConfig.interactive}
      mainMode={shellConfig.mainMode}
      mainOverflow={shellConfig.mainOverflow}
      style={shellConfig.style}
      contentStyle={shellConfig.contentStyle}
    >
      <AppRoutes />
    </ScreenShell>
  )
}

export default function App() {
  useAppHeight()

  return (
    <Providers>
      <AppLayout>
        <ErrorBoundary name="root">
          <AppScreenShell />
        </ErrorBoundary>
      </AppLayout>
    </Providers>
  )
}
