/**
 * Solicitudes de compra WaitMe (`waitme_purchase_requests`) + tiempo de llegada tras aceptación.
 */
import { supabase, isSupabaseConfigured } from './supabase.js'
import { isRealSupabaseAuthUid } from './authUid.js'

/** Minutos para llegar tras aceptación del vendedor (única constante central). */
export const WAITME_ARRIVAL_MINUTES = 15

/**
 * @param {string} userId
 * @returns {Promise<string>}
 */
export async function fetchProfileDisplayName(userId) {
  if (!isSupabaseConfigured() || !supabase || !userId) return 'Usuario'
  const { data } = await supabase.from('profiles').select('name').eq('id', userId).maybeSingle()
  const n = data && typeof data === 'object' ? String(/** @type {{ name?: string }} */ (data).name ?? '').trim() : ''
  return n || 'Usuario'
}

/**
 * @param {unknown} row
 */
function mapRow(row) {
  if (!row || typeof row !== 'object') return null
  const r = /** @type {Record<string, unknown>} */ (row)
  return {
    id: String(r.id ?? ''),
    buyerId: String(r.buyer_id ?? ''),
    sellerId: String(r.seller_id ?? ''),
    status: String(r.status ?? ''),
    price: Number(r.price ?? 0),
    alertSnapshot: r.alert_snapshot && typeof r.alert_snapshot === 'object' ? r.alert_snapshot : {},
    threadId: r.thread_id != null ? String(r.thread_id) : null,
    sellerLatitude: r.seller_latitude != null ? Number(r.seller_latitude) : null,
    sellerLongitude: r.seller_longitude != null ? Number(r.seller_longitude) : null,
    acceptedUntil: r.accepted_until != null ? String(r.accepted_until) : null,
    createdAt: r.created_at != null ? String(r.created_at) : '',
    updatedAt: r.updated_at != null ? String(r.updated_at) : '',
  }
}

/**
 * @param {string} buyerId
 * @param {string} sellerId
 * @param {number} price
 * @param {Record<string, unknown>} alertSnapshot
 * @returns {Promise<{ data: ReturnType<typeof mapRow> | null, error: Error | null }>}
 */
export async function insertPurchaseRequest(buyerId, sellerId, price, alertSnapshot) {
  if (!isSupabaseConfigured() || !supabase || !isRealSupabaseAuthUid(buyerId)) {
    return { data: null, error: new Error('not_configured') }
  }
  const sid = String(sellerId ?? '').trim()
  if (!isRealSupabaseAuthUid(sid)) {
    return {
      data: null,
      error: new Error('El vendedor no es un usuario real (UUID); no uses perfiles simulados.'),
    }
  }
  const snap = alertSnapshot && typeof alertSnapshot === 'object' ? alertSnapshot : {}
  const { data, error } = await supabase
    .from('waitme_purchase_requests')
    .insert({
      buyer_id: buyerId,
      seller_id: sid,
      status: 'pending',
      price,
      alert_id: null,
      alert_snapshot: snap,
    })
    .select('*')
    .single()

  if (error) {
    console.error('[WaitMe][Purchase] insert', error.message, error)
    return { data: null, error: new Error(error.message) }
  }
  return { data: mapRow(data), error: null }
}

/**
 * @param {string} requestId
 * @param {string} threadId
 */
export async function updatePurchaseThreadId(requestId, threadId) {
  if (!isSupabaseConfigured() || !supabase) return { error: new Error('not_configured') }
  const { error } = await supabase
    .from('waitme_purchase_requests')
    .update({ thread_id: threadId })
    .eq('id', requestId)
  return { error: error ? new Error(error.message) : null }
}

/**
 * Vendedor acepta o rechaza.
 * @param {string} sellerId
 * @param {string} requestId
 * @param {'accepted' | 'rejected'} decision
 * @param {{ lat: number, lng: number } | null} sellerLocation
 */
export async function respondPurchaseRequest(sellerId, requestId, decision, sellerLocation) {
  if (!isSupabaseConfigured() || !supabase || !isRealSupabaseAuthUid(sellerId)) {
    return { data: null, error: new Error('not_configured') }
  }
  const now = new Date()
  const acceptedUntil =
    decision === 'accepted' ? new Date(now.getTime() + WAITME_ARRIVAL_MINUTES * 60 * 1000) : null
  const patch = {
    status: decision,
    accepted_until: acceptedUntil ? acceptedUntil.toISOString() : null,
    seller_latitude:
      decision === 'accepted' && sellerLocation && Number.isFinite(sellerLocation.lat)
        ? sellerLocation.lat
        : null,
    seller_longitude:
      decision === 'accepted' && sellerLocation && Number.isFinite(sellerLocation.lng)
        ? sellerLocation.lng
        : null,
  }
  const { data, error } = await supabase
    .from('waitme_purchase_requests')
    .update(patch)
    .eq('id', requestId)
    .eq('seller_id', sellerId)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle()

  if (error) {
    console.error('[WaitMe][Purchase] respond', error.message, error)
    return { data: null, error: new Error(error.message) }
  }
  return { data: mapRow(data), error: null }
}

/**
 * @param {string} userId
 */
export async function fetchPendingPurchaseForSeller(userId) {
  if (!isSupabaseConfigured() || !supabase) return { data: null, error: new Error('not_configured') }
  const { data, error } = await supabase
    .from('waitme_purchase_requests')
    .select('*')
    .eq('seller_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return { data: null, error: new Error(error.message) }
  return { data: mapRow(data), error: null }
}

/**
 * Solicitud pendiente entre comprador y vendedor (evita duplicar inserts / mensajes).
 * @param {string} buyerId
 * @param {string} sellerId
 */
export async function fetchPendingPurchaseForBuyerSeller(buyerId, sellerId) {
  if (!isSupabaseConfigured() || !supabase) return { data: null, error: new Error('not_configured') }
  const b = String(buyerId ?? '').trim()
  const s = String(sellerId ?? '').trim()
  if (!b || !s) return { data: null, error: new Error('invalid_ids') }
  const { data, error } = await supabase
    .from('waitme_purchase_requests')
    .select('*')
    .eq('buyer_id', b)
    .eq('seller_id', s)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return { data: null, error: new Error(error.message) }
  return { data: mapRow(data), error: null }
}

/**
 * @param {string} userId
 */
export async function fetchBuyerActiveAccepted(userId) {
  if (!isSupabaseConfigured() || !supabase) return { data: [], error: null }
  const { data, error } = await supabase
    .from('waitme_purchase_requests')
    .select('*')
    .eq('buyer_id', userId)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false })
  if (error) return { data: [], error: new Error(error.message) }
  const rows = Array.isArray(data) ? data : []
  const now = Date.now()
  return {
    data: rows
      .map(mapRow)
      .filter((r) => {
        if (!r || !r.acceptedUntil) return false
        const t = Date.parse(r.acceptedUntil)
        return Number.isFinite(t) && t > now
      }),
    error: null,
  }
}

/**
 * Marca expiradas las aceptadas cuyo plazo pasó (solo filas del comprador).
 * @param {string} buyerId
 */
export async function expireStaleAcceptedForBuyer(buyerId) {
  if (!isSupabaseConfigured() || !supabase) return
  const { data: rows } = await supabase
    .from('waitme_purchase_requests')
    .select('id, accepted_until')
    .eq('buyer_id', buyerId)
    .eq('status', 'accepted')
  const list = Array.isArray(rows) ? rows : []
  const now = Date.now()
  for (const r of list) {
    const id = r && typeof r === 'object' ? String(/** @type {{ id?: string }} */ (r).id ?? '') : ''
    const au =
      r && typeof r === 'object' && r.accepted_until != null
        ? Date.parse(String(/** @type {{ accepted_until?: string }} */ (r).accepted_until))
        : NaN
    if (id && Number.isFinite(au) && au <= now) {
      await supabase
        .from('waitme_purchase_requests')
        .update({ status: 'expired' })
        .eq('id', id)
        .eq('buyer_id', buyerId)
    }
  }
}

/**
 * Suscripción Realtime a filas donde el usuario es comprador o vendedor.
 * @param {string} userId
 * @param {(row: ReturnType<typeof mapRow> | null, event: 'INSERT' | 'UPDATE' | 'DELETE') => void} onEvent
 * @returns {() => void} unsubscribe
 */
export function subscribePurchaseRequests(userId, onEvent) {
  if (!isSupabaseConfigured() || !supabase || !userId) {
    return () => {}
  }
  const channel = supabase
    .channel(`waitme-purchase-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'waitme_purchase_requests',
        filter: `buyer_id=eq.${userId}`,
      },
      (payload) => {
        const row =
          payload.eventType === 'DELETE'
            ? mapRow(/** @type {unknown} */ (payload.old))
            : mapRow(/** @type {unknown} */ (payload.new))
        onEvent(row, payload.eventType)
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'waitme_purchase_requests',
        filter: `seller_id=eq.${userId}`,
      },
      (payload) => {
        const row =
          payload.eventType === 'DELETE'
            ? mapRow(/** @type {unknown} */ (payload.old))
            : mapRow(/** @type {unknown} */ (payload.new))
        onEvent(row, payload.eventType)
      }
    )
    .subscribe()

  return () => {
    try {
      void supabase.removeChannel(channel)
    } catch {
      /* */
    }
  }
}
