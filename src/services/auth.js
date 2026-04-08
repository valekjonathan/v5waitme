/**
 * @fileoverview Sesión Supabase: OAuth, getSession, signOut. Sin Supabase configurado, operaciones son no-op seguras.
 */
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import {
  armNativeOAuthReturnWatch,
  deliverNativeOAuthCallback,
} from '../lib/nativeOAuthDeepLink.js'
import { WaitmeWebAuth } from '../plugins/waitmeWebAuth.js'
import { supabase, isSupabaseConfigured } from './supabase.js'

/** Único redirect PKCE en iOS/Android nativo; debe estar en Supabase Auth → Redirect URLs. */
export const NATIVE_OAUTH_REDIRECT_URL = 'capacitor://localhost'

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
  console.log('[Auth] signInWithGoogle llamada')
  console.log('[Auth] platform:', Capacitor.getPlatform())
  console.log('[Auth] isNative:', Capacitor.isNativePlatform())
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('supabase_not_configured') }
  }
  if (!supabase) {
    return { data: null, error: new Error('supabase_not_configured') }
  }
  try {
    if (Capacitor.isNativePlatform()) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: NATIVE_OAUTH_REDIRECT_URL,
          skipBrowserRedirect: true,
        },
      })
      if (error) {
        console.error('[WaitMe][Auth] signInWithGoogle', error.message, error)
        return { data: null, error }
      }
      if (!data?.url) {
        console.error('[WaitMe][Auth] signInWithGoogle nativo: respuesta OAuth sin url')
        return { data: null, error: new Error('oauth_no_url') }
      }

      if (Capacitor.getPlatform() === 'ios') {
        try {
          console.log('[OAuth][iOS] URL enviada a WebAuth:', data.url)
          const res = await WaitmeWebAuth.start({
            url: data.url,
            /** Debe coincidir con el scheme de `NATIVE_OAUTH_REDIRECT_URL` (capacitor://…). */
            callbackScheme: 'capacitor',
          })
          console.log('[OAuth][iOS] respuesta plugin:', res)
          const callbackUrl = res?.callbackUrl
          console.log('[OAuth][iOS] callbackUrl:', callbackUrl)
          if (!callbackUrl) {
            return { data: null, error: new Error('oauth_no_callback_url') }
          }
          const ok = await deliverNativeOAuthCallback(callbackUrl, 'webAuthSession')
          if (!ok) {
            return { data: null, error: new Error('oauth_callback_failed') }
          }
          return { data, error: null }
        } catch (e) {
          const code =
            e && typeof e === 'object' && 'code' in e
              ? String(/** @type {{ code?: string }} */ (e).code)
              : ''
          const msg =
            e && typeof e === 'object' && 'message' in e
              ? String(/** @type {{ message?: string }} */ (e).message)
              : ''
          if (code === 'USER_CANCELED' || /canceled|cancelled/i.test(msg)) {
            return { data: null, error: null }
          }
          console.error('[WaitMe][Auth] signInWithGoogle iOS WebAuth', e)
          return { data: null, error: e instanceof Error ? e : new Error(String(e)) }
        }
      }

      console.log('[WaitMe][OAuth] in-app browser (Android u otro nativo)')
      armNativeOAuthReturnWatch()
      await Browser.open({ url: data.url })
      return { data, error: null }
    }

    /** Web (dev y prod): mismo host/puerto que la pestaña actual para no volver a Site URL (p. ej. Vercel). */
    const redirectTo =
      typeof window !== 'undefined' && window.location?.origin ? window.location.origin : ''

    console.log('LOGIN START')
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (error) {
      console.error('[WaitMe][Auth] signInWithGoogle', error.message, error)
      console.error('GOOGLE LOGIN ERROR', error)
      return { data: null, error }
    }
    return { data, error: null }
  } catch (e) {
    console.error('GOOGLE LOGIN ERROR', e)
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
