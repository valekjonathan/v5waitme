/**
 * @fileoverview Sesión Supabase: OAuth, getSession, signOut. Sin Supabase configurado, operaciones son no-op seguras.
 */
import { Browser } from '@capacitor/browser'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { supabase, isSupabaseConfigured, SUPABASE_PROJECT_URL } from './supabase.js'

const viteEnv = typeof import.meta !== 'undefined' && import.meta.env != null ? import.meta.env : {}
const isViteProd = viteEnv.PROD === true

/**
 * OAuth en app Capacitor debe usar SIEMPRE `redirectTo` nativo + ASWebAuthenticationSession / deep link.
 * Si `Capacitor.isNativePlatform()` devuelve false (p. ej. bridge aún no expuesto en WKWebView) pero el
 * documento sigue siendo `capacitor://` / `ionic://`, el cliente caía en flujo web: `window.location.assign`
 * (GoTrue) + `redirectTo` tipo localhost → pantalla en blanco "localhost" en el iPhone.
 *
 * @param {{ isNativePlatform?: () => boolean, hasNativeBridge?: boolean, locationProtocol?: string }} [signals] solo tests
 * @returns {boolean}
 */
export function shouldUseNativeOAuthFlow(signals) {
  if (signals) {
    if (signals.isNativePlatform?.()) return true
    if (signals.hasNativeBridge) return true
    const p = String(signals.locationProtocol || '').toLowerCase()
    return p === 'capacitor:' || p === 'ionic:'
  }
  if (typeof window === 'undefined') return false
  const win = window
  /** Misma señal que `@capacitor/core` usa para iOS/Android frente a `web`. */
  if (win.androidBridge || win.webkit?.messageHandlers?.bridge) return true
  try {
    if (Capacitor.isNativePlatform()) return true
  } catch {
    /* */
  }
  const p = String(win.location?.protocol || '').toLowerCase()
  return p === 'capacitor:' || p === 'ionic:'
}

/**
 * URL absoluta de retorno OAuth en navegador (PKCE). Una sola fuente de verdad para `redirectTo`.
 *
 * - Producción / staging / túnel: `window.location.origin` (HTTPS u origen real de la pestaña).
 * - Desarrollo en `localhost` / `127.0.0.1`: si Vite inyectó `VITE_DEV_LAN_ORIGIN`, se usa ese origen
 *   para que Google → Supabase no redirijan al loopback del Mac (el iPhone no puede abrirlo → pantalla en blanco).
 * - Desarrollo ya abierto por IP LAN o ngrok: se respeta el origen actual.
 *
 * Ruta fija `/auth/callback`: registrar en Supabase → Auth → Redirect URLs (y Site URL coherente).
 *
 * @param {{ windowOrigin: string, hostname: string, isProd: boolean, devLanOrigin: string }} p
 * @returns {string}
 */
export function resolveWebOAuthRedirectTo(p) {
  const { windowOrigin, hostname, isProd, devLanOrigin } = p
  const host = String(hostname || '').toLowerCase()
  const isLoopback = host === 'localhost' || host === '127.0.0.1' || host === '[::1]'

  let base = String(windowOrigin || '').replace(/\/$/, '')
  if (!isProd && isLoopback) {
    const lan = String(devLanOrigin || '').trim().replace(/\/$/, '')
    if (lan) {
      try {
        const u = new URL(lan)
        if (u.protocol === 'http:' || u.protocol === 'https:') {
          base = u.origin
        }
      } catch {
        /* mantener base (origen de la pestaña) */
      }
    }
  }

  if (!base) return ''
  try {
    return new URL('/auth/callback', `${base}/`).href
  } catch {
    return ''
  }
}

/** ASWebAuthenticationSession nativo (iOS); evita SFSafariViewController en blanco con custom scheme. */
const WaitmeWebAuth = registerPlugin('WaitmeWebAuth', {
  web: () => ({
    start: async () => {
      throw new Error('WaitmeWebAuth: solo iOS nativo')
    },
  }),
})

/**
 * Debe coincidir con CFBundleURLSchemes y con `redirectTo` en signInWithOAuth (iOS/Android nativo).
 * En Supabase Dashboard → Authentication → URL configuration:
 * - Redirect URLs: incluir exactamente esta URL; quitar localhost / 127.0.0.1 si no usas Supabase local.
 * - Site URL: tu HTTPS de producción (p. ej. Vercel); no dejar solo http://localhost como única URL de sitio si usas OAuth en cloud.
 */
export const NATIVE_OAUTH_REDIRECT_URL = 'es.waitme.v5waitme://auth/callback'

/**
 * Bump al publicar cambios OAuth iOS; referenciado en el retorno de signInWithGoogle
 * para que el hash del chunk principal cambie (evita “misma build” sin cambios de bytes).
 */
export const OAUTH_IOS_BUNDLE_ID = 'waitme-oauth-ios-2026-04-12g'

/**
 * True si la URL es el redirect nativo acordado (scheme/host/path), sin depender de includes('auth/callback').
 * iOS puede variar mayúsculas; el parser WHATWG normaliza hostname; el path se compara sin slash final extra.
 */
export function isNativeOAuthCallbackUrl(urlString) {
  if (!urlString) return false
  try {
    const actual = new URL(urlString)
    const expected = new URL(NATIVE_OAUTH_REDIRECT_URL)
    const normPath = (p) => {
      const t = p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p
      return t.toLowerCase()
    }
    return (
      actual.protocol.toLowerCase() === expected.protocol.toLowerCase() &&
      actual.hostname.toLowerCase() === expected.hostname.toLowerCase() &&
      normPath(actual.pathname) === normPath(expected.pathname)
    )
  } catch {
    return false
  }
}

/** error / error_description en query o hash (retorno OAuth fallido). */
export function urlHasOAuthErrorParams(urlString) {
  if (!urlString) return false
  try {
    const u = new URL(urlString)
    if (u.searchParams.get('error') || u.searchParams.get('error_description')) return true
    if (u.hash) {
      const h = new URLSearchParams(u.hash.replace(/^#/, ''))
      if (h.get('error') || h.get('error_description')) return true
    }
    return false
  } catch {
    return false
  }
}

export function getOAuthErrorMessageFromUrl(urlString) {
  if (!urlString) return null
  try {
    const u = new URL(urlString)
    let msg = u.searchParams.get('error_description') || u.searchParams.get('error')
    if (!msg && u.hash) {
      const h = new URLSearchParams(u.hash.replace(/^#/, ''))
      msg = h.get('error_description') || h.get('error')
    }
    if (!msg) return null
    try {
      return decodeURIComponent(String(msg).replace(/\+/g, ' '))
    } catch {
      return String(msg)
    }
  } catch {
    return null
  }
}

/** Indica si la URL trae código PKCE (query; hash por compatibilidad). */
/**
 * En Capacitor nativo, la URL a abrir debe ser la de Supabase `/auth/v1/authorize` (https),
 * nunca loopback: el host sale de VITE_SUPABASE_URL embebido en el build.
 */
function validateNativeOAuthAuthorizeUrl(oauthUrlString, projectUrlString) {
  if (!oauthUrlString || typeof oauthUrlString !== 'string') {
    return { ok: false, message: 'signInWithOAuth no devolvió data.url (OAuth no iniciado).' }
  }
  let oauthUrl
  try {
    oauthUrl = new URL(oauthUrlString)
  } catch {
    return { ok: false, message: 'data.url no es una URL absoluta válida.' }
  }
  const host = oauthUrl.hostname.toLowerCase()
  const isLoopback =
    host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '0.0.0.0'
  if (isLoopback) {
    return {
      ok: false,
      message:
        'La URL de autorización apunta a loopback (p. ej. localhost). El IPA debe compilarse con VITE_SUPABASE_URL=https://<ref>.supabase.co, no con Supabase CLI local.',
    }
  }
  if (oauthUrl.protocol !== 'https:') {
    return {
      ok: false,
      message: `La URL OAuth debe usar https (obtenido: ${oauthUrl.protocol}).`,
    }
  }
  let projectUrl
  try {
    projectUrl = new URL(projectUrlString)
  } catch {
    return { ok: false, message: 'VITE_SUPABASE_URL no es una URL válida en el build.' }
  }
  if (oauthUrl.hostname.toLowerCase() !== projectUrl.hostname.toLowerCase()) {
    return {
      ok: false,
      message: `Host de data.url (${oauthUrl.hostname}) no coincide con VITE_SUPABASE_URL (${projectUrl.hostname}).`,
    }
  }
  const path = oauthUrl.pathname.toLowerCase()
  if (!path.includes('authorize')) {
    return { ok: false, message: 'data.url no parece el endpoint /authorize de Supabase Auth.' }
  }
  return { ok: true }
}

export function urlHasOAuthCode(urlString) {
  if (!urlString) return false
  try {
    const u = new URL(urlString)
    if (u.searchParams.get('code')) return true
    if (u.hash) {
      const h = new URLSearchParams(u.hash.replace(/^#/, ''))
      if (h.get('code')) return true
    }
    return false
  } catch {
    return false
  }
}

/**
 * Intercambia ?code= PKCE desde la URL completa (retorno OAuth en app nativa o WebView).
 * Tras exchange, vuelve a leer la sesión persistida con getSession().
 */
export async function exchangeSessionFromOAuthUrl(urlString) {
  if (!isSupabaseConfigured() || !supabase || !urlString) {
    return { session: null, error: null }
  }
  try {
    const u = new URL(urlString)
    let code = u.searchParams.get('code')
    if (!code && u.hash) {
      const h = new URLSearchParams(u.hash.replace(/^#/, ''))
      code = h.get('code')
    }
    if (!code) return { session: null, error: null }
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('[WaitMe][Auth] exchangeCodeForSession', error.message ?? error)
      return { session: null, error }
    }
    const {
      data: { session: refreshed },
      error: refreshErr,
    } = await supabase.auth.getSession()
    if (refreshErr) return { session: data?.session ?? null, error: null }
    const session = refreshed ?? data?.session ?? null
    return { session, error: null }
  } catch (e) {
    return { session: null, error: e instanceof Error ? e : new Error(String(e)) }
  }
}

/**
 * Tras el redirect OAuth, si falla el proveedor suele quedar error en query o hash.
 * Limpia la URL para no re-procesar el error en cada recarga.
 * Llamar solo después de que el cliente haya podido leer el código/sesión (p. ej. tras getSession).
 */
export function consumeOAuthUrlError() {
  if (typeof window === 'undefined') return null
  try {
    const url = new URL(window.location.href)
    let msg = url.searchParams.get('error_description') || url.searchParams.get('error')

    if (!msg && url.hash) {
      const hash = new URLSearchParams(url.hash.replace(/^#/, ''))
      msg = hash.get('error_description') || hash.get('error')
    }

    if (!msg) return null

    const clean = new URL(window.location.href)
    ;['error', 'error_description', 'error_code'].forEach((k) => clean.searchParams.delete(k))

    if (clean.hash) {
      const hp = new URLSearchParams(clean.hash.replace(/^#/, ''))
      ;['error', 'error_description', 'error_code'].forEach((k) => hp.delete(k))
      const rest = hp.toString()
      clean.hash = rest ? `#${rest}` : ''
    }

    window.history.replaceState({}, '', `${clean.pathname}${clean.search}${clean.hash}`)

    try {
      return decodeURIComponent(String(msg).replace(/\+/g, ' '))
    } catch {
      return String(msg)
    }
  } catch {
    return null
  }
}

/**
 * Usuario actual validado contra el servidor Auth (preferible a getSession en cliente).
 */
export async function getCurrentUser() {
  if (!isSupabaseConfigured()) {
    console.warn('[WaitMe][Auth] Supabase no configurado; getCurrentUser omitido.')
    return null
  }
  if (!supabase) return null
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    if (error) {
      console.error('[WaitMe][Auth] getCurrentUser', error.message, error)
      return null
    }
    return user
  } catch (e) {
    console.error('[WaitMe][Auth] getCurrentUser excepción', e)
    return null
  }
}

/**
 * Inicia login con Google (OAuth) mediante Supabase Auth.
 */
export async function signInWithGoogle() {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('supabase_not_configured') }
  }
  if (!supabase) {
    return { data: null, error: new Error('supabase_not_configured') }
  }
  try {
    const useNativeOAuth = shouldUseNativeOAuthFlow()
    /**
     * Nativo (iOS/Android): `redirectTo` fijo al custom scheme; nunca localhost/origen web.
     * Web: debe ser un HTTPS (u origen dev) registrado en Supabase → Redirect URLs; el esquema app no aplica en el navegador.
     * iOS: `skipBrowserRedirect: true` + WaitmeWebAuth (ASWebAuthenticationSession).
     * Android: `Browser.open` + deep link.
     */
    const redirectTo = useNativeOAuth
      ? NATIVE_OAUTH_REDIRECT_URL
      : typeof window !== 'undefined'
        ? resolveWebOAuthRedirectTo({
            windowOrigin: window.location.origin,
            hostname: window.location.hostname,
            isProd: isViteProd,
            devLanOrigin: String(viteEnv.VITE_DEV_LAN_ORIGIN ?? ''),
          })
        : ''
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: useNativeOAuth,
      },
    })
    if (error) {
      console.error('[WaitMe][Auth] signInWithGoogle', error.message, error)
      return { data: null, error }
    }
    if (useNativeOAuth && data?.url) {
      const oauthOpenUrl = String(data.url).trim()
      const check = validateNativeOAuthAuthorizeUrl(oauthOpenUrl, SUPABASE_PROJECT_URL)
      if (!check.ok) {
        console.error('[WaitMe][Auth] OAuth URL inválida para nativo:', check.message)
        return { data: null, error: new Error(check.message) }
      }
      /**
       * Android: Custom Tabs + deep link. iOS (incl. si `getPlatform()` devolviera `web` en WKWebView):
       * ASWebAuthenticationSession vía WaitmeWebAuth; no usar `Browser.open` en iOS (evita flujo distinto).
       */
      if (Capacitor.getPlatform() === 'android') {
        await Browser.open({ url: oauthOpenUrl })
      } else {
        const { callbackUrl } = await WaitmeWebAuth.start({
          url: oauthOpenUrl,
          callbackScheme: 'es.waitme.v5waitme',
        })
        const { session: iosSession, error: iosExErr } = await exchangeSessionFromOAuthUrl(callbackUrl)
        if (iosExErr) {
          console.error('[WaitMe][Auth] iOS OAuth tras callback', iosExErr.message ?? iosExErr)
          return { data: null, error: iosExErr }
        }
        if (!iosSession?.user) {
          return { data: null, error: new Error('oauth_session_missing') }
        }
      }
    }
    return {
      data:
        data != null
          ? { ...data, _waitmeOAuthIosBundle: OAUTH_IOS_BUNDLE_ID }
          : data,
      error: null,
    }
  } catch (e) {
    console.error('[WaitMe][Auth] signInWithGoogle excepción', e)
    return { data: null, error: e }
  }
}

/**
 * Sesión actual (persistente). Útil para restaurar en recargas.
 */
export async function getSession() {
  if (!isSupabaseConfigured()) {
    return { data: { session: null }, error: null }
  }
  if (!supabase) {
    return { data: { session: null }, error: null }
  }
  try {
    return await supabase.auth.getSession()
  } catch (e) {
    console.error('[WaitMe][Auth] getSession excepción', e)
    return { data: { session: null }, error: e }
  }
}

export async function signOut() {
  if (!isSupabaseConfigured()) {
    return { error: null }
  }
  if (!supabase) {
    return { error: null }
  }
  try {
    const { error } = await supabase.auth.signOut()
    if (error) console.error('[WaitMe][Auth] signOut', error.message, error)
    return { error: error ?? null }
  } catch (e) {
    console.error('[WaitMe][Auth] signOut excepción', e)
    return { error: e }
  }
}
