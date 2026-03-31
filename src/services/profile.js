/**
 * @fileoverview CRUD perfil Supabase + reglas de completitud (`AppProfile`).
 */
import { supabase, isSupabaseConfigured } from './supabase.js'

/**
 * @typedef {{
 *   full_name: string,
 *   phone: string,
 *   brand: string,
 *   model: string,
 *   plate: string,
 *   allow_phone_calls: boolean,
 *   color: string,
 *   vehicle_type: string,
 *   email?: string,
 *   avatar_url?: string,
 * }} AppProfile
 */

export const PROFILE_INCOMPLETE_MESSAGE = 'Completa tu perfil para usar la app'

/**
 * Perfil mínimo usable para alertas / flujo de aparcamiento.
 */
export function isAppProfileComplete(p) {
  if (!p) return false
  if (String(p.full_name ?? '').trim().length === 0) return false
  const phone = String(p.phone ?? '').replace(/\s/g, '')
  if (phone.length < 6) return false
  const brand = String(p.brand ?? '').trim()
  const model = String(p.model ?? '').trim()
  const plate = String(p.plate ?? '').replace(/\s/g, '')
  if (!brand || !model || plate.length < 4) return false
  return true
}

/** Alias explícito para gating de Login / Auth (misma regla que perfil completo en app). */
export function checkProfileComplete(profile) {
  return isAppProfileComplete(profile)
}

/** Estado vacío del formulario / cabecera (misma forma que `rowToAppProfile`). */
export const EMPTY_APP_PROFILE = {
  full_name: '',
  phone: '',
  brand: '',
  model: '',
  plate: '',
  allow_phone_calls: false,
  color: 'negro',
  vehicle_type: 'car',
  email: '',
  avatar_url: '',
}

/**
 * Objeto único para `ProfileHeader`: perfil (local/servidor) + fallback de sesión en nombre, email y avatar.
 * Avatar: metadata y, si hace falta, identidades OAuth (picture / avatar_url).
 * @param {Record<string, unknown> | null | undefined} profile
 * @param {{ user_metadata?: object, email?: string, identities?: unknown[] } | null | undefined} sessionUser
 */
export function buildResolvedHeaderProfile(profile, sessionUser) {
  const p = profile && typeof profile === 'object' ? profile : {}
  const meta =
    sessionUser?.user_metadata && typeof sessionUser.user_metadata === 'object'
      ? sessionUser.user_metadata
      : {}

  let avatarFromIds = ''
  const ids = Array.isArray(sessionUser?.identities) ? sessionUser.identities : []
  for (const row of ids) {
    const d = row?.identity_data && typeof row.identity_data === 'object' ? row.identity_data : {}
    const u =
      (typeof d.avatar_url === 'string' && d.avatar_url.trim()) ||
      (typeof d.picture === 'string' && d.picture.trim()) ||
      ''
    if (u) {
      avatarFromIds = u
      break
    }
  }

  const sessionAvatar =
    (typeof meta.avatar_url === 'string' && meta.avatar_url.trim()) ||
    (typeof meta.picture === 'string' && meta.picture.trim()) ||
    avatarFromIds

  const sessionName =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    ''

  const sessionEmail = typeof sessionUser?.email === 'string' ? sessionUser.email : ''

  return {
    ...EMPTY_APP_PROFILE,
    ...p,
    full_name: String(p.full_name ?? '').trim() || sessionName,
    email: String(p.email ?? '').trim() || sessionEmail,
    avatar_url: String(p.avatar_url ?? '').trim() || sessionAvatar,
  }
}

/**
 * Primera palabra del nombre para cabecera y campo nombre (máx. 10 caracteres).
 * @param {unknown} fullName
 */
export function profileDisplayFirstName(fullName) {
  const raw = String(fullName ?? '').trim()
  const firstWord = raw.split(' ')[0] ?? ''
  return firstWord.length > 10 ? firstWord.slice(0, 10) : firstWord
}

/** Estado inicial del formulario / semilla offline (una sola entrada; usa `buildResolvedHeaderProfile` internamente). */
export function seedProfileStateFromSession(sessionUser) {
  return buildResolvedHeaderProfile(null, sessionUser ?? null)
}

/**
 * Fila `profiles` → estado del formulario (allow_phone_calls no está en BD).
 */
export function rowToAppProfile(row) {
  if (!row) return null
  return {
    full_name: row.name ?? '',
    phone: row.phone ?? '',
    brand: row.car_brand ?? '',
    model: row.car_model ?? '',
    plate: row.plate ?? '',
    allow_phone_calls: false,
    color: row.color ?? 'negro',
    vehicle_type: row.vehicle_type ?? 'car',
    email: row.email ?? '',
    avatar_url: row.avatar_url ?? '',
  }
}

function appToRow(userId, p) {
  return {
    id: userId,
    name: p.full_name ?? '',
    phone: p.phone ?? '',
    car_brand: p.brand ?? '',
    car_model: p.model ?? '',
    color: p.color ?? '',
    vehicle_type: p.vehicle_type ?? 'car',
    plate: p.plate ?? '',
    email: p.email ?? '',
    avatar_url: p.avatar_url ?? '',
  }
}

const PROFILE_COLUMNS =
  'id,name,phone,car_brand,car_model,color,vehicle_type,plate,avatar_url,email'

/**
 * Tras OAuth: asegura fila en `profiles` y devuelve si es alta nueva.
 * @param {{ id: string, email?: string, user_metadata?: Record<string, unknown> }} user
 */
export async function ensureProfileForOAuthUser(user) {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      data: null,
      isNewUser: false,
      isProfileComplete: true,
      error: null,
    }
  }
  if (!user?.id) {
    return {
      data: null,
      isNewUser: false,
      isProfileComplete: true,
      error: new Error('missing_user_id'),
    }
  }

  try {
    const { data: existing, error: selErr } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', user.id)
      .maybeSingle()

    if (selErr) {
      console.error('[WaitMe][Profile] ensureProfile select', selErr.message, selErr)
      return {
        data: null,
        isNewUser: false,
        isProfileComplete: true,
        error: selErr,
      }
    }

    if (existing) {
      const app = rowToAppProfile(existing)
      return {
        data: app,
        isNewUser: false,
        isProfileComplete: isAppProfileComplete(app),
        error: null,
      }
    }

    const meta =
      user.user_metadata && typeof user.user_metadata === 'object' ? user.user_metadata : {}
    const fullName =
      (typeof meta.full_name === 'string' && meta.full_name) ||
      (typeof meta.name === 'string' && meta.name) ||
      (typeof user.email === 'string' && user.email.includes('@')
        ? user.email.split('@')[0]
        : '') ||
      ''
    const avatarUrl = typeof meta.avatar_url === 'string' ? meta.avatar_url : ''
    const email = typeof user.email === 'string' ? user.email : ''

    const insertRow = {
      id: user.id,
      name: fullName,
      phone: '',
      car_brand: '',
      car_model: '',
      color: 'negro',
      vehicle_type: 'car',
      plate: '',
      avatar_url: avatarUrl || null,
      email: email || null,
    }

    const { data: inserted, error: insErr } = await supabase
      .from('profiles')
      .insert(insertRow)
      .select(PROFILE_COLUMNS)
      .single()

    if (insErr) {
      console.error('[WaitMe][Profile] ensureProfile insert', insErr.message, insErr)
      return {
        data: null,
        isNewUser: false,
        isProfileComplete: true,
        error: insErr,
      }
    }

    const app = rowToAppProfile(inserted)
    return {
      data: app,
      isNewUser: true,
      isProfileComplete: isAppProfileComplete(app),
      error: null,
    }
  } catch (e) {
    console.error('[WaitMe][Profile] ensureProfile excepción', e)
    return {
      data: null,
      isNewUser: false,
      isProfileComplete: true,
      error: e,
    }
  }
}

/**
 * @param {string} userId - UUID de auth.users
 */
export async function getProfile(userId) {
  if (!isSupabaseConfigured() || !supabase) {
    console.warn('[WaitMe][Profile] Supabase no configurado; getProfile omitido.')
    return { data: null, error: null }
  }
  if (!userId) {
    console.warn('[WaitMe][Profile] getProfile sin userId')
    return { data: null, error: null }
  }
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('[WaitMe][Profile] getProfile', error.message, error)
      return { data: null, error }
    }
    return { data: rowToAppProfile(data), error: null }
  } catch (e) {
    console.error('[WaitMe][Profile] getProfile excepción', e)
    return { data: null, error: e }
  }
}

/**
 * @param {string} userId
 * @param {AppProfile} profile
 */
export async function updateProfile(userId, profile) {
  if (!isSupabaseConfigured() || !supabase) {
    console.warn('[WaitMe][Profile] Supabase no configurado; updateProfile omitido.')
    return { data: null, error: new Error('supabase_not_configured') }
  }
  if (!userId) {
    const err = new Error('missing_user_id')
    console.error('[WaitMe][Profile] updateProfile', err.message)
    return { data: null, error: err }
  }
  const row = appToRow(userId, profile)
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single()

    if (error) {
      console.error('[WaitMe][Profile] updateProfile', error.message, error)
      return { data: null, error }
    }
    return { data: rowToAppProfile(data), error: null }
  } catch (e) {
    console.error('[WaitMe][Profile] updateProfile excepción', e)
    return { data: null, error: e }
  }
}
