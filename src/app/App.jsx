import { AppScreenProvider, useAppScreen } from '../lib/AppScreenContext'
import { AppAuthRoot, useAuth } from '../lib/AuthContext'
import {
  ProfileIncompleteNoticeProvider,
  useProfileIncompleteNotice,
} from '../lib/ProfileIncompleteNoticeContext.jsx'
import ErrorBoundary from '../lib/ErrorBoundary.jsx'
import { Capacitor } from '@capacitor/core'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import HomePage from '../features/home/components/HomePage'
import ProfilePage from '../features/profile/components/ProfilePage'
import ReviewsPage from '../features/reviews/pages/ReviewsPage'
import LoginPage from '../features/auth/components/LoginPage'
import IphoneFrame from '../ui/IphoneFrame'
import ScreenShell from '../ui/layout/ScreenShell'
import { SCREEN_SHELL_MAIN_MODE } from '../ui/layout/layout'
import Button from '../ui/Button'
import { colors } from '../design/colors'
import { APP_SCREEN_PROFILE, APP_SCREEN_REVIEWS } from '../lib/appScreenState.js'

const fade200Style = { transition: 'opacity 200ms ease-out' }
const homeGateStyle = { height: '100%', width: '100%' }

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

function AuthenticatedShellWithBoundary({ opacity, children }) {
  const { screen } = useAppScreen()
  return (
    <div style={{ ...fade200Style, opacity }}>
      <ErrorBoundary resetKeys={[screen]} name="shell">
        {children}
      </ErrorBoundary>
    </div>
  )
}

function AppLayout({ children }) {
  return <IphoneFrame>{children}</IphoneFrame>
}

/** Home: ScreenShell fullBleed. Perfil/reseñas: páginas con ScreenShell inset. */
function AuthenticatedMainChrome() {
  const { screen } = useAppScreen()
  if (screen === APP_SCREEN_PROFILE) return <ProfilePage />
  if (screen === APP_SCREEN_REVIEWS) return <ReviewsPage />
  return (
    <ScreenShell interactive mainMode={SCREEN_SHELL_MAIN_MODE.FULL_BLEED}>
      <HomeActionGate>
        <HomePage />
      </HomeActionGate>
    </ScreenShell>
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

function computeTargetView(status, user, profileBootstrapReady) {
  if (status === 'loading') return 'loading'
  if (status === 'authenticated' && user && !profileBootstrapReady) return 'loading'
  if (!user || status === 'unauthenticated') return 'login'
  return 'authenticated'
}

function AppGate() {
  const { status, user, profileBootstrapReady, isProfileComplete } = useAuth()
  const [displayedView, setDisplayedView] = useState('loading')
  const [opacity, setOpacity] = useState(1)
  const [targetView, setTargetView] = useState('loading')
  const [incompleteModalOpen, setIncompleteModalOpen] = useState(false)

  const noticeValue = useMemo(
    () => ({
      requestNotice: () => setIncompleteModalOpen(true),
    }),
    []
  )

  useEffect(() => {
    const next = computeTargetView(status, user, profileBootstrapReady)
    setTargetView(next)
  }, [status, user, profileBootstrapReady])

  useEffect(() => {
    if (displayedView === targetView) return
    setOpacity(0)
    const swapTimer = setTimeout(() => {
      setDisplayedView(targetView)
      setOpacity(1)
    }, 200)
    return () => clearTimeout(swapTimer)
  }, [displayedView, targetView])

  const closeIncompleteModal = useCallback(() => setIncompleteModalOpen(false), [])

  return (
    <AppScreenProvider>
      {displayedView === 'loading' ? (
        <AppLayout>
          <ScreenShell interactive={false} mainMode={SCREEN_SHELL_MAIN_MODE.FULL_BLEED}>
            <AuthBootScreen />
          </ScreenShell>
        </AppLayout>
      ) : displayedView === 'login' ? (
        <div style={{ ...fade200Style, opacity }}>
          <AppLayout>
            <ScreenShell interactive={false} mainMode={SCREEN_SHELL_MAIN_MODE.FULL_BLEED}>
              <LoginPage />
            </ScreenShell>
          </AppLayout>
        </div>
      ) : (
        <AuthenticatedShellWithBoundary opacity={opacity}>
          <ProfileIncompleteNoticeProvider value={noticeValue}>
            <AppLayout>
              <IncompleteProfileModalHost
                open={incompleteModalOpen}
                onClose={closeIncompleteModal}
              />
              {!isProfileComplete ? <ProfilePage /> : <AuthenticatedMainChrome />}
            </AppLayout>
          </ProfileIncompleteNoticeProvider>
        </AuthenticatedShellWithBoundary>
      )}
    </AppScreenProvider>
  )
}

export default function App() {
  /**
   * Diagnóstico Safari (web): prueba real de hit-test. Ejecutar en Safari Mac → Consola.
   * No aplica a build nativa (Capacitor).
   */
  useEffect(() => {
    if (typeof document === 'undefined' || Capacitor.isNativePlatform()) return undefined

    const handler = (e) => {
      console.log('[CLICK REAL]', e.target)
    }

    document.addEventListener('click', handler)

    const timerId = window.setTimeout(() => {
      const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2)
      console.log('[TOP ELEMENT]', el)
    }, 1000)

    return () => {
      document.removeEventListener('click', handler)
      window.clearTimeout(timerId)
    }
  }, [])

  return (
    <ErrorBoundary name="root">
      <AppAuthRoot>
        <AppGate />
      </AppAuthRoot>
    </ErrorBoundary>
  )
}
