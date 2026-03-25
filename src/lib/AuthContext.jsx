import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../services/supabase.js'
import {
  consumeOAuthUrlError,
  signInWithGoogle as signInWithGoogleRequest,
  signOut as signOutRequest,
} from '../services/auth.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading')
  const [user, setUser] = useState(null)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    let cancelled = false

    const syncFromSession = (session) => {
      const nextUser = session?.user ?? null
      setUser(nextUser)
      setStatus(nextUser ? 'authenticated' : 'unauthenticated')
      if (nextUser) setAuthError(null)
    }

    const bootstrap = async () => {
      if (!isSupabaseConfigured()) {
        if (!cancelled) {
          setUser(null)
          setStatus('unauthenticated')
          setAuthError(null)
        }
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (cancelled) return

      if (!session?.user) {
        const oauthErr = consumeOAuthUrlError()
        if (oauthErr) setAuthError(oauthErr)
      }

      syncFromSession(session)
    }

    void bootstrap()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      syncFromSession(session)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null)
    if (!isSupabaseConfigured()) {
      setAuthError('Servicio de acceso no disponible.')
      return
    }
    const { error } = await signInWithGoogleRequest()
    if (error) {
      const msg = error.message || String(error)
      setAuthError(msg)
    }
  }, [])

  const signOut = useCallback(async () => {
    setAuthError(null)
    await signOutRequest()
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  const value = useMemo(
    () => ({
      status,
      user,
      authError,
      signInWithGoogle,
      signOut,
    }),
    [status, user, authError, signInWithGoogle, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
