import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { supabase } from '../services/supabase.js'

const NATIVE_CALLBACK_PREFIX = 'es.waitme.v5waitme://auth-callback'
const NATIVE_SCHEME_SNIPPET = 'es.waitme.v5waitme'

/** Evita doble intercambio si `getLaunchUrl` y `appUrlOpen` entregan la misma URL. */
const seenOAuthCallbackUrls = new Set()

/** Temporizador armado desde `signInWithGoogle` con in-app browser; se limpia al recibir deep link. */
let oauthReturnWatchId = null

/**
 * Tras abrir el Browser OAuth (p. ej. Android): si no llega URL en 5s, aviso en consola.
 */
export function armNativeOAuthReturnWatch() {
  if (!Capacitor.isNativePlatform()) return
  if (oauthReturnWatchId != null) {
    clearTimeout(oauthReturnWatchId)
    oauthReturnWatchId = null
  }
  oauthReturnWatchId = globalThis.setTimeout(() => {
    oauthReturnWatchId = null
    console.warn('[WaitMe][OAuth] timeout esperando deep link (in-app browser)')
  }, 5000)
}

function clearOAuthReturnWatch() {
  if (oauthReturnWatchId != null) {
    globalThis.clearTimeout(oauthReturnWatchId)
    oauthReturnWatchId = null
  }
}

function normalizeNativeCallbackUrl(url) {
  return url.replace('es.waitme.v5waitme://auth-callback', 'http://localhost/auth-callback')
}

/**
 * Procesa el callback OAuth nativo (código en query o hash). Un único camino para
 * ASWebAuthenticationSession, appUrlOpen y getLaunchUrl.
 *
 * @param {string} url
 * @param {'appUrlOpen' | 'getLaunchUrl' | 'webAuthSession'} source
 * @returns {Promise<boolean>} true si se intercambió el code y se disparó la navegación a /
 */
export async function deliverNativeOAuthCallback(url, source) {
  console.log(`[WaitMe][OAuth] callback (${source})`)
  console.log('[OAuth][JS] procesando callback:', url)

  if (!url) {
    console.warn('[WaitMe][OAuth] URL vacía; no se procesa')
    return false
  }

  const matchesPrefix = url.startsWith(NATIVE_CALLBACK_PREFIX)
  if (!matchesPrefix) {
    console.log('[WaitMe][OAuth] URL no es auth-callback; ignorada')
    return false
  }

  if (seenOAuthCallbackUrls.has(url)) {
    console.log('[WaitMe][OAuth] URL ya procesada; skip')
    return false
  }
  seenOAuthCallbackUrls.add(url)

  try {
    const normalized = normalizeNativeCallbackUrl(url)
    const parsed = new URL(normalized)

    const code =
      parsed.searchParams.get('code') ||
      new URLSearchParams(parsed.hash.replace(/^#/, '')).get('code')

    console.log('[OAuth][JS] code extraído:', code)

    if (!code) {
      console.warn('[WaitMe][OAuth] callback sin code; URL:', url)
      seenOAuthCallbackUrls.delete(url)
      return false
    }

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[OAuth][JS] ERROR exchange:', error)
      console.error('[WaitMe][OAuth] exchangeCodeForSession:', error)
      seenOAuthCallbackUrls.delete(url)
      return false
    }

    console.log('[OAuth][JS] sesión intercambiada OK')
    console.log('[WaitMe][OAuth] sesión OK; navegando a /')

    if (Capacitor.getPlatform() === 'android') {
      setTimeout(async () => {
        try {
          await Browser.close()
        } catch (e) {
          console.warn('[WaitMe][OAuth] Browser.close', e)
        }
      }, 300)
    }

    window.location.href = '/'
    return true
  } catch (err) {
    console.error('[WaitMe][OAuth] callback error:', err)
    seenOAuthCallbackUrls.delete(url)
    return false
  }
}

export function registerNativeOAuthDeepLink() {
  if (!Capacitor.isNativePlatform() || !supabase) return

  void App.addListener('appUrlOpen', async ({ url }) => {
    if (typeof url === 'string' && url.includes(NATIVE_SCHEME_SNIPPET)) {
      clearOAuthReturnWatch()
    }
    await deliverNativeOAuthCallback(url, 'appUrlOpen')
  })

  void App.getLaunchUrl().then((launch) => {
    if (launch?.url) {
      if (launch.url.includes(NATIVE_SCHEME_SNIPPET)) {
        clearOAuthReturnWatch()
      }
      void deliverNativeOAuthCallback(launch.url, 'getLaunchUrl')
    }
  })
}
