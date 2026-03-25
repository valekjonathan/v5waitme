import { supabase, isSupabaseConfigured } from './supabase.js'

/**
 * Usuario actual validado contra el servidor Auth (preferible a getSession en cliente).
 */
export async function getCurrentUser() {
  if (!isSupabaseConfigured()) {
    console.warn('[WaitMe][Auth] Supabase no configurado; getCurrentUser omitido.')
    return null
  }
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
 * Crea sesión anónima si el proveedor está habilitado en el panel de Supabase.
 */
export async function signInAnonymously() {
  if (!isSupabaseConfigured()) {
    return { user: null, error: new Error('supabase_not_configured') }
  }
  try {
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) {
      console.error('[WaitMe][Auth] signInAnonymously', error.message, error)
      return { user: null, error }
    }
    return { user: data.user ?? null, error: null }
  } catch (e) {
    console.error('[WaitMe][Auth] signInAnonymously excepción', e)
    return { user: null, error: e }
  }
}

/**
 * Garantiza un usuario (existente o anónimo nuevo) para operaciones posteriores.
 */
export async function ensureAuthenticatedUser() {
  if (!isSupabaseConfigured()) {
    return { user: null, error: null }
  }
  const existing = await getCurrentUser()
  if (existing) return { user: existing, error: null }
  const { user, error } = await signInAnonymously()
  return { user, error }
}

export async function getSession() {
  if (!isSupabaseConfigured()) {
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
  try {
    const { error } = await supabase.auth.signOut()
    if (error) console.error('[WaitMe][Auth] signOut', error.message, error)
    return { error: error ?? null }
  } catch (e) {
    console.error('[WaitMe][Auth] signOut excepción', e)
    return { error: e }
  }
}
