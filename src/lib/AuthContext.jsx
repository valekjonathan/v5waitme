import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AppProvider, AppStateContext, useAppDispatch } from '../store/AppProvider.jsx'
import { supabase, isSupabaseConfigured } from '../services/supabase.js'
import {
  consumeOAuthUrlError,
  signInWithGoogle as signInWithGoogleRequest,
  signOut as signOutRequest,
} from '../services/auth.js'
import { ensureProfileForOAuthUser } from '../services/profile.js'

const AuthActionsContext = createContext(null)

const AUTH_BOOTSTRAP_MAX_MS = 12000

export function AuthProvider({ children }) {
  const dispatch = useAppDispatch()
  const appState = useContext(AppStateContext)
  const [authError, setAuthError] = useState(null)
  const authStatusRef = useRef(appState?.authStatus ?? 'loading')

  useEffect(() => {
    authStatusRef.current = appState?.authStatus ?? 'loading'
  }, [appState?.authStatus])

  useEffect(() => {
    const bootTimer = window.setTimeout(() => {
      // Evitar ruido: si la sesión ya se resolvió antes del timeout, no hacemos log/dispatch.
      if (authStatusRef.current !== 'loading') return
      dispatch({ type: 'app/AUTH_BOOT_TIMEOUT' })
      console.error('[WaitMe][Auth] Arranque de sesión superó el tiempo; se continúa sin sesión.')
    }, AUTH_BOOTSTRAP_MAX_MS)
    return () => window.clearTimeout(bootTimer)
  }, [dispatch])

  useEffect(() => {
    let cancelled = false

    let profileBootSeq = 0
    /** Evita repetir SELECT/INSERT en cada TOKEN_REFRESHED del mismo usuario. */
    let lastProfileBootUserId = null

    const syncFromSession = async (session) => {
      const nextUser = session?.user ?? null
      if (cancelled) return
      dispatch({
        type: 'app/AUTH_SYNC',
        payload: {
          user: nextUser,
          session: session ?? null,
          authStatus: nextUser ? 'authenticated' : 'unauthenticated',
        },
      })
      if (nextUser) setAuthError(null)

      if (!nextUser) {
        lastProfileBootUserId = null
        return
      }

      if (!isSupabaseConfigured() || !supabase) {
        if (lastProfileBootUserId === nextUser.id) return
        lastProfileBootUserId = nextUser.id
        dispatch({
          type: 'app/PROFILE_BOOTSTRAP',
          payload: { isNewUser: false, isProfileComplete: true },
        })
        return
      }

      if (lastProfileBootUserId === nextUser.id) return

      const seq = (profileBootSeq += 1)
      const result = await ensureProfileForOAuthUser(nextUser)
      if (cancelled || seq !== profileBootSeq) return
      lastProfileBootUserId = nextUser.id
      dispatch({
        type: 'app/PROFILE_BOOTSTRAP',
        payload: {
          isNewUser: result.isNewUser,
          isProfileComplete: result.isProfileComplete,
        },
      })
    }

    const bootstrap = async () => {
      if (!isSupabaseConfigured() || !supabase) {
        if (!cancelled) {
          dispatch({
            type: 'app/AUTH_SYNC',
            payload: { user: null, session: null, authStatus: 'unauthenticated' },
          })
          setAuthError(null)
        }
        return
      }

      try {
        const {
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
            dispatch({
              type: 'app/AUTH_SYNC',
              payload: { user: null, session: null, authStatus: 'unauthenticated' },
            })
          }
          return
        }

        if (!session?.user) {
          const oauthErr = consumeOAuthUrlError()
          if (oauthErr) setAuthError(oauthErr)
        }

        await syncFromSession(session)
      } catch (e) {
        console.error('[WaitMe][Auth] arranque de sesión falló; se continúa sin sesión.', e)
        if (!cancelled) {
          dispatch({
            type: 'app/AUTH_SYNC',
            payload: { user: null, session: null, authStatus: 'unauthenticated' },
          })
          setAuthError(null)
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
  }, [dispatch])

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null)
    if (!isSupabaseConfigured()) {
      setAuthError('Servicio de acceso no disponible.')
      return
    }
    try {
      const { error } = await signInWithGoogleRequest()
      if (error) {
        const msg = error.message || String(error)
        setAuthError(msg)
      }
    } catch (e) {
      console.error('[WaitMe][Auth] signInWithGoogle excepción no prevista', e)
      setAuthError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  const signOut = useCallback(async () => {
    setAuthError(null)
    try {
      await signOutRequest()
    } catch (e) {
      console.error('[WaitMe][Auth] signOut falló; estado local se limpia igual.', e)
    }
    dispatch({
      type: 'app/AUTH_SYNC',
      payload: { user: null, session: null, authStatus: 'unauthenticated' },
    })
  }, [dispatch])

  const actions = useMemo(
    () => ({
      authError,
      signInWithGoogle,
      signOut,
    }),
    [authError, signInWithGoogle, signOut]
  )

  return <AuthActionsContext.Provider value={actions}>{children}</AuthActionsContext.Provider>
}

/**
 * Raíz de auth + store: **AppProvider debe envolver a AuthProvider**.
 * Si se invierte el orden, `useAppDispatch()` dentro de AuthProvider falla en el primer render
 * (“useAppDispatch must be used within AppProvider”): no hay estado intermedio roto silencioso.
 */
export function AppAuthRoot({ children }) {
  return (
    <AppProvider>
      <AuthProvider>{children}</AuthProvider>
    </AppProvider>
  )
}

export function useAuth() {
  const state = useContext(AppStateContext)
  const actions = useContext(AuthActionsContext)
  if (state == null) {
    throw new Error('useAuth requires AppProvider (usa <AppAuthRoot> o anida AppProvider primero)')
  }
  if (actions == null) {
    throw new Error(
      'useAuth requires AuthProvider (usa <AppAuthRoot> o anida AuthProvider dentro de AppProvider)'
    )
  }
  return {
    status: state.authStatus,
    user: state.user,
    session: state.session,
    authError: actions.authError,
    signInWithGoogle: actions.signInWithGoogle,
    signOut: actions.signOut,
  }
}
