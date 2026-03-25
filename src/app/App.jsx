import { AppScreenProvider, useAppScreen } from '../lib/AppScreenContext'
import { AuthProvider, useAuth } from '../lib/AuthContext'
import ErrorBoundary from '../lib/ErrorBoundary.jsx'
import { useEffect, useState } from 'react'
import HomePage from '../features/home/components/HomePage'
import ProfilePage from '../features/profile/components/ProfilePage'
import LoginPage from '../features/auth/components/LoginPage'
import IphoneFrame from '../ui/IphoneFrame'
import Header from '../ui/Header'
import BottomNav from '../ui/BottomNav'
import { colors } from '../design/colors'

function RouterShell() {
  const { screen } = useAppScreen()
  return screen === 'profile' ? <ProfilePage /> : <HomePage />
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
  const [displayedView, setDisplayedView] = useState('loading')
  const [opacity, setOpacity] = useState(1)
  const [targetView, setTargetView] = useState('loading')

  const hasSeenLogin =
    typeof window !== 'undefined' && window.localStorage
      ? window.localStorage.getItem('hasSeenLogin') === 'true'
      : false

  useEffect(() => {
    if (status === 'loading') {
      setTargetView('loading')
      return
    }
    if (status === 'unauthenticated') {
      setTargetView('login')
      return
    }
    setTargetView(hasSeenLogin ? 'home' : 'login')
  }, [status, hasSeenLogin])

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
        <div style={{ opacity, transition: 'opacity 200ms ease-out' }}>
          <AppLayout>
            <RouterShell />
          </AppLayout>
        </div>
      )}
    </AppScreenProvider>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppGate />
      </AuthProvider>
    </ErrorBoundary>
  )
}
