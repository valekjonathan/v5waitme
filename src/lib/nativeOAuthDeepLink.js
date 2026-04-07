import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { supabase } from '../services/supabase.js'

const NATIVE_CALLBACK_PREFIX = 'es.waitme.v5waitme://auth-callback'
const NATIVE_SCHEME_SNIPPET = 'es.waitme.v5waitme'

/** Evita doble intercambio si `getLaunchUrl` y `appUrlOpen` entregan la misma URL. */
const seenOAuthCallbackUrls = new Set()

/** Temporizador armado desde `signInWithGoogle` nativo; se limpia al recibir deep link. */
let oauthReturnWatchId = null

/**
 * Tras abrir el Browser OAuth nativo: si en 5s no llega URL con el scheme, aviso en consola.
 * No altera el flujo; 5s puede dispararse si el usuario tarda más (falso positivo posible).
 */
export function armNativeOAuthReturnWatch() {
  if (!Capacitor.isNativePlatform()) return
  if (oauthReturnWatchId != null) {
    clearTimeout(oauthReturnWatchId)
    oauthReturnWatchId = null
  }
  oauthReturnWatchId = globalThis.setTimeout(() => {
    oauthReturnWatchId = null
    console.warn('[WaitMe][OAuth] timeout esperando deep link')
    console.error('[WaitMe][OAuth] ERROR: no llegó deep link')
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
 * @param {'appUrlOpen' | 'getLaunchUrl'} source
 */
async function handleNativeOAuthUrl(url, source) {
  console.log(`[WaitMe][OAuth] handler (${source})`)
  console.log('APP OPEN URL:', url)

  if (!url) {
    console.log('[WaitMe][OAuth] URL vacía; no se procesa')
    return
  }

  const matchesPrefix = url.startsWith(NATIVE_CALLBACK_PREFIX)
  console.log('[WaitMe][OAuth] ¿empieza por auth-callback?:', matchesPrefix)

  if (!matchesPrefix) {
    console.log('[WaitMe][OAuth] URL no es nuestro callback OAuth; se ignora sin error')
    return
  }

  if (seenOAuthCallbackUrls.has(url)) {
    console.log('[WaitMe][OAuth] URL ya procesada; skip')
    return
  }
  seenOAuthCallbackUrls.add(url)

  try {
    const normalized = normalizeNativeCallbackUrl(url)
    const parsed = new URL(normalized)

    const code =
      parsed.searchParams.get('code') ||
      new URLSearchParams(parsed.hash.replace(/^#/, '')).get('code')

    console.log('[WaitMe][OAuth] ¿hay code?:', Boolean(code))

    if (!code) {
      console.log(
        '[WaitMe][OAuth] SIN code en query ni hash; no se rompe el flujo. URL completa arriba (APP OPEN URL).'
      )
      seenOAuthCallbackUrls.delete(url)
      return
    }

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[WaitMe][OAuth] exchangeCodeForSession error:', error)
      seenOAuthCallbackUrls.delete(url)
      return
    }

    console.log('[WaitMe][OAuth] sesión OK; cerrando Browser (defer) y navegando a /')

    setTimeout(async () => {
      try {
        await Browser.close()
      } catch (e) {
        console.log('Browser close failed', e)
      }
    }, 300)

    window.location.href = '/'
  } catch (err) {
    console.error('[WaitMe][OAuth] Deep link error:', err)
    seenOAuthCallbackUrls.delete(url)
  }
}

export function registerNativeOAuthDeepLink() {
  if (!Capacitor.isNativePlatform() || !supabase) return

  void App.addListener('appUrlOpen', async ({ url }) => {
    console.log('[WaitMe][OAuth] appUrlOpen evento recibido')
    if (typeof url === 'string' && url.includes(NATIVE_SCHEME_SNIPPET)) {
      clearOAuthReturnWatch()
      console.log('[WaitMe][OAuth] retorno recibido')
    }
    await handleNativeOAuthUrl(url, 'appUrlOpen')
  })

  void App.getLaunchUrl().then((launch) => {
    if (launch?.url) {
      console.log('[WaitMe][OAuth] getLaunchUrl:', launch.url)
      if (launch.url.includes(NATIVE_SCHEME_SNIPPET)) {
        clearOAuthReturnWatch()
        console.log('[WaitMe][OAuth] retorno recibido')
      }
      void handleNativeOAuthUrl(launch.url, 'getLaunchUrl')
    }
  })
}
