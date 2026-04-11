import '../styles/global.css'
import './bootstrapApp.js'
import { AppScreenProvider, useAppScreen } from '../lib/AppScreenContext'
import { AppAuthRoot, useAuth } from '../lib/AuthContext'
import {
  ProfileIncompleteNoticeProvider,
  useProfileIncompleteNotice,
} from '../lib/ProfileIncompleteNoticeContext.jsx'
import ErrorBoundary from '../lib/ErrorBoundary.jsx'
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import HomePage from '../features/home/components/HomePage'
import MainLayout from '../features/shared/components/MainLayout.jsx'
import ProfilePage from '../features/profile/components/ProfilePage'
import ReservationsPage from '../features/reservations/ReservationsPage'
import LoginPage from '../features/auth/components/LoginPage'

/** Misma fábrica que `lazy()` para `Component.preload()` sin duplicar rutas de import. */
function lazyWithPreload(factory) {
  const Component = lazy(factory)
  Component.preload = factory
  return Component
}

const AuthenticatedMapScreen = lazyWithPreload(() =>
  import('../features/map/components/AuthenticatedMapScreen.jsx')
)
const AlertsPage = lazyWithPreload(() => import('../features/alerts/AlertsPage'))
const ChatsPage = lazyWithPreload(() => import('../features/chats/ChatsPage'))
const ChatThreadView = lazyWithPreload(() => import('../features/chats/ChatThreadView.jsx'))
const ReviewsPage = lazyWithPreload(() => import('../features/reviews/pages/ReviewsPage'))
const UserReviewsPage = lazyWithPreload(() => import('../features/reviews/UserReviewsPage'))
/** Solo precarga en `AuthenticatedRoutes`; el `lazy` real vive en `MainLayout.jsx`. */
const MainLayoutMapStackPreload = lazyWithPreload(() =>
  import('../features/map/components/MainLayoutMapStack.jsx')
)
import { DEV_WEB_IPHONE_SIM_MIN_INNER_WIDTH } from '../lib/devWebIphoneSim.js'
import IphoneFrame from '../ui/IphoneFrame'
import ScreenShell from '../ui/layout/ScreenShell'
import { SCREEN_SHELL_MAIN_MODE } from '../ui/layout/layout'
import Button from '../ui/Button'
import { colors } from '../design/colors'
import {
  ACTIVE_SCREEN_ALERTS,
  ACTIVE_SCREEN_CHATS,
  ACTIVE_SCREEN_MAP,
  ACTIVE_SCREEN_PROFILE,
  ACTIVE_SCREEN_RESERVATIONS,
  ACTIVE_SCREEN_REVIEWS,
  ACTIVE_SCREEN_THREAD,
} from '../lib/appScreenState.js'
import { isDmDevFallbackThread } from '../services/waitmeChats.js'
import { fetchProfileDisplayName } from '../services/waitmePurchaseRequests.js'
import { AuthenticatedOverlayEmbeddedProvider } from '../lib/AuthenticatedOverlayEmbeddedContext.jsx'
import { MapForegroundProvider } from '../lib/MapForegroundContext.jsx'

/**
 * Raíz React: llena #root (flex). `--app-height` se suscribe en `bootstrapApp.js` (`waitmeViewport`).
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

const homeGateStyle = {
  flex: '1 1 0%',
  minHeight: 0,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
}

/** Slot bajo ScreenShell: columna flex (altura real del main); sin absolute en la base. */
const authenticatedPersistentStackStyle = {
  position: 'relative',
  flex: '1 1 0%',
  minHeight: 0,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
}

/** Área útil mapa + overlay: flex + relative para que un único overlay absolute tenga caja con altura. */
const authenticatedPersistentStageStyle = {
  position: 'relative',
  flex: '1 1 0%',
  minHeight: 0,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
}

/** Capa base del mapa/Home: flujo normal (no inset-0 absolute). */
const authenticatedPersistentMapLayerStyle = {
  flex: '1 1 0%',
  minHeight: 0,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
}

/** Mismo fondo que la capa mapa (`MainLayout` mapLazyFallback) mientras carga el chunk lazy; `fallback={null}` dejaba ver el negro de `html`. */
const authenticatedRoutesSuspenseFallbackStyle = {
  flex: '1 1 0%',
  minHeight: 0,
  width: '100%',
  height: '100%',
  backgroundColor: colors.background,
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
  return (
    <div
      role="dialog"
      aria-modal={open}
      aria-hidden={!open}
      aria-labelledby="waitme-incomplete-profile-title"
      style={{
        ...modalOverlayStyle,
        display: open ? 'flex' : 'none',
      }}
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

const buyerWaitmeToastStyle = {
  position: 'fixed',
  top: 'max(12px, env(safe-area-inset-top, 12px))',
  left: 16,
  right: 16,
  zIndex: 2147483645,
  padding: '12px 14px',
  borderRadius: 12,
  backgroundColor: 'rgba(17,24,39,0.96)',
  border: '1px solid rgba(139,92,246,0.45)',
  color: colors.textPrimary,
  fontSize: 14,
  fontWeight: 600,
  textAlign: 'center',
  boxSizing: 'border-box',
  pointerEvents: 'none',
}

function BuyerWaitmeToast({ message, untilMs }) {
  const [leftMs, setLeftMs] = useState(0)
  useEffect(() => {
    if (typeof untilMs !== 'number' || !Number.isFinite(untilMs)) {
      setLeftMs(0)
      return undefined
    }
    const tick = () => setLeftMs(Math.max(0, untilMs - Date.now()))
    tick()
    const t = window.setInterval(tick, 1000)
    return () => window.clearInterval(t)
  }, [untilMs])
  const totalSec = Math.max(0, Math.ceil(leftMs / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  const showCd =
    typeof untilMs === 'number' && Number.isFinite(untilMs) && untilMs > Date.now() && totalSec > 0
  return (
    <div style={buyerWaitmeToastStyle} role="status">
      <p style={{ margin: 0 }}>{message}</p>
      {showCd ? (
        <p
          style={{
            margin: '10px 0 0',
            fontVariantNumeric: 'tabular-nums',
            fontSize: 22,
            fontWeight: 800,
            color: '#c084fc',
          }}
        >
          {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
        </p>
      ) : null}
    </div>
  )
}

function WaitMeIncomingPurchaseModal() {
  const {
    incomingWaitmePurchase,
    dismissIncomingWaitmeModal,
    respondIncomingWaitme,
    buyerWaitmeNotice,
    buyerWaitmeArrivalUntilMs,
  } = useAppScreen()
  const [busy, setBusy] = useState(false)
  const [buyerName, setBuyerName] = useState('Usuario')

  useEffect(() => {
    const row = incomingWaitmePurchase
    if (!row || typeof row !== 'object' || !row.buyerId) {
      setBuyerName('Usuario')
      return undefined
    }
    let cancelled = false
    void fetchProfileDisplayName(String(row.buyerId)).then((n) => {
      if (!cancelled) setBuyerName(n || 'Usuario')
    })
    return () => {
      cancelled = true
    }
  }, [incomingWaitmePurchase])

  const open = Boolean(incomingWaitmePurchase && incomingWaitmePurchase.id)

  return (
    <>
      {buyerWaitmeNotice ? (
        <BuyerWaitmeToast message={buyerWaitmeNotice} untilMs={buyerWaitmeArrivalUntilMs} />
      ) : null}
      <div
        role="dialog"
        aria-modal={open}
        aria-hidden={!open}
        style={{
          ...modalOverlayStyle,
          display: open ? 'flex' : 'none',
          zIndex: 2147483646,
        }}
        onClick={busy ? undefined : dismissIncomingWaitmeModal}
      >
        <div style={modalBoxStyle} onClick={(e) => e.stopPropagation()}>
          <p style={modalTextStyle}>
            {buyerName} quiere comprar tu WaitMe!
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                type="button"
                variant="primary"
                style={{ flex: 1 }}
                disabled={busy}
                onClick={() => {
                  setBusy(true)
                  void respondIncomingWaitme(true).finally(() => setBusy(false))
                }}
              >
                Aceptar
              </Button>
              <Button
                type="button"
                variant="secondary"
                style={{ flex: 1 }}
                disabled={busy}
                onClick={() => {
                  setBusy(true)
                  void respondIncomingWaitme(false).finally(() => setBusy(false))
                }}
              >
                Rechazar
              </Button>
            </div>
            <Button
              type="button"
              variant="secondary"
              style={{ width: '100%' }}
              disabled={busy}
              onClick={dismissIncomingWaitmeModal}
            >
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    </>
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
  const { activeScreen, activeThreadId } = useAppScreen()
  return (
    <div style={gateColumnStyle}>
      <ErrorBoundary resetKeys={[activeScreen, activeThreadId]} name="shell">
        {children}
      </ErrorBoundary>
    </div>
  )
}

function AppLayout({ children }) {
  return <IphoneFrame>{children}</IphoneFrame>
}

function clearChatHashFromUrl() {
  if (typeof window !== 'undefined' && window.location.hash.startsWith('#/chat/')) {
    const { pathname, search } = window.location
    window.history.replaceState(null, '', pathname + search)
  }
}

/** Mapa persistente bajo un único ScreenShell; pantallas apiladas encima sin desmontar el mapa. */
function AuthenticatedRoutes() {
  const { user } = useAuth()
  const nav = useAppScreen()

  useEffect(() => {
    ChatsPage.preload()
    ChatThreadView.preload()
    AlertsPage.preload()
    AuthenticatedMapScreen.preload()
    ReviewsPage.preload()
    UserReviewsPage.preload()
    MainLayoutMapStackPreload.preload()
  }, [])

  const {
    activeScreen,
    mapMode,
    activeThreadId,
    activeThreadSummary,
    viewingUserReviewsId,
    closeThread,
    clearPendingDmVisual,
  } = nav

  const sessionUid = user?.id != null ? String(user.id) : ''

  const onMap = activeScreen === ACTIVE_SCREEN_MAP

  const showPersistentMapStack =
    (activeScreen === ACTIVE_SCREEN_THREAD && activeThreadId && activeThreadSummary) ||
    (activeScreen === ACTIVE_SCREEN_REVIEWS && viewingUserReviewsId) ||
    activeScreen === ACTIVE_SCREEN_CHATS ||
    activeScreen === ACTIVE_SCREEN_RESERVATIONS ||
    activeScreen === ACTIVE_SCREEN_ALERTS ||
    activeScreen === ACTIVE_SCREEN_PROFILE ||
    activeScreen === ACTIVE_SCREEN_MAP

  function renderOverlayBody() {
    if (activeScreen === ACTIVE_SCREEN_THREAD && activeThreadId && activeThreadSummary) {
      const tid = String(activeThreadId).trim()
      const localFb = isDmDevFallbackThread(tid)
      return (
        <ChatThreadView
          summary={activeThreadSummary}
          userId={sessionUid}
          localFallback={localFb}
          onBack={() => {
            closeThread()
            clearPendingDmVisual?.()
            clearChatHashFromUrl()
          }}
        />
      )
    }
    if (activeScreen === ACTIVE_SCREEN_REVIEWS && viewingUserReviewsId) {
      return viewingUserReviewsId === sessionUid ? <ReviewsPage /> : <UserReviewsPage />
    }
    if (activeScreen === ACTIVE_SCREEN_CHATS) return <ChatsPage />
    if (activeScreen === ACTIVE_SCREEN_RESERVATIONS) return <ReservationsPage />
    if (activeScreen === ACTIVE_SCREEN_ALERTS) return <AlertsPage />
    if (activeScreen === ACTIVE_SCREEN_PROFILE) return <ProfilePage />
    return null
  }

  let body
  if (!showPersistentMapStack) {
    body = (
      <ScreenShell interactive mainMode={SCREEN_SHELL_MAIN_MODE.FULL_BLEED}>
        <HomeActionGate>
          <MainLayout>
            <HomePage />
          </MainLayout>
        </HomeActionGate>
      </ScreenShell>
    )
  } else {
    const shellMapProps =
      mapMode !== 'home'
        ? {
            contentStyle: { overflow: 'visible' },
            screenMainStyle: { overflow: 'visible' },
          }
        : {}

    const overlayShellProps = onMap
      ? {
          interactive: true,
          mainMode: SCREEN_SHELL_MAIN_MODE.FULL_BLEED,
          ...shellMapProps,
        }
      : {
          interactive: true,
          style: { backgroundColor: colors.background },
          mainMode: SCREEN_SHELL_MAIN_MODE.INSET,
          mainOverflow: activeScreen === ACTIVE_SCREEN_ALERTS ? 'auto' : 'hidden',
        }

    body = (
      <ScreenShell {...overlayShellProps}>
        <div style={authenticatedPersistentStackStyle}>
          <div style={authenticatedPersistentStageStyle}>
            <div
              style={{
                ...authenticatedPersistentMapLayerStyle,
                pointerEvents: onMap ? 'auto' : 'none',
              }}
              aria-hidden={!onMap}
            >
              <MapForegroundProvider value={onMap}>
                {onMap && mapMode === 'home' ? (
                  <HomeActionGate>
                    <AuthenticatedMapScreen />
                  </HomeActionGate>
                ) : (
                  <AuthenticatedMapScreen />
                )}
              </MapForegroundProvider>
            </div>
            {!onMap ? (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                  backgroundColor: colors.background,
                }}
              >
                <AuthenticatedOverlayEmbeddedProvider>{renderOverlayBody()}</AuthenticatedOverlayEmbeddedProvider>
              </div>
            ) : null}
          </div>
        </div>
      </ScreenShell>
    )
  }

  return (
    <Suspense
      fallback={
        <div style={authenticatedRoutesSuspenseFallbackStyle} aria-hidden />
      }
    >
      {body}
    </Suspense>
  )
}

/** Una vez por uid: MAP + home al tener sesión, sin esperar bootstrap/completitud (AppGate ya no deja hueco). */
const initialMapHomeEnsuredForUid = new Set()

function AuthenticatedInitialMapHome() {
  const { user } = useAuth()
  const { openMap } = useAppScreen()

  useLayoutEffect(() => {
    const uid = user?.id != null ? String(user.id) : ''
    if (!uid) return
    if (initialMapHomeEnsuredForUid.has(uid)) return
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || ''
      if (/^#\/(user|chat)\//.test(hash)) return
    }
    initialMapHomeEnsuredForUid.add(uid)
    openMap()
  }, [user?.id, openMap])

  return null
}

function AppGate() {
  const { user } = useAuth()
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
            <WaitMeIncomingPurchaseModal />
            <AuthenticatedInitialMapHome />
            <AuthenticatedRoutes />
          </div>
        </AppLayout>
      </ProfileIncompleteNoticeProvider>
    </AuthenticatedShellWithBoundary>
  )

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

function AuthenticatedMainChrome() {
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
    /** `--app-height`: una sola suscripción en `bootstrapApp.js` (evita listeners duplicados). */
    window.addEventListener('resize', updateDevLayoutClass)

    return () => {
      window.removeEventListener('resize', updateDevLayoutClass)
      document.documentElement.classList.remove('force-iphone')
    }
  }, [])

  return (
    <div className="waitme-app-root" style={appRootLayoutStyle}>
      <div className="waitme-iphone-frame-fullbleed">
        <AppAuthRoot>
          <AppGate />
        </AppAuthRoot>
      </div>
    </div>
  )
}

export default function App() {
  return <AuthenticatedMainChrome />
}
