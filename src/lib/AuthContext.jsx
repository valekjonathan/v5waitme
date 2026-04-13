import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { supabase, isSupabaseConfigured } from '../services/supabase.js'
import {
  consumeOAuthUrlError,
  exchangeSessionFromOAuthUrl,
  getOAuthErrorMessageFromUrl,
  isNativeOAuthCallbackUrl,
  oauthDiagLog,
  signInWithGoogle as signInWithGoogleRequest,
  signOut as signOutRequest,
  urlHasOAuthCode,
  urlHasOAuthErrorParams,
} from '../services/auth.js'
import {
  buildResolvedHeaderProfile,
  checkProfileComplete,
  ensureProfileForOAuthUser,
} from '../services/profile.js'
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
  /** Evita que el timeout de arranque pase a login mientras hay intercambio PKCE en curso (iOS). */
  const oauthPendingRef = useRef(false)

  useEffect(() => {
    authStatusRef.current = status
  }, [status])

  useEffect(() => {
    if (user && !profile) {
      setProfile(buildResolvedHeaderProfile(null, user))
    }
  }, [user, profile])

  useEffect(() => {
    const bootTimer = window.setTimeout(() => {
      // Evitar ruido: si la sesión ya se resolvió antes del timeout, no hacemos log/dispatch.
      if (authStatusRef.current !== 'loading') return
      if (oauthPendingRef.current) return
      setUser(null)
      setSession(null)
      setStatus('unauthenticated')
      setProfileBootstrapReady(true)
      setIsNewUser(false)
      setIsProfileComplete(false)
      setProfile(null)
      console.error('[WaitMe][Auth] Arranque de sesión superó el tiempo; se continúa sin sesión.')
    }, AUTH_BOOTSTRAP_MAX_MS)
    return () => window.clearTimeout(bootTimer)
  }, [])

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
        setUser(null)
        setSession(null)
        setProfile(null)
        setStatus('unauthenticated')
        setProfileBootstrapReady(true)
        setIsNewUser(false)
        setIsProfileComplete(false)
        return
      }

      /**
       * Mismo usuario ya arrancado: actualizar sesión/tokens sin resetear bootstrap.
       * Antes: setProfileBootstrapReady(false) y return temprano dejaba profileBootstrapReady
       * en false para siempre → AppGate en loading perpetuo / sensación de “pantalla negra”.
       */
      if (isSupabaseConfigured() && supabase && lastProfileBootUserId === nextUser.id) {
        setUser(nextUser)
        setSession(session ?? null)
        setStatus('authenticated')
        return
      }

      setUser(nextUser)
      setSession(session ?? null)
      setStatus('authenticated')
      setAuthError(null)
      setProfileBootstrapReady(false)
      if (!wasAuthenticated) logFlow('LOGIN_SUCCESS', { mode: 'supabase' })

      if (!isSupabaseConfigured() || !supabase) {
        const merged = readMergedDevProfileForCheck(nextUser)
        const profileComplete = checkProfileComplete(merged)
        lastProfileBootUserId = nextUser.id
        setProfile(merged)
        setIsNewUser(false)
        setIsProfileComplete(profileComplete)
        setProfileBootstrapReady(true)
        if (!profileComplete) logFlow('PROFILE_REQUIRED', { mode: 'dev-local' })
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
            const devUser = buildDevUser()
            setUser(devUser)
            setSession({ user: devUser })
            setStatus('authenticated')
            const merged = readMergedDevProfileForCheck(devUser)
            const profileComplete = checkProfileComplete(merged)
            setProfile(merged)
            setIsNewUser(false)
            setIsProfileComplete(profileComplete)
            setProfileBootstrapReady(true)
            if (!profileComplete) logFlow('PROFILE_REQUIRED', { mode: 'dev-local' })
            return
          }
          setUser(null)
          setSession(null)
          setStatus('unauthenticated')
          setProfileBootstrapReady(true)
          setProfile(null)
          setIsNewUser(false)
          setIsProfileComplete(false)
          setAuthError(null)
        }
        return
      }

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
            setUser(null)
            setSession(null)
            setStatus('unauthenticated')
            setProfileBootstrapReady(true)
            setProfile(null)
            setIsNewUser(false)
            setIsProfileComplete(false)
          }
          return
        }

        /**
         * PKCE: en iOS el retorno va por deep link (appUrlOpen); el WebView suele no tener ?code= en location.
         * getLaunchUrl + URL del WebView; un solo intercambio exitoso basta.
         */
        let pkceResolutionPending = false
        if (!session?.user) {
          const urlsToTry = []
          if (Capacitor.isNativePlatform()) {
            try {
              const launch = await App.getLaunchUrl()
              if (launch?.url) {
                urlsToTry.push(launch.url)
              }
            } catch {
              /* */
            }
          }
          if (typeof window !== 'undefined') {
            urlsToTry.push(window.location.href)
          }
          const shouldHoldTimeout = urlsToTry.some((u) => u && urlHasOAuthCode(u))
          if (shouldHoldTimeout) {
            pkceResolutionPending = true
            oauthPendingRef.current = true
          }
          const seen = new Set()
          for (const urlStr of urlsToTry) {
            if (!urlStr || seen.has(urlStr)) continue
            seen.add(urlStr)
            const { session: exchanged, error: exchangeError } =
              await exchangeSessionFromOAuthUrl(urlStr)
            if (exchangeError) {
              console.error(
                '[WaitMe][Auth] OAUTH_EXCHANGE_FAIL',
                exchangeError.message ?? exchangeError
              )
              try {
                await signOutRequest()
              } catch {
                /* */
              }
              try {
                if (typeof window !== 'undefined') {
                  window.history.replaceState(
                    {},
                    '',
                    `${window.location.pathname}${window.location.hash || ''}`
                  )
                }
              } catch {
                /* */
              }
              session = null
              break
            }
            if (exchanged?.user) {
              session = exchanged
              try {
                if (typeof window !== 'undefined') {
                  window.history.replaceState({}, '', window.location.pathname || '/')
                }
              } catch {
                /* */
              }
              break
            }
          }
        }

        if (!session?.user) {
          const oauthErr = consumeOAuthUrlError()
          if (oauthErr) setAuthError(oauthErr)
        }

        try {
          await syncFromSession(session)
        } finally {
          if (pkceResolutionPending) oauthPendingRef.current = false
        }
      } catch (e) {
        oauthPendingRef.current = false
        console.error('[WaitMe][Auth] arranque de sesión falló; se continúa sin sesión.', e)
        if (!cancelled) {
          try {
            await signOutRequest()
          } catch {
            /* */
          }
          setUser(null)
          setSession(null)
          setStatus('unauthenticated')
          setProfileBootstrapReady(true)
          setProfile(null)
          setIsNewUser(false)
          setIsProfileComplete(false)
          setAuthError(null)
        }
      }
    }

    if (!isSupabaseConfigured() || !supabase) {
      void bootstrap()
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

    let removeAppUrlOpen = () => {}
    const startAuth = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const handle = await App.addListener('appUrlOpen', async ({ url }) => {
            if (cancelled || !url) return
            oauthDiagLog('appUrlOpen', { url })
            if (Capacitor.getPlatform() === 'ios' && supabase) {
              const {
                data: { session: already },
              } = await supabase.auth.getSession()
              if (already?.user && urlHasOAuthCode(url)) {
                try {
                  await Browser.close()
                } catch {
                  /* */
                }
                await syncFromSession(already)
                return
              }
            }
            const isOurScheme = url.toLowerCase().startsWith('es.waitme.v5waitme:')
            const isExactCallback = isNativeOAuthCallbackUrl(url)
            const isSchemeOAuthReturn =
              isOurScheme && (urlHasOAuthCode(url) || urlHasOAuthErrorParams(url))
            if (isExactCallback || isSchemeOAuthReturn) {
              try {
                await Browser.close()
              } catch {
                /* sin vista de Browser abierta */
              }
            }
            if (!isExactCallback && !isSchemeOAuthReturn) return
            if (urlHasOAuthErrorParams(url) && !urlHasOAuthCode(url)) {
              const msg = getOAuthErrorMessageFromUrl(url)
              if (msg) setAuthError(msg)
              return
            }
            if (!urlHasOAuthCode(url)) return
            oauthPendingRef.current = true
            try {
              const { session: next, error: exErr } = await exchangeSessionFromOAuthUrl(url)
              if (exErr) {
                console.error('[WaitMe][Auth] appUrlOpen exchange', exErr.message ?? exErr)
                oauthDiagLog('appUrlOpen:exchange_error', { message: exErr.message ?? String(exErr) })
                return
              }
              oauthDiagLog('appUrlOpen:exchange_ok', { userId: next?.user?.id ?? null })
              await syncFromSession(next)
            } finally {
              oauthPendingRef.current = false
            }
          })
          removeAppUrlOpen = () => {
            void handle.remove()
          }
        } catch (e) {
          console.error('[WaitMe][Auth] appUrlOpen listener', e)
        }
      }
      await bootstrap()
    }
    void startAuth()

    return () => {
      cancelled = true
      profileBootSeq += 1000
      lastProfileBootUserId = null
      subscription.unsubscribe()
      removeAppUrlOpen()
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    logFlow('LOGIN_CLICK')
    setAuthError(null)
    if (!isSupabaseConfigured()) {
      const devUser = buildDevUser()
      writeLocalFlag(DEV_AUTH_KEY, true)
      setUser(devUser)
      setSession({ user: devUser })
      setStatus('authenticated')
      setIsNewUser(false)
      const merged = readMergedDevProfileForCheck(devUser)
      const complete = checkProfileComplete(merged)
      setProfile(merged)
      setIsProfileComplete(complete)
      setProfileBootstrapReady(true)
      logFlow('LOGIN_SUCCESS', { mode: 'dev-local' })
      if (!complete) logFlow('PROFILE_REQUIRED', { mode: 'dev-local' })
      return
    }
    try {
      const { error } = await signInWithGoogleRequest()
      if (error) {
        const msg = error.message || String(error)
        setAuthError(msg)
        return
      }
      /** Navegación: solo App.jsx según user + isProfileComplete; onAuthStateChange sincroniza sesión. */
    } catch (e) {
      console.error('[WaitMe][Auth] signInWithGoogle excepción no prevista', e)
      setAuthError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  const signOut = useCallback(async () => {
    setAuthError(null)
    writeLocalFlag(DEV_AUTH_KEY, false)
    try {
      await signOutRequest()
    } catch (e) {
      console.error('[WaitMe][Auth] signOut falló; estado local se limpia igual.', e)
    }
    setUser(null)
    setSession(null)
    setProfile(null)
    setStatus('unauthenticated')
    setProfileBootstrapReady(true)
    setIsNewUser(false)
    setIsProfileComplete(false)
  }, [])

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
      profileComplete: isProfileComplete,
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
