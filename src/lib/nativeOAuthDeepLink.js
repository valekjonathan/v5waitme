/**
 * Completa OAuth PKCE en Capacitor cuando el retorno llega por custom scheme (appUrlOpen).
 * No usar en web puro: allí el flujo sigue en window.location.
 */
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { isNativeOAuthCallbackUrl } from './oauthRedirect.js'
import { supabase, isSupabaseConfigured } from '../services/supabase.js'

function readOAuthParamsFromUrl(url) {
  const parsed = new URL(url)
  const out = {}
  parsed.searchParams.forEach((v, k) => {
    out[k] = v
  })
  if (parsed.hash && parsed.hash[0] === '#') {
    try {
      const hp = new URLSearchParams(parsed.hash.slice(1))
      hp.forEach((v, k) => {
        if (out[k] === undefined) out[k] = v
      })
    } catch {
      /* hash no es query */
    }
  }
  return out
}

export function registerNativeOAuthDeepLink() {
  if (!Capacitor.isNativePlatform()) return
  if (!isSupabaseConfigured() || !supabase) return

  void App.addListener('appUrlOpen', async ({ url }) => {
    if (!url || !isNativeOAuthCallbackUrl(url)) return

    const params = readOAuthParamsFromUrl(url)
    if (params.error || params.error_description) {
      console.error('[WaitMe][Auth] OAuth deep link error', params.error, params.error_description)
      return
    }
    const code = params.code
    if (!code) return

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('[WaitMe][Auth] exchangeCodeForSession (deep link)', error.message, error)
      return
    }
    if (data?.session) {
      console.info('[WaitMe][Auth] Sesión establecida vía deep link OAuth')
    }
  })
}
