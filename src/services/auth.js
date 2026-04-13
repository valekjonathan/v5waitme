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
 *
 * **GoTrueClient (`@supabase/auth-js`)** `_handleProviderSignIn`: si `isBrowser() && !skipBrowserRedirect`,
 * hace `window.location.assign(url)` → el WKWebView sigue el OAuth hasta `redirectTo` **http(s)** (p. ej.
 * `*.vercel.app/auth/callback`) y el usuario queda en flujo web. Por eso en nativo: `skipBrowserRedirect: true`,
 * `queryParams.skip_http_redirect`, y `WaitmeWebAuth` / deep link.
 *
 * Si `Capacitor.isNativePlatform()` devolvía false con origen `https:` en el WebView, `shouldUseNativeOAuth`
 * podía ser false → ramal anterior. `Capacitor.getPlatform() === 'ios'|'android'` fuerza nativo en app instalada.
 *
 * @param {{ isNativePlatform?: () => boolean, hasNativeBridge?: boolean, locationProtocol?: string, capacitorPlatform?: string }} [signals] solo tests
 * @returns {boolean}
 */
export function shouldUseNativeOAuthFlow(signals) {
  if (signals) {
    const cp = String(signals.capacitorPlatform || '').toLowerCase()
    if (cp === 'ios' || cp === 'android') return true
    if (signals.isNativePlatform?.()) return true
    if (signals.hasNativeBridge) return true
    const p = String(signals.locationProtocol || '').toLowerCase()
    return p === 'capacitor:' || p === 'ionic:'
  }
  if (typeof window === 'undefined') return false
  try {
    const plat = Capacitor.getPlatform()
    if (plat === 'ios' || plat === 'android') return true
  } catch {
    /* */
  }
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
 * Ruta fija `/auth/callback` solo para **web** (http/https) en Redirect URLs; nativo ≠ ver `NATIVE_OAUTH_REDIRECT_URL`.
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

/** Solo flujo web (navegador / WebView http(s)): callback explícito; nunca cadena vacía ni esquema app. */
export function buildWebOAuthRedirectToExplicit() {
  if (typeof window === 'undefined') {
    return { ok: false, error: new Error('oauth_web_requires_window'), href: null }
  }
  const href = resolveWebOAuthRedirectTo({
    windowOrigin: window.location.origin,
    hostname: window.location.hostname,
    isProd: isViteProd,
    devLanOrigin: String(viteEnv.VITE_DEV_LAN_ORIGIN ?? ''),
  }).trim()
  if (!href) {
    return { ok: false, error: new Error('oauth_web_redirect_empty'), href: null }
  }
  let u
  try {
    u = new URL(href)
  } catch {
    return { ok: false, error: new Error('oauth_web_redirect_invalid_url'), href: null }
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return {
      ok: false,
      error: new Error('oauth_web_redirect_must_be_http_https'),
      href: null,
    }
  }
  const pathNorm = (u.pathname || '/').replace(/\/$/, '') || '/'
  if (pathNorm !== '/auth/callback') {
    return { ok: false, error: new Error('oauth_web_redirect_path_must_be_auth_callback'), href: null }
  }
  return { ok: true, error: null, href }
}

function normalizeRedirectToParam(s) {
  if (s == null || s === '') return ''
  try {
    return decodeURIComponent(String(s)).trim()
  } catch {
    return String(s).trim()
  }
}

/** Compara `redirect_to` decodificado con la URL nativa acordada (misma lógica que `isNativeOAuthCallbackUrl`, sin exigir query). */
function nativeOAuthRedirectToParamMatchesExpected(decodedRedirectTo) {
  const got = String(decodedRedirectTo || '').trim()
  if (!got) return false
  try {
    const actual = new URL(got)
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
    return got === NATIVE_OAUTH_REDIRECT_URL
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
 * Única URL de retorno OAuth nativo iOS/Android; debe ser **idéntica** a la entrada en Supabase → Redirect URLs
 * (`es.waitme.v5waitme://auth-callback`, host `auth-callback` — no usar `…/auth/callback`).
 * Coincide con CFBundleURLSchemes (`es.waitme.v5waitme`) y `redirectTo` en signInWithOAuth.
 */
export const NATIVE_OAUTH_REDIRECT_URL = 'es.waitme.v5waitme://auth-callback'

/** Diagnóstico OAuth solo en desarrollo (Vite `import.meta.env.DEV`); sin ruido en builds de producción. */
export function oauthDiagLog(phase, payload) {
  if (typeof import.meta !== 'undefined' && import.meta.env != null && import.meta.env.DEV !== true) {
    return
  }
  try {
    console.info(`[WaitMe][OAuth][diag] ${phase}`, payload)
  } catch {
    /* */
  }
}

/**
 * Trazas OAuth estructuradas en DEV (`oauth_trace/…`): una fase = un objeto.
 * @param {string} phase p. ej. `1_pre_google`, `2_authorize_url`, `3_open`, `4_plugin_callback`, `5_exchange`
 * @param {Record<string, unknown>} payload
 */
export function oauthRuntimeTrace(phase, payload) {
  oauthDiagLog(`oauth_trace/${phase}`, payload)
}

/**
 * Extrae parámetros relevantes de la URL `/authorize` devuelta por `signInWithOAuth` (auditoría runtime).
 * @param {string} authorizeUrl
 * @returns {Record<string, unknown>}
 */
export function parseSupabaseAuthorizeUrlDiagnostics(authorizeUrl) {
  if (!authorizeUrl || typeof authorizeUrl !== 'string') {
    return { error: 'empty_authorize_url' }
  }
  try {
    const u = new URL(authorizeUrl)
    const redirectTo = u.searchParams.get('redirect_to')
    const hostLower = u.hostname.toLowerCase()
    const authorizeHostLooksLikeLoopback =
      hostLower === 'localhost' ||
      hostLower === '127.0.0.1' ||
      hostLower === '[::1]' ||
      hostLower === '0.0.0.0'
    return {
      authorizeUrl,
      host: u.hostname,
      authorizeHostLooksLikeLoopback,
      redirectToEncoded: redirectTo,
      redirectToDecoded: redirectTo ? (() => {
        try {
          return decodeURIComponent(redirectTo)
        } catch {
          return redirectTo
        }
      })() : null,
      codeChallenge: u.searchParams.get('code_challenge'),
      codeChallengeMethod: u.searchParams.get('code_challenge_method'),
      state: u.searchParams.get('state'),
      skipHttpRedirect: u.searchParams.get('skip_http_redirect'),
      provider: u.searchParams.get('provider'),
      hasLocalhostInRedirect: (() => {
        if (typeof redirectTo !== 'string') return false
        try {
          return /localhost|127\.0\.0\.1/i.test(decodeURIComponent(redirectTo))
        } catch {
          return /localhost|127\.0\.0\.1/i.test(redirectTo)
        }
      })(),
    }
  } catch (e) {
    return { authorizeUrl, parseError: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * Bump al publicar cambios OAuth iOS; referenciado en el retorno de signInWithGoogle
 * para que el hash del chunk principal cambie (evita “misma build” sin cambios de bytes).
 */
export const OAUTH_IOS_BUNDLE_ID = 'waitme-oauth-ios-2026-04-12g'

/**
 * True si la URL es el redirect nativo acordado (scheme + host `auth-callback`).
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
    let host = ''
    try {
      host = new URL(urlString).hostname
    } catch {
      /* */
    }
    const u = new URL(urlString)
    let code = u.searchParams.get('code')
    if (!code && u.hash) {
      const h = new URLSearchParams(u.hash.replace(/^#/, ''))
      code = h.get('code')
    }
    if (!code) {
      oauthRuntimeTrace('5_exchange', {
        step: 'no_pkce_code_in_url',
        urlString,
        hostname: host,
      })
      return { session: null, error: null }
    }
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('[WaitMe][Auth] exchangeCodeForSession', error.message ?? error)
      oauthRuntimeTrace('5_exchange', {
        step: 'exchangeCodeForSession_error',
        message: error.message ?? String(error),
      })
      return { session: null, error }
    }
    const {
      data: { session: refreshed },
      error: refreshErr,
    } = await supabase.auth.getSession()
    if (refreshErr) return { session: data?.session ?? null, error: null }
    const session = refreshed ?? data?.session ?? null
    oauthRuntimeTrace('5_exchange', {
      step: 'ok',
      userId: session?.user?.id ?? null,
      hasSession: Boolean(session?.user),
    })
    return { session, error: null }
  } catch (e) {
    oauthRuntimeTrace('5_exchange', {
      step: 'exception',
      message: e instanceof Error ? e.message : String(e),
    })
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
     * Nativo: un único string; web: http(s) explícito vía `buildWebOAuthRedirectToExplicit` (nunca `redirectTo` vacío:
     * si faltara, GoTrue omitiría `redirect_to` y Supabase usaría Site URL).
     */
    const redirectTo = useNativeOAuth
      ? NATIVE_OAUTH_REDIRECT_URL
      : (() => {
          const w = buildWebOAuthRedirectToExplicit()
          if (!w.ok || !w.href) {
            throw w.error ?? new Error('oauth_web_redirect_unavailable')
          }
          return w.href
        })()
    let capPlatform = 'unknown'
    try {
      capPlatform = Capacitor.getPlatform()
    } catch {
      /* */
    }
    const capIsNativePlatform = (() => {
      try {
        return Capacitor.isNativePlatform()
      } catch {
        return null
      }
    })()
    const oauthOptions = useNativeOAuth
      ? {
          redirectTo: NATIVE_OAUTH_REDIRECT_URL,
          skipBrowserRedirect: true,
          queryParams: { skip_http_redirect: 'true' },
        }
      : {
          redirectTo,
          skipBrowserRedirect: false,
        }
    oauthRuntimeTrace('1_pre_google', {
      branch: useNativeOAuth ? 'native' : 'web',
      capPlatform,
      capIsNativePlatform,
      redirectToExact: redirectTo,
      skipBrowserRedirect: oauthOptions.skipBrowserRedirect,
      skipHttpRedirectQuery: useNativeOAuth ? 'true' : undefined,
      queryParams: oauthOptions.queryParams,
      provider: 'google',
      oauthOptionsPassedToSDK: oauthOptions,
      windowLocationHref: typeof window !== 'undefined' ? window.location?.href : null,
      note:
        'GoTrue _handleProviderSignIn: isBrowser() && !skipBrowserRedirect → window.location.assign(authorizeUrl)',
    })
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: oauthOptions,
    })
    if (error) {
      console.error('[WaitMe][Auth] signInWithGoogle', error.message, error)
      return { data: null, error }
    }
    if (useNativeOAuth && !data?.url) {
      const err = new Error(
        'oauth_native_missing_authorize_url: signInWithOAuth no devolvió URL de autorización.'
      )
      console.error('[WaitMe][Auth]', err.message)
      return { data: null, error: err }
    }
    if (useNativeOAuth && data?.url) {
      const oauthOpenUrl = String(data.url).trim()
      const parsedAuth = parseSupabaseAuthorizeUrlDiagnostics(oauthOpenUrl)
      oauthRuntimeTrace('2_authorize_url', parsedAuth)
      const gotRedirect = normalizeRedirectToParam(parsedAuth.redirectToEncoded ?? '')
      if (!gotRedirect) {
        const err = new Error(
          'oauth_authorize_missing_redirect_to: Supabase podría estar usando Site URL; revisa Redirect URLs y proyecto.'
        )
        console.error('[WaitMe][Auth]', err.message)
        return { data: null, error: err }
      }
      if (!nativeOAuthRedirectToParamMatchesExpected(gotRedirect)) {
        const err = new Error(
          `oauth_redirect_mismatch: esperado ${NATIVE_OAUTH_REDIRECT_URL}, recibido en authorize: ${gotRedirect}`
        )
        console.error('[WaitMe][Auth]', err.message)
        return { data: null, error: err }
      }
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
        oauthRuntimeTrace('3_open', { mechanism: 'Browser.open', url: oauthOpenUrl })
        await Browser.open({ url: oauthOpenUrl })
      } else {
        oauthRuntimeTrace('3_open', {
          mechanism: 'WaitmeWebAuth.start',
          url: oauthOpenUrl,
          callbackScheme: 'es.waitme.v5waitme',
        })
        const { callbackUrl } = await WaitmeWebAuth.start({
          url: oauthOpenUrl,
          callbackScheme: 'es.waitme.v5waitme',
        })
        oauthRuntimeTrace('4_plugin_callback', { callbackUrl })
        const { session: iosSession, error: iosExErr } = await exchangeSessionFromOAuthUrl(callbackUrl)
        if (iosExErr) {
          console.error('[WaitMe][Auth] iOS OAuth tras callback', iosExErr.message ?? iosExErr)
          oauthRuntimeTrace('6_ios_path', { step: 'exchange_failed', message: String(iosExErr.message ?? iosExErr) })
          return { data: null, error: iosExErr }
        }
        if (!iosSession?.user) {
          oauthRuntimeTrace('6_ios_path', { step: 'session_missing_after_exchange' })
          return { data: null, error: new Error('oauth_session_missing') }
        }
        const { data: verifyGs } = await supabase.auth.getSession()
        oauthRuntimeTrace('6_ios_path', {
          step: 'exchange_ok',
          userId: iosSession.user.id,
          getSessionHasUser: Boolean(verifyGs?.session?.user?.id),
        })
      }
    } else if (!useNativeOAuth && data?.url) {
      oauthRuntimeTrace('2_authorize_url_web_branch', {
        ...parseSupabaseAuthorizeUrlDiagnostics(String(data.url)),
        note: 'GoTrue puede hacer window.location.assign si skipBrowserRedirect es false',
      })
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
