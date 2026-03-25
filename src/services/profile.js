import { supabase, isSupabaseConfigured } from './supabase.js'

/** @typedef {{ full_name: string, phone: string, brand: string, model: string, plate: string, allow_phone_calls: boolean, color: string, vehicle_type: string }} AppProfile */

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
  }
}

const PROFILE_COLUMNS = 'id,name,phone,car_brand,car_model,color,vehicle_type,plate'

/**
 * @param {string} userId - UUID de auth.users
 */
export async function getProfile(userId) {
  if (!isSupabaseConfigured()) {
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
  if (!isSupabaseConfigured()) {
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
    const { data, error } = await supabase.from('profiles').upsert(row, { onConflict: 'id' }).select().single()

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
