import { AppScreenProvider, useAppScreen } from '../lib/AppScreenContext'
import { AppAuthRoot, useAuth } from '../lib/AuthContext'
import {
  ProfileIncompleteNoticeProvider,
  useProfileIncompleteNotice,
} from '../lib/ProfileIncompleteNoticeContext.jsx'
import ErrorBoundary from '../lib/ErrorBoundary.jsx'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import HomePage from '../features/home/components/HomePage'
import ProfilePage from '../features/profile/components/ProfilePage'
import ReviewsPage from '../features/reviews/pages/ReviewsPage'
import MapParkingPage from '../features/parking/MapParkingPage'
import AlertsPage from '../features/alerts/AlertsPage'
import ChatsPage from '../features/chats/ChatsPage'
import LoginPage from '../features/auth/components/LoginPage'
import { DEV_WEB_IPHONE_SIM_MIN_INNER_WIDTH } from '../lib/devWebIphoneSim.js'
import IphoneFrame from '../ui/IphoneFrame'
import ScreenShell from '../ui/layout/ScreenShell'
import { SCREEN_SHELL_MAIN_MODE } from '../ui/layout/layout'
import Button from '../ui/Button'
import { colors } from '../design/colors'
import {
  APP_SCREEN_ALERTS,
  APP_SCREEN_CHATS,
  APP_SCREEN_PARK_HERE,
  APP_SCREEN_PROFILE,
  APP_SCREEN_REVIEWS,
  APP_SCREEN_SEARCH_PARKING,
} from '../lib/appScreenState.js'
import { subscribeWaitmeViewportCssVars } from '../lib/waitmeViewport.js'

/**
 * Aislamiento runtime (solo local): en `.env.local` → `VITE_AUTH_TREE_DIAG=a|b|c|d`
 * Sin variable = comportamiento normal. El agente no puede ver Safari; tú validas qué fase enseña negro.
 */
const AUTH_TREE_DIAG = String(import.meta.env.VITE_AUTH_TREE_DIAG ?? '')
  .trim()
  .toLowerCase()

/**
 * Raíz React: llena #root (flex). `--app-height` se escribe solo desde `visualViewport.height`
 * en `subscribeWaitmeViewportCssVars()` (resize/scroll/orientation del vv y de `window`).
 */
const appRootLayoutStyle = {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  flex: '1 1 0%',
  minHeight: 0,
  overflowX: 'hidden',
  /** `visible` evita recortar modales `position:fixed` hijos en algunos motores. */
  overflowY: 'visible',
  boxSizing: 'border-box',
}

/** Columna shell sin transición (evita parpadeo / opacidad intermedia). */
const gateColumnStyle = {
  minHeight: 0,
  flex: '1 1 0%',
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box',
}

/** Un solo hijo columna bajo IphoneFrame: evita colapso con varios nodos hermanos (p. ej. modal + perfil). */
const authTreeInnerStyle = {
  flex: '1 1 0%',
  minHeight: 0,
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box',
}

const authDiagBlockStyle = {
  color: '#fff',
  padding: 24,
  width: '100%',
  minHeight: 'var(--app-height, 100dvh)',
  backgroundColor: colors.background,
  boxSizing: 'border-box',
}
const homeGateStyle = {
  flex: '1 1 0%',
  minHeight: 0,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
}

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
    <div style={gateColumnStyle}>
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
  if (screen === APP_SCREEN_SEARCH_PARKING || screen === APP_SCREEN_PARK_HERE)
    return <MapParkingPage />
  if (screen === APP_SCREEN_ALERTS) return <AlertsPage />
  if (screen === APP_SCREEN_CHATS) return <ChatsPage />
  return (
    <ScreenShell interactive mainMode={SCREEN_SHELL_MAIN_MODE.FULL_BLEED}>
      <HomeActionGate>
        <HomePage />
      </HomeActionGate>
    </ScreenShell>
  )
}

function AppGate() {
  const { user, isProfileComplete } = useAuth()
  const [incompleteModalOpen, setIncompleteModalOpen] = useState(false)

  const noticeValue = useMemo(
    () => ({
      requestNotice: () => setIncompleteModalOpen(true),
    }),
    []
  )

  const closeIncompleteModal = useCallback(() => setIncompleteModalOpen(false), [])

  const authenticatedDefault = (
    <AuthenticatedShellWithBoundary>
      <ProfileIncompleteNoticeProvider value={noticeValue}>
        <AppLayout>
          <div style={authTreeInnerStyle}>
            <IncompleteProfileModalHost
              open={incompleteModalOpen}
              onClose={closeIncompleteModal}
            />
            {!isProfileComplete ? <ProfilePage /> : <AuthenticatedMainChrome />}
          </div>
        </AppLayout>
      </ProfileIncompleteNoticeProvider>
    </AuthenticatedShellWithBoundary>
  )

  if (user && AUTH_TREE_DIAG === 'a') {
    return (
      <AppScreenProvider>
        <div data-waitme-auth-diag="a" style={authDiagBlockStyle}>
          AUTH TREE OK
        </div>
      </AppScreenProvider>
    )
  }

  if (user && AUTH_TREE_DIAG === 'b') {
    return (
      <AppScreenProvider>
        <AuthenticatedShellWithBoundary>
          <div data-waitme-auth-diag="b" style={authDiagBlockStyle}>
            AUTH TREE OK — B
          </div>
        </AuthenticatedShellWithBoundary>
      </AppScreenProvider>
    )
  }

  if (user && AUTH_TREE_DIAG === 'c') {
    return (
      <AppScreenProvider>
        <AuthenticatedShellWithBoundary>
          <ProfileIncompleteNoticeProvider value={noticeValue}>
            <AppLayout>
              <div style={authTreeInnerStyle}>
                <IncompleteProfileModalHost
                  open={incompleteModalOpen}
                  onClose={closeIncompleteModal}
                />
                <ProfilePage />
              </div>
            </AppLayout>
          </ProfileIncompleteNoticeProvider>
        </AuthenticatedShellWithBoundary>
      </AppScreenProvider>
    )
  }

  if (user && AUTH_TREE_DIAG === 'd') {
    return (
      <AppScreenProvider>
        <AuthenticatedShellWithBoundary>
          <ProfileIncompleteNoticeProvider value={noticeValue}>
            <AppLayout>
              <div style={authTreeInnerStyle}>
                <IncompleteProfileModalHost
                  open={incompleteModalOpen}
                  onClose={closeIncompleteModal}
                />
                <AuthenticatedMainChrome />
              </div>
            </AppLayout>
          </ProfileIncompleteNoticeProvider>
        </AuthenticatedShellWithBoundary>
      </AppScreenProvider>
    )
  }

  return (
    <AppScreenProvider>
      {!user ? (
        <div style={gateColumnStyle}>
          <AppLayout>
            <ScreenShell interactive={false} mainMode={SCREEN_SHELL_MAIN_MODE.FULL_BLEED}>
              <LoginPage />
            </ScreenShell>
          </AppLayout>
        </div>
      ) : (
        authenticatedDefault
      )}
    </AppScreenProvider>
  )
}

export default function App() {
  /** Preview Safari ≈ WKWebView: `http://<host>/?iphone=true` (solo layout; no afecta producción sin query). */
  useEffect(() => {
    const isSafariPreview = window.location.search.includes('iphone=true')
    const rootEl = document.documentElement
    if (isSafariPreview) {
      rootEl.classList.add('iphone-preview')
    } else {
      rootEl.classList.remove('iphone-preview')
    }
    return () => {
      rootEl.classList.remove('iphone-preview')
    }
  }, [])

  useLayoutEffect(() => {
    const updateDevLayoutClass = () => {
      const narrowChromeSim =
        !window.Capacitor?.isNativePlatform?.() &&
        window.innerWidth > DEV_WEB_IPHONE_SIM_MIN_INNER_WIDTH
      if (narrowChromeSim) {
        document.documentElement.classList.add('force-iphone')
      } else {
        document.documentElement.classList.remove('force-iphone')
      }
    }

    updateDevLayoutClass()
    const unsubViewport = subscribeWaitmeViewportCssVars()
    window.addEventListener('resize', updateDevLayoutClass)

    return () => {
      unsubViewport()
      window.removeEventListener('resize', updateDevLayoutClass)
      document.documentElement.classList.remove('force-iphone')
    }
  }, [])

  return (
    <div className="waitme-app-root" style={appRootLayoutStyle}>
      <div className="waitme-iphone-frame-fullbleed">
        <ErrorBoundary name="root">
          <AppAuthRoot>
            <AppGate />
          </AppAuthRoot>
        </ErrorBoundary>
      </div>
    </div>
  )
}
