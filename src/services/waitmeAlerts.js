/**
 * @fileoverview Historial de alertas / reservas en `waitme_parking_alerts`.
 * En desarrollo o si faltan tablas (PGRST205), datos coherentes en memoria sin romper el shape real.
 */
import { supabase, isSupabaseConfigured } from './supabase.js'
import { isRealSupabaseAuthUid } from './authUid.js'

/** @returns {boolean} */
function devFallbackAllowed() {
  try {
    return typeof import.meta !== 'undefined' && import.meta.env?.DEV === true
  } catch {
    return false
  }
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
export function isMissingWaitmeTableError(error) {
  if (!error || typeof error !== 'object') return false
  const e = /** @type {{ code?: string, message?: string }} */ (error)
  const code = String(e.code ?? '')
  const msg = String(e.message ?? '')
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    /Could not find the table|schema cache|relation .+ does not exist/i.test(msg)
  )
}

let _alertsBackendRealOk = true
let _alertsDevFallbackActive = false

/** Estado tras el último fetch de alertas (solo diagnóstico / informes). */
export function getWaitmeAlertsBackendState() {
  return { backendRealOk: _alertsBackendRealOk, devFallbackActive: _alertsDevFallbackActive }
}

/**
 * @param {string} ownerId
 * @param {'parking_alert' | 'reservation'} listingType
 * @returns {Record<string, unknown>[]}
 */
function buildDevFallbackAlertRows(ownerId, listingType) {
  if (listingType === 'reservation') return []
  const now = Date.now()
  const iso = (ms) => new Date(ms).toISOString()
  const peerA = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001'
  const peerB = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000002'
  return [
    {
      id: 'fb-waitme-alert-1',
      owner_id: ownerId,
      listing_type: 'parking_alert',
      status: 'active',
      peer_display_name: 'Sofía',
      peer_rating: 5,
      brand: 'Peugeot',
      model: '208',
      plate: '3489 KHT',
      price: 6,
      latitude: 43.3614,
      longitude: -5.8493,
      address: 'Calle Gascona, Oviedo',
      available_in_minutes: 12,
      wait_until: iso(now + 12 * 60 * 1000),
      user_photo: null,
      vehicle_color: 'gris',
      vehicle_type: 'car',
      phone: null,
      allow_phone_calls: false,
      is_incoming_request: false,
      peer_user_id: peerA,
      created_at: iso(now - 3600000),
      updated_at: iso(now - 3600000),
    },
    {
      id: 'fb-waitme-alert-2',
      owner_id: ownerId,
      listing_type: 'parking_alert',
      status: 'active',
      peer_display_name: 'Marcos',
      peer_rating: 4,
      brand: 'Hyundai',
      model: 'i20',
      plate: '7821 LMN',
      price: 4,
      latitude: 43.5322,
      longitude: -5.6611,
      address: 'Plaza Mayor, Gijón',
      available_in_minutes: 22,
      wait_until: iso(now + 22 * 60 * 1000),
      user_photo: null,
      vehicle_color: 'azul',
      vehicle_type: 'car',
      phone: null,
      allow_phone_calls: false,
      is_incoming_request: false,
      peer_user_id: peerB,
      created_at: iso(now - 7200000),
      updated_at: iso(now - 7200000),
    },
    {
      id: 'fb-waitme-alert-done',
      owner_id: ownerId,
      listing_type: 'parking_alert',
      status: 'completed',
      peer_display_name: 'Elena',
      peer_rating: 5,
      brand: 'Fiat',
      model: '500',
      plate: '1100 ABC',
      price: 5,
      latitude: 43.5453,
      longitude: -5.9229,
      address: 'Calle Palacio Valdés, Avilés',
      available_in_minutes: 0,
      wait_until: iso(now - 86400000),
      user_photo: null,
      vehicle_color: 'blanco',
      vehicle_type: 'car',
      phone: null,
      allow_phone_calls: false,
      is_incoming_request: false,
      peer_user_id: null,
      created_at: iso(now - 172800000),
      updated_at: iso(now - 86400000),
    },
  ]
}

/**
 * @param {Record<string, unknown>} row
 * @param {{ clearTimers?: boolean }} [options]
 */
export function parkingAlertRowToCard(row, options) {
  const clearTimers = options?.clearTimers === true
  const r = row && typeof row === 'object' ? row : {}
  const rowId = typeof r.id === 'string' ? r.id : ''
  const peerId = typeof r.peer_user_id === 'string' ? r.peer_user_id : ''
  /** `id` = únicamente usuario (peer). Nunca id de fila de alerta. */
  const id = peerId
  const avail = r.available_in_minutes
  const waitUntil = r.wait_until
  const displayName = String(r.peer_display_name ?? '').trim() || 'Usuario'
  return {
    id,
    alertId: rowId,
    name: displayName,
    user_name: displayName,
    rating: Number(r.peer_rating ?? 4),
    brand: r.brand ?? '',
    model: r.model ?? '',
    plate: r.plate ?? '',
    price: Number(r.price ?? 0),
    latitude: r.latitude != null ? Number(r.latitude) : 43.36234,
    longitude: r.longitude != null ? Number(r.longitude) : -5.84998,
    user_photo: r.user_photo ?? null,
    color: r.vehicle_color ?? 'gris',
    vehicleType: r.vehicle_type ?? 'car',
    address: String(r.address ?? '').trim() || '—',
    available_in_minutes: clearTimers ? null : avail != null ? Number(avail) : null,
    wait_until: clearTimers ? null : typeof waitUntil === 'string' ? waitUntil : null,
    created_date: r.created_at ? new Date(String(r.created_at)).getTime() : Date.now(),
    phone: r.phone ?? null,
    allow_phone_calls: Boolean(r.allow_phone_calls),
    isIncomingRequest: Boolean(r.is_incoming_request),
    peer_user_id: typeof r.peer_user_id === 'string' ? r.peer_user_id : null,
    user_id: typeof r.peer_user_id === 'string' ? r.peer_user_id : null,
  }
}

/**
 * @param {{ userId: string, listingScope: 'alerts' | 'reservations' }} p
 * @returns {Promise<{ data: Record<string, unknown>[] | null, error: Error | null, usedDevFallback: boolean }>}
 */
export async function fetchParkingAlertsForUser(p) {
  const dev = devFallbackAllowed()
  const listingType = p.listingScope === 'reservations' ? 'reservation' : 'parking_alert'
  const ownerForFallback =
    isRealSupabaseAuthUid(p.userId) ? p.userId : '00000000-0000-4000-8000-0000000000fb'

  const applyFallbackRows = () => {
    _alertsBackendRealOk = false
    _alertsDevFallbackActive = true
    return {
      data: buildDevFallbackAlertRows(ownerForFallback, listingType),
      error: null,
      usedDevFallback: true,
    }
  }

  const applyRealSuccess = (data) => {
    _alertsBackendRealOk = true
    _alertsDevFallbackActive = false
    return {
      data: Array.isArray(data) ? data : [],
      error: null,
      usedDevFallback: false,
    }
  }

  const applyRealFailure = (err) => {
    _alertsBackendRealOk = false
    _alertsDevFallbackActive = false
    return { data: null, error: err, usedDevFallback: false }
  }

  if (!isSupabaseConfigured() || !supabase) {
    if (dev) return applyFallbackRows()
    _alertsBackendRealOk = false
    _alertsDevFallbackActive = false
    return { data: [], error: null, usedDevFallback: false }
  }

  if (!isRealSupabaseAuthUid(p.userId)) {
    if (dev) return applyFallbackRows()
    _alertsBackendRealOk = false
    _alertsDevFallbackActive = false
    return { data: [], error: null, usedDevFallback: false }
  }

  const { data, error } = await supabase
    .from('waitme_parking_alerts')
    .select('*')
    .eq('owner_id', p.userId)
    .eq('listing_type', listingType)
    .order('created_at', { ascending: false })

  if (!error) {
    return applyRealSuccess(data)
  }

  console.error('[WaitMe][Alerts]', error.message, error)

  if (dev && isMissingWaitmeTableError(error)) {
    return applyFallbackRows()
  }

  return applyRealFailure(new Error(error.message))
}
