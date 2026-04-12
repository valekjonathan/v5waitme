/**
 * @fileoverview Sesión Supabase: OAuth, getSession, signOut. Sin Supabase configurado, operaciones son no-op seguras.
 */
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { supabase, isSupabaseConfigured } from './supabase.js'

/**
 * Debe coincidir con CFBundleURLSchemes y con `redirectTo` en signInWithOAuth (iOS).
 * Añadir la misma URL en Supabase Auth → Redirect URLs.
 */
export const NATIVE_OAUTH_REDIRECT_URL = 'es.waitme.v5waitme://auth/callback'

/** Indica si la URL trae código PKCE (query; hash por compatibilidad). */
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
    if (error) return { session: null, error }
    const {
      data: { session: refreshed },
      error: refreshErr,
    } = await supabase.auth.getSession()
    if (refreshErr) return { session: data?.session ?? null, error: null }
    return { session: refreshed ?? data?.session ?? null, error: null }
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
    const isNative =
      typeof window !== 'undefined' && Capacitor.isNativePlatform()
    /**
     * iOS: `skipBrowserRedirect: true` evita el redirect del WebView (Safari externo / pantalla en blanco).
     * La URL OAuth se abre con @capacitor/browser; el retorno es por deep link + appUrlOpen.
     * Web: redirect normal en la misma ventana (`skipBrowserRedirect` false).
     */
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: isNative
          ? 'es.waitme.v5waitme://auth/callback'
          : window.location.origin,
        skipBrowserRedirect: isNative,
      },
    })
    if (error) {
      console.error('[WaitMe][Auth] signInWithGoogle', error.message, error)
      return { data: null, error }
    }
    if (isNative && data?.url) {
      await Browser.open({ url: data.url })
    }
    return { data, error: null }
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
