import { AppScreenProvider, useAppScreen } from '../lib/AppScreenContext'
import { AppAuthRoot, useAuth } from '../lib/AuthContext'
import ErrorBoundary from '../lib/ErrorBoundary.jsx'
import { useContext, useEffect, useRef, useState } from 'react'
import HomePage from '../features/home/components/HomePage'
import ProfilePage from '../features/profile/components/ProfilePage'
import LoginPage from '../features/auth/components/LoginPage'
import IphoneFrame from '../ui/IphoneFrame'
import Header from '../ui/Header'
import BottomNav from '../ui/BottomNav'
import { colors } from '../design/colors'
import { AppStateContext } from '../store/AppProvider.jsx'
import { PROFILE_INCOMPLETE_MESSAGE } from '../services/profile.js'

/** Bloquea CTAs del home (sin editar HomePage.jsx): captura en fase burbuja. */
function HomeActionGate({ children }) {
  const state = useContext(AppStateContext)
  const complete = Boolean(state?.isProfileComplete)
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
        label.includes('aparcado aquí')
      ) {
        e.preventDefault()
        e.stopPropagation()
        window.alert(PROFILE_INCOMPLETE_MESSAGE)
      }
    }

    root.addEventListener('pointerdown', onPointerDownCapture, true)
    return () => root.removeEventListener('pointerdown', onPointerDownCapture, true)
  }, [complete])

  return (
    <div ref={rootRef} data-waitme-home-gate style={{ height: '100%', width: '100%' }}>
      {children}
    </div>
  )
}

/** Tras bootstrap de perfil: primera carga autenticada → home o perfil según completitud. */
function PostAuthScreenIntent() {
  const state = useContext(AppStateContext)
  const { openProfile, openHome } = useAppScreen()
  const prevReady = useRef(false)

  useEffect(() => {
    if (state?.authStatus !== 'authenticated' || !state?.profileBootstrapReady) {
      prevReady.current = false
      return
    }
    const justReady = !prevReady.current
    prevReady.current = true
    if (justReady) {
      if (state.isProfileComplete) openHome()
      else openProfile()
    }
  }, [
    state?.authStatus,
    state?.profileBootstrapReady,
    state?.isProfileComplete,
    openHome,
    openProfile,
  ])

  return null
}

function RouterShell() {
  const { screen } = useAppScreen()
  return screen === 'profile' ? (
    <ProfilePage />
  ) : (
    <HomeActionGate>
      <HomePage />
    </HomeActionGate>
  )
}

/** Boundary con reset al cambiar pestaña (home/profile) para no dejar la shell colgada tras un error de render. */
function AuthenticatedShellWithBoundary({ opacity, children }) {
  const { screen } = useAppScreen()
  return (
    <div style={{ opacity, transition: 'opacity 200ms ease-out' }}>
      <ErrorBoundary resetKeys={[screen]} name="shell">
        {children}
      </ErrorBoundary>
    </div>
  )
}

function AppLayout({ children, isInteractive = true }) {
  return (
    <IphoneFrame>
      <Header interactive={isInteractive} />
      {children}
      <BottomNav interactive={isInteractive} />
    </IphoneFrame>
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

function AppGate() {
  const { status } = useAuth()
  const appState = useContext(AppStateContext)
  const [displayedView, setDisplayedView] = useState('loading')
  const [opacity, setOpacity] = useState(1)
  const [targetView, setTargetView] = useState('loading')

  useEffect(() => {
    if (status === 'loading') {
      setTargetView('loading')
      return
    }
    if (status === 'unauthenticated') {
      setTargetView('login')
      return
    }
    if (status === 'authenticated' && !appState?.profileBootstrapReady) {
      setTargetView('loading')
      return
    }
    setTargetView('home')
  }, [status, appState?.profileBootstrapReady])

  useEffect(() => {
    if (displayedView === targetView) return
    setOpacity(0)
    const swapTimer = setTimeout(() => {
      setDisplayedView(targetView)
      setOpacity(1)
    }, 200)
    return () => clearTimeout(swapTimer)
  }, [displayedView, targetView])

  return (
    <AppScreenProvider>
      {/* RULE: All screens MUST be wrapped in AppLayout (Header + BottomNav) */}
      {displayedView === 'loading' ? (
        <AppLayout isInteractive={false}>
          <AuthBootScreen />
        </AppLayout>
      ) : displayedView === 'login' ? (
        <div style={{ opacity, transition: 'opacity 200ms ease-out' }}>
          <AppLayout isInteractive={false}>
            <LoginPage />
          </AppLayout>
        </div>
      ) : (
        <AuthenticatedShellWithBoundary opacity={opacity}>
          <AppLayout>
            <PostAuthScreenIntent />
            <RouterShell />
          </AppLayout>
        </AuthenticatedShellWithBoundary>
      )}
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
