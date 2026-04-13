import { AppScreenProvider, useAppScreen } from '../lib/AppScreenContext'
import { AppAuthRoot, useAuth } from '../lib/AuthContext'
import {
  ProfileIncompleteNoticeProvider,
  useProfileIncompleteNotice,
} from '../lib/ProfileIncompleteNoticeContext.jsx'
import ErrorBoundary from '../lib/ErrorBoundary.jsx'
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

/**
 * Auth resuelto para pintar UI distinta de "Cargando…": sesión conocida y, si hay usuario, perfil bootstrap listo.
 * No usar solo `user` en el primer render: `null` es válido para "sin sesión" tras resolver.
 */
function isAuthUiReady(status, user, profileBootstrapReady) {
  if (status === 'loading') return false
  if (status === 'authenticated' && user && !profileBootstrapReady) return false
  return true
}

function AppGate() {
  const { status, user, profileBootstrapReady, isProfileComplete } = useAuth()
  const [incompleteModalOpen, setIncompleteModalOpen] = useState(false)

  const noticeValue = useMemo(
    () => ({
      requestNotice: () => setIncompleteModalOpen(true),
    }),
    []
  )

  const closeIncompleteModal = useCallback(() => setIncompleteModalOpen(false), [])

  const authUiReady = useMemo(
    () => isAuthUiReady(status, user, profileBootstrapReady),
    [status, user, profileBootstrapReady]
  )

  const showLogin = authUiReady && (!user || status === 'unauthenticated')
  const showAuthenticated = authUiReady && Boolean(user) && status === 'authenticated'

  /**
   * Un solo `AppLayout` (IphoneFrame): no se desmonta. Los hijos cambian sin `displayedView`/opacity
   * retardado (evita doble fase de render y problemas de hit-test en WKWebView).
   */
  return (
    <AppScreenProvider>
      <AppLayout>
        {!authUiReady ? (
          <ScreenShell interactive={false} mainMode={SCREEN_SHELL_MAIN_MODE.FULL_BLEED}>
            <AuthBootScreen />
          </ScreenShell>
        ) : showLogin ? (
          <div style={{ height: '100%', width: '100%', minHeight: '100%' }}>
            <ScreenShell interactive={false} mainMode={SCREEN_SHELL_MAIN_MODE.FULL_BLEED}>
              <LoginPage />
            </ScreenShell>
          </div>
        ) : showAuthenticated ? (
          <AuthenticatedShellWithBoundary>
            <ProfileIncompleteNoticeProvider value={noticeValue}>
              <IncompleteProfileModalHost
                open={incompleteModalOpen}
                onClose={closeIncompleteModal}
              />
              {!isProfileComplete ? <ProfilePage /> : <AuthenticatedMainChrome />}
            </ProfileIncompleteNoticeProvider>
          </AuthenticatedShellWithBoundary>
        ) : (
          <ScreenShell interactive={false} mainMode={SCREEN_SHELL_MAIN_MODE.FULL_BLEED}>
            <AuthBootScreen />
          </ScreenShell>
        )}
      </AppLayout>
    </AppScreenProvider>
  )
}

export default function App() {
  return (
    <ErrorBoundary name="root">
      <AppAuthRoot>
        <AppGate />
      </AppAuthRoot>
    </ErrorBoundary>
  )
}
