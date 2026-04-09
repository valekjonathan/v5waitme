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

/** Fila Supabase ya normalizada sobre `buildResolvedHeaderProfile` (sin duplicar reglas de merge). */
function mergeOAuthProfileRow(base, row) {
  if (!row) return base
  return {
    ...base,
    ...row,
    full_name: row.full_name || base.full_name,
    email: row.email || base.email,
    avatar_url: row.avatar_url || base.avatar_url,
  }
}

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading')
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [profile, _setProfile] = useState(() => buildResolvedHeaderProfile(null, user))
  const [profileBootstrapReady, setProfileBootstrapReady] = useState(false)
  const [isNewUser, setIsNewUser] = useState(false)
  const [isProfileComplete, setIsProfileComplete] = useState(false)
  const [authError, setAuthError] = useState(null)
  const [authActionLoading, setAuthActionLoading] = useState(false)
  const authActionLoadingRef = useRef(false)
  const authStatusRef = useRef(status)

  useEffect(() => {
    authStatusRef.current = status
  }, [status])

  const isValidProfileValue = useCallback((v) => {
    if (!v || typeof v !== 'object') return false
    try {
      return Object.keys(v).length > 0
    } catch {
      return false
    }
  }, [])

  const setProfile = useCallback(
    (next) => {
      if (typeof next === 'function') {
        _setProfile((prev) => {
          const computed = next(prev)
          return isValidProfileValue(computed) ? computed : prev
        })
        return
      }
      if (!isValidProfileValue(next)) return
      _setProfile(next)
    },
    [isValidProfileValue]
  )

  /** Tras OAuth el `finally` puede no ejecutarse antes del unload; al volver (bfcache) el ref quedaba true y el clic no hacía nada. */
  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const resetOAuthLoading = () => {
      authActionLoadingRef.current = false
      setAuthActionLoading(false)
    }
    resetOAuthLoading()
    const onPageShow = (e) => {
      if (e.persisted) resetOAuthLoading()
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  /** Único camino a sesión vacía + flags de arranque (tokens, perfil, errores opcionales). */
  const setUnauthenticatedState = useCallback((clearAuthError) => {
    setUser(null)
    setSession(null)
    setStatus('unauthenticated')
    setProfileBootstrapReady(true)
    setIsNewUser(false)
    setIsProfileComplete(false)
    if (clearAuthError) setAuthError(null)
  }, [])

  /** Único camino a identidad Supabase/dev autenticada (user + session + status); no toca perfil bootstrap. */
  const setAuthenticatedState = useCallback((nextUser, nextSession) => {
    setUser(nextUser)
    setSession(nextSession ?? null)
    setStatus('authenticated')
  }, [])

  /** Perfil dev-local tras `user` ya fijado (Supabase desactivado o rama sin API). */
  const commitDevLocalProfileBoot = useCallback((devUser) => {
    const { merged, isComplete } = buildDevLocalProfileState(devUser)
    setProfile(merged)
    setIsNewUser(false)
    setIsProfileComplete(isComplete)
    setProfileBootstrapReady(true)
    if (!isComplete) logFlow('PROFILE_REQUIRED', { mode: 'dev-local' })
  }, [setProfile])

  /** Dev sin Supabase: sesión + perfil draft; `logDevLoginSuccess` solo en flujo explícito de login. */
  const applyDevAuthenticatedCore = useCallback(
    (devUser, { logDevLoginSuccess }) => {
      setAuthenticatedState(devUser, { user: devUser })
      commitDevLocalProfileBoot(devUser)
      if (logDevLoginSuccess) logFlow('LOGIN_SUCCESS', { mode: 'dev-local' })
    },
    [commitDevLocalProfileBoot, setAuthenticatedState]
  )

  useEffect(() => {
    const stop = startLocationTracking()
    return typeof stop === 'function' ? stop : undefined
  }, [])

  useEffect(() => {
    if (user && !profile) {
      setProfile(buildResolvedHeaderProfile(null, user))
    }
  }, [user, profile, setProfile])

  useEffect(() => {
    const bootTimer = window.setTimeout(() => {
      // Evitar ruido: si la sesión ya se resolvió antes del timeout, no hacemos log/dispatch.
      if (authStatusRef.current !== 'loading') return
      setUnauthenticatedState(false)
      console.error('[WaitMe][Auth] Arranque de sesión superó el tiempo; se continúa sin sesión.')
    }, AUTH_BOOTSTRAP_MAX_MS)
    return () => window.clearTimeout(bootTimer)
  }, [setUnauthenticatedState])

  useEffect(() => {
    let cancelled = false

    let profileBootSeq = 0
    /** Evita repetir SELECT/INSERT en cada TOKEN_REFRESHED del mismo usuario. */
    let lastProfileBootUserId = null

    const syncFromSession = async (session) => {
      const nextUser = session?.user ?? null
      const wasAuthenticated = authStatusRef.current === 'authenticated'
      if (cancelled) return

      if (!nextUser) {
        lastProfileBootUserId = null
        setUnauthenticatedState(false)
        return
      }

      setAuthenticatedState(nextUser, session)
      /**
       * Mismo usuario ya arrancado: solo tokens/sesión; no resetear bootstrap ni perfil.
       * Antes: setProfileBootstrapReady(false) y return temprano dejaba profileBootstrapReady
       * en false para siempre → AppGate en loading perpetuo / sensación de “pantalla negra”.
       */
      if (isSupabaseConfigured() && supabase && lastProfileBootUserId === nextUser.id) {
        return
      }

      setAuthError(null)
      setProfileBootstrapReady(false)
      if (!wasAuthenticated) logFlow('LOGIN_SUCCESS', { mode: 'supabase' })

      if (!isSupabaseConfigured() || !supabase) {
        lastProfileBootUserId = nextUser.id
        commitDevLocalProfileBoot(nextUser)
        return
      }

      setProfile(buildResolvedHeaderProfile(null, nextUser))

      const seq = (profileBootSeq += 1)
      const result = await ensureProfileForOAuthUser(nextUser)
      if (cancelled || seq !== profileBootSeq) return
      lastProfileBootUserId = nextUser.id
      setProfile(() => {
        const base = buildResolvedHeaderProfile(null, nextUser)
        return mergeOAuthProfileRow(base, result.data)
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
          setUnauthenticatedState(true)
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
            setUnauthenticatedState(false)
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
          setUnauthenticatedState(true)
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

      queueMicrotask(() => {
        if (cancelled) return

        ;(async () => {
          try {
            await syncFromSession(session)
          } catch (e) {
            console.error('[Auth] sync error', e)
          }
        })()
      })
    })

    return () => {
      cancelled = true
      profileBootSeq += 1000
      lastProfileBootUserId = null
      subscription.unsubscribe()
    }
  }, [
    setUnauthenticatedState,
    setAuthenticatedState,
    applyDevAuthenticatedCore,
    commitDevLocalProfileBoot,
    setProfile,
  ])

  const signInWithGoogle = useCallback(async () => {
    logFlow('LOGIN_CLICK')
    if (authActionLoadingRef.current) return
    authActionLoadingRef.current = true
    setAuthActionLoading(true)
    try {
      setAuthError(null)
      if (!isSupabaseConfigured()) {
        console.log('LOGIN START')
        writeLocalFlag(DEV_AUTH_KEY, true)
        applyDevAuthenticatedCore(buildDevUser(), { logDevLoginSuccess: true })
        return
      }
      const { error } = await signInWithGoogleRequest()
      if (error) setAuthError(error.message || String(error))
    } catch (e) {
      console.error('GOOGLE LOGIN ERROR', e)
      console.error('[WaitMe][Auth] signInWithGoogle excepción no prevista', e)
      setAuthError(e instanceof Error ? e.message : String(e))
    } finally {
      authActionLoadingRef.current = false
      setAuthActionLoading(false)
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
    setUnauthenticatedState(false)
  }, [setUnauthenticatedState])

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
  }, [setProfile])

  const value = useMemo(
    () => ({
      status,
      user,
      session,
      profile,
      setProfile,
      headerProfile,
      authError,
      authActionLoading,
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
      authActionLoading,
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
