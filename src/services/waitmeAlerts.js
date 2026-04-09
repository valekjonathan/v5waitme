/**
 * @fileoverview Historial de alertas / reservas en `waitme_parking_alerts`.
 */
import { supabase, isSupabaseConfigured } from './supabase.js'
import { isRealSupabaseAuthUid } from './authUid.js'

/**
 * @param {Record<string, unknown>} row
 */
export function parkingAlertRowToCard(row) {
  const r = row && typeof row === 'object' ? row : {}
  const id = typeof r.id === 'string' ? r.id : ''
  const avail = r.available_in_minutes
  const waitUntil = r.wait_until
  return {
    id,
    user_name: String(r.peer_display_name ?? '').trim() || 'Usuario',
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
    available_in_minutes: avail != null ? Number(avail) : null,
    wait_until: typeof waitUntil === 'string' ? waitUntil : null,
    created_date: r.created_at ? new Date(String(r.created_at)).getTime() : Date.now(),
    phone: r.phone ?? null,
    allow_phone_calls: Boolean(r.allow_phone_calls),
    isIncomingRequest: Boolean(r.is_incoming_request),
    peer_user_id: typeof r.peer_user_id === 'string' ? r.peer_user_id : null,
  }
}

/**
 * @param {{ userId: string, listingScope: 'alerts' | 'reservations' }} p
 * @returns {Promise<{ data: Record<string, unknown>[] | null, error: Error | null }>}
 */
export async function fetchParkingAlertsForUser(p) {
  if (!isSupabaseConfigured() || !supabase || !isRealSupabaseAuthUid(p.userId)) {
    return { data: [], error: null }
  }
  const listingType = p.listingScope === 'reservations' ? 'reservation' : 'parking_alert'
  const { data, error } = await supabase
    .from('waitme_parking_alerts')
    .select('*')
    .eq('owner_id', p.userId)
    .eq('listing_type', listingType)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[WaitMe][Alerts]', error.message, error)
    return { data: null, error: new Error(error.message) }
  }
  return { data: Array.isArray(data) ? data : [], error: null }
}
