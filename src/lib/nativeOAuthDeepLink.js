import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { supabase } from '../services/supabase.js'

/** Compat: builds anteriores (antes de capacitor://localhost). */
const LEGACY_CALLBACK_PREFIX = 'es.waitme.v5waitme://auth-callback'

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

/**
 * @param {string} url
 * @returns {boolean}
 */
function isCapacitorLocalhostCallback(url) {
  if (!url || typeof url !== 'string') return false
  if (url.startsWith(LEGACY_CALLBACK_PREFIX)) return true
  try {
    const u = new URL(url)
    if (u.protocol !== 'capacitor:') return false
    return u.hostname.toLowerCase() === 'localhost'
  } catch {
    return /^capacitor:\/\/localhost/i.test(url)
  }
}

/**
 * @param {string} url
 * @returns {string}
 */
function normalizeNativeCallbackUrl(url) {
  if (url.startsWith(LEGACY_CALLBACK_PREFIX)) {
    return url.replace(LEGACY_CALLBACK_PREFIX, 'http://localhost/auth-callback')
  }
  try {
    const u = new URL(url)
    if (u.protocol === 'capacitor:' && u.hostname.toLowerCase() === 'localhost') {
      const path = u.pathname === '/' ? '' : u.pathname
      return `http://localhost${path}${u.search}${u.hash}`
    }
  } catch {
    /* */
  }
  return url.replace(/^capacitor:\/\/localhost\/?/i, 'http://localhost/')
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

  if (!isCapacitorLocalhostCallback(url)) {
    console.log('[WaitMe][OAuth] URL no es capacitor://localhost (ni legacy); ignorada')
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

    console.log('[OAuth][JS] code extraído:', code ? '(presente)' : null)

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

function shouldClearOAuthWatch(url) {
  return typeof url === 'string' && isCapacitorLocalhostCallback(url)
}

export function registerNativeOAuthDeepLink() {
  if (!Capacitor.isNativePlatform() || !supabase) return

  void App.addListener('appUrlOpen', async ({ url }) => {
    if (shouldClearOAuthWatch(url)) {
      clearOAuthReturnWatch()
    }
    await deliverNativeOAuthCallback(url, 'appUrlOpen')
  })

  void App.getLaunchUrl().then((launch) => {
    if (launch?.url) {
      if (shouldClearOAuthWatch(launch.url)) {
        clearOAuthReturnWatch()
      }
      void deliverNativeOAuthCallback(launch.url, 'getLaunchUrl')
    }
  })
}
