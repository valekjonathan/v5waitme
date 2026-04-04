import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../services/supabase.js'
import {
  consumeOAuthUrlError,
  signInWithGoogle as signInWithGoogleRequest,
  signOut as signOutRequest,
} from '../services/auth.js'
import {
  buildResolvedHeaderProfile,
  checkProfileComplete,
  ensureProfileForOAuthUser,
} from '../services/profile.js'
import { startLocationTracking } from '../services/location.js'
import { logFlow } from './devFlowLog.js'

const AuthContext = createContext(null)

const AUTH_BOOTSTRAP_MAX_MS = 12000
const DEV_AUTH_KEY = 'waitme.dev.authenticated'
const DEV_PROFILE_DRAFT_KEY = 'waitme.dev.profileDraft'

function readLocalFlag(key) {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage?.getItem?.(key) === '1'
  } catch {
    return false
  }
}

function writeLocalFlag(key, enabled) {
  if (typeof window === 'undefined') return
  try {
    if (enabled) window.localStorage?.setItem?.(key, '1')
    else window.localStorage?.removeItem?.(key)
  } catch {
    /* */
  }
}

function buildDevUser() {
  return {
    id: 'dev-local-user',
    email: 'dev@waitme.local',
    user_metadata: { full_name: 'Dev User' },
  }
}

function readMergedDevProfileForCheck(user) {
  const meta =
    user?.user_metadata && typeof user.user_metadata === 'object' ? user.user_metadata : {}
  const seedName =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    ''
  let draft = {}
  try {
    const raw = window.localStorage?.getItem?.(DEV_PROFILE_DRAFT_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    draft = parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    draft = {}
  }
  return {
    full_name: String(draft.full_name ?? '').trim() ? draft.full_name : seedName,
    phone: draft.phone ?? '',
    brand: draft.brand ?? '',
    model: draft.model ?? '',
    plate: draft.plate ?? '',
    allow_phone_calls: draft.allow_phone_calls ?? false,
    color: draft.color ?? 'negro',
    vehicle_type: draft.vehicle_type ?? 'car',
    email: draft.email ?? user?.email ?? '',
    avatar_url: draft.avatar_url ?? '',
  }
}

function buildDevLocalProfileState(user) {
  const merged = readMergedDevProfileForCheck(user)
  return { merged, isComplete: checkProfileComplete(merged) }
}

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading')
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(() => buildResolvedHeaderProfile(null, user))
  const [profileBootstrapReady, setProfileBootstrapReady] = useState(false)
  const [isNewUser, setIsNewUser] = useState(false)
  const [isProfileComplete, setIsProfileComplete] = useState(false)
  const [authError, setAuthError] = useState(null)
  const authStatusRef = useRef(status)

  useEffect(() => {
    authStatusRef.current = status
  }, [status])

  const toUnauthenticated = useCallback((clearAuthError) => {
    setUser(null)
    setSession(null)
    setProfile(null)
    setStatus('unauthenticated')
    setProfileBootstrapReady(true)
    setIsNewUser(false)
    setIsProfileComplete(false)
    if (clearAuthError) setAuthError(null)
  }, [])

  /** Dev sin Supabase: sesión + perfil draft; `logDevLoginSuccess` solo en flujo explícito de login. */
  const applyDevAuthenticatedCore = useCallback((devUser, { logDevLoginSuccess }) => {
    setUser(devUser)
    setSession({ user: devUser })
    setStatus('authenticated')
    setIsNewUser(false)
    const { merged, isComplete } = buildDevLocalProfileState(devUser)
    setProfile(merged)
    setIsProfileComplete(isComplete)
    setProfileBootstrapReady(true)
    if (logDevLoginSuccess) logFlow('LOGIN_SUCCESS', { mode: 'dev-local' })
    if (!isComplete) logFlow('PROFILE_REQUIRED', { mode: 'dev-local' })
  }, [])

  useEffect(() => {
    startLocationTracking()
  }, [])

  useEffect(() => {
    if (user && !profile) {
      setProfile(buildResolvedHeaderProfile(null, user))
    }
  }, [user, profile])

  useEffect(() => {
    const bootTimer = window.setTimeout(() => {
      // Evitar ruido: si la sesión ya se resolvió antes del timeout, no hacemos log/dispatch.
      if (authStatusRef.current !== 'loading') return
      toUnauthenticated(false)
      console.error('[WaitMe][Auth] Arranque de sesión superó el tiempo; se continúa sin sesión.')
    }, AUTH_BOOTSTRAP_MAX_MS)
    return () => window.clearTimeout(bootTimer)
  }, [toUnauthenticated])

  useEffect(() => {
    let cancelled = false

    let profileBootSeq = 0
    /** Evita repetir SELECT/INSERT en cada TOKEN_REFRESHED del mismo usuario. */
    let lastProfileBootUserId = null

    const setAuthenticatedIdentity = (nextUser, session) => {
      setUser(nextUser)
      setSession(session ?? null)
      setStatus('authenticated')
    }

    const syncFromSession = async (session) => {
      const nextUser = session?.user ?? null
      const wasAuthenticated = authStatusRef.current === 'authenticated'
      if (cancelled) return

      if (!nextUser) {
        lastProfileBootUserId = null
        toUnauthenticated(false)
        return
      }

      /**
       * Mismo usuario ya arrancado: actualizar sesión/tokens sin resetear bootstrap.
       * Antes: setProfileBootstrapReady(false) y return temprano dejaba profileBootstrapReady
       * en false para siempre → AppGate en loading perpetuo / sensación de “pantalla negra”.
       */
      if (isSupabaseConfigured() && supabase && lastProfileBootUserId === nextUser.id) {
        setAuthenticatedIdentity(nextUser, session)
        return
      }

      setAuthenticatedIdentity(nextUser, session)
      setAuthError(null)
      setProfileBootstrapReady(false)
      if (!wasAuthenticated) logFlow('LOGIN_SUCCESS', { mode: 'supabase' })

      if (!isSupabaseConfigured() || !supabase) {
        const { merged, isComplete } = buildDevLocalProfileState(nextUser)
        lastProfileBootUserId = nextUser.id
        setProfile(merged)
        setIsNewUser(false)
        setIsProfileComplete(isComplete)
        setProfileBootstrapReady(true)
        if (!isComplete) logFlow('PROFILE_REQUIRED', { mode: 'dev-local' })
        return
      }

      setProfile(buildResolvedHeaderProfile(null, nextUser))

      const seq = (profileBootSeq += 1)
      const result = await ensureProfileForOAuthUser(nextUser)
      if (cancelled || seq !== profileBootSeq) return
      lastProfileBootUserId = nextUser.id
      setProfile(() => {
        const base = buildResolvedHeaderProfile(null, nextUser)

        return result.data
          ? {
              ...base,
              ...result.data,
              full_name: result.data.full_name || base.full_name,
              email: result.data.email || base.email,
              avatar_url: result.data.avatar_url || base.avatar_url,
            }
          : base
      })
      setIsNewUser(result.isNewUser)
      setIsProfileComplete(result.isProfileComplete)
      setProfileBootstrapReady(true)
    }

    const bootstrap = async () => {
      if (!isSupabaseConfigured() || !supabase) {
        if (!cancelled) {
          if (readLocalFlag(DEV_AUTH_KEY)) {
            applyDevAuthenticatedCore(buildDevUser(), { logDevLoginSuccess: false })
            return
          }
          toUnauthenticated(true)
        }
        return
      }

      let pkceExchangeConsumed = false

      try {
        let {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (cancelled) return

        if (sessionError) {
          console.error(
            '[WaitMe][Auth] getSession en arranque:',
            sessionError.message ?? sessionError
          )
          if (!cancelled) {
            toUnauthenticated(false)
          }
          return
        }

        const code =
          typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('code')
            : null
        // PKCE: un solo intercambio por retorno OAuth; luego limpiar URL.
        if (!session?.user && code && !pkceExchangeConsumed) {
          pkceExchangeConsumed = true
          const { data: exchanged, error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) {
            console.warn(
              '[WaitMe][OAuth] OAUTH_EXCHANGE_FAIL',
              exchangeError.message ?? exchangeError
            )
            try {
              await signOutRequest()
            } catch {
              /* */
            }
            try {
              window.history.replaceState(
                {},
                '',
                `${window.location.pathname}${window.location.hash || ''}`
              )
            } catch {
              /* */
            }
            session = null
          } else {
            session = exchanged?.session ?? null
            try {
              window.history.replaceState({}, '', window.location.pathname || '/')
            } catch {
              /* */
            }
          }
        }

        if (!session?.user) {
          const oauthErr = consumeOAuthUrlError()
          if (oauthErr) setAuthError(oauthErr)
        }

        await syncFromSession(session)
      } catch (e) {
        console.error('[WaitMe][Auth] arranque de sesión falló; se continúa sin sesión.', e)
        if (!cancelled) {
          try {
            await signOutRequest()
          } catch {
            /* */
          }
          toUnauthenticated(true)
        }
      }
    }

    void bootstrap()

    if (!isSupabaseConfigured() || !supabase) {
      return () => {
        cancelled = true
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      void (async () => {
        try {
          await syncFromSession(session)
        } catch (e) {
          console.error('[WaitMe][Auth] onAuthStateChange: error al sincronizar sesión', e)
        }
      })()
    })

    return () => {
      cancelled = true
      profileBootSeq += 1000
      lastProfileBootUserId = null
      subscription.unsubscribe()
    }
  }, [toUnauthenticated, applyDevAuthenticatedCore])

  const signInWithGoogle = useCallback(async () => {
    logFlow('LOGIN_CLICK')
    setAuthError(null)
    if (!isSupabaseConfigured()) {
      writeLocalFlag(DEV_AUTH_KEY, true)
      applyDevAuthenticatedCore(buildDevUser(), { logDevLoginSuccess: true })
      return
    }
    try {
      const { error } = await signInWithGoogleRequest()
      if (error) {
        const msg = error.message || String(error)
        setAuthError(msg)
        return
      }
    } catch (e) {
      console.error('[WaitMe][Auth] signInWithGoogle excepción no prevista', e)
      setAuthError(e instanceof Error ? e.message : String(e))
    }
  }, [applyDevAuthenticatedCore])

  const signOut = useCallback(async () => {
    setAuthError(null)
    writeLocalFlag(DEV_AUTH_KEY, false)
    try {
      await signOutRequest()
    } catch (e) {
      console.error('[WaitMe][Auth] signOut falló; estado local se limpia igual.', e)
    }
    toUnauthenticated(false)
  }, [toUnauthenticated])

  const headerProfile = useMemo(() => {
    return buildResolvedHeaderProfile(profile, user)
  }, [profile, user])

  const markProfileComplete = useCallback((nextProfile) => {
    if (nextProfile && typeof nextProfile === 'object') {
      setProfile(nextProfile)
      setIsProfileComplete(checkProfileComplete(nextProfile))
    } else {
      setIsProfileComplete(true)
    }
    setIsNewUser(false)
    setProfileBootstrapReady(true)
  }, [])

  const value = useMemo(
    () => ({
      status,
      user,
      session,
      profile,
      setProfile,
      headerProfile,
      authError,
      signInWithGoogle,
      signOut,
      profileBootstrapReady,
      isNewUser,
      isProfileComplete,
      checkProfileComplete,
      markProfileComplete,
    }),
    [
      status,
      user,
      session,
      profile,
      setProfile,
      headerProfile,
      authError,
      signInWithGoogle,
      signOut,
      profileBootstrapReady,
      isNewUser,
      isProfileComplete,
      markProfileComplete,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** Raíz global de auth. */
export function AppAuthRoot({ children }) {
  return <AuthProvider>{children}</AuthProvider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (value == null) {
    throw new Error('useAuth requires AuthProvider (usa <AppAuthRoot>)')
  }
  return value
}

export { checkProfileComplete } from '../services/profile.js'
