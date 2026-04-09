/**
 * @fileoverview Hilos DM (`waitme_dm_threads`) y mensajes (`waitme_dm_messages`).
 * Fallback de desarrollo si faltan tablas (PGRST205) o no hay cliente Supabase en DEV.
 */
import { supabase, isSupabaseConfigured } from './supabase.js'
import { isRealSupabaseAuthUid } from './authUid.js'
import { generateReviewsForEntityId, getAverage } from '../lib/reviewsModel'

/** Hilo aún sin UUID real: UI ya montada; mensajes esperan `getOrCreateDmThread`. */
export const WAITME_PENDING_THREAD_ID = '__waitme_pending_thread__'

export function isWaitmePendingThreadId(id) {
  return String(id ?? '') === WAITME_PENDING_THREAD_ID
}

const PROFILE_MIN = 'id,name,phone,car_brand,car_model,plate,avatar_url'

const FB_THREAD_1 = '11111111-1111-4111-8111-111111111111'
const FB_THREAD_2 = '22222222-2222-4222-8222-222222222222'
const FB_PEER_1 = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001'
const FB_PEER_2 = 'bbbbbbbb-bbbb-4bbb-8bbb-000000000002'

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
function isMissingWaitmeRelationError(error) {
  if (!error || typeof error !== 'object') return false
  const e = /** @type {{ code?: string, message?: string }} */ (error)
  const code = String(e.code ?? '')
  const msg = String(e.message ?? '')
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    /Could not find the table|schema cache|relation .+ does not exist|Could not find the function/i.test(
      msg
    )
  )
}

let _chatsBackendRealOk = true
let _chatsDevFallbackActive = false

export function getWaitmeChatsBackendState() {
  return { backendRealOk: _chatsBackendRealOk, devFallbackActive: _chatsDevFallbackActive }
}

/** Peer desconocido → tarjeta dinámica: `threadId` = hilo; `id` = peer UUID. */
const fallbackDynamicListCards = new Map()

/** @type {Map<string, { id: string, from: 'me' | 'them', text: string, at: string }[]>} */
const fallbackThreadMessages = new Map()

/** Tarjetas estáticas mutables (preview lista) */
let fallbackStaticListCards = []

let fallbackDmSeeded = false

function seedFallbackDmIfNeeded() {
  if (fallbackDmSeeded) return
  fallbackDmSeeded = true
  fallbackThreadMessages.set(FB_THREAD_1, [
    { id: 'fb-t1-a', from: 'them', text: '¿Sigues buscando plaza por Uría?', at: '10:02' },
    { id: 'fb-t1-b', from: 'me', text: 'Sí, estoy en la zona', at: '10:03' },
    { id: 'fb-t1-c', from: 'them', text: 'Vale, te aviso si sale algo', at: '10:04' },
  ])
  fallbackThreadMessages.set(FB_THREAD_2, [
    { id: 'fb-t2-a', from: 'them', text: 'Ya me fui del sitio', at: '09:41' },
    { id: 'fb-t2-b', from: 'me', text: 'Perfecto gracias', at: '09:42' },
    { id: 'fb-t2-c', from: 'them', text: 'Un saludo', at: '09:43' },
    { id: 'fb-t2-d', from: 'me', text: 'Igualmente', at: '09:44' },
  ])
  const last1 = fallbackThreadMessages.get(FB_THREAD_1) ?? []
  const last2 = fallbackThreadMessages.get(FB_THREAD_2) ?? []
  const lm1 = last1[last1.length - 1]
  const lm2 = last2[last2.length - 1]
  const fbReviews1 = generateReviewsForEntityId(FB_PEER_1)
  const fbReviews2 = generateReviewsForEntityId(FB_PEER_2)
  fallbackStaticListCards = [
    {
      threadId: FB_THREAD_1,
      id: FB_PEER_1,
      name: 'Carlos',
      user_name: 'Carlos',
      peer_user_id: FB_PEER_1,
      user_id: FB_PEER_1,
      reviews: fbReviews1,
      rating: getAverage(fbReviews1),
      lastMessage: lm1?.text ?? '',
      time: lm1?.at ?? '',
      brand: 'Opel',
      model: 'Corsa',
      plate: '2145 BCD',
      peerUserId: FB_PEER_1,
      chatLastMessage: lm1?.text ?? '',
      chatUnreadCount: 2,
      user_photo: null,
      unreadCount: 2,
      phone: '+34600000000',
      allow_phone_calls: true,
    },
    {
      threadId: FB_THREAD_2,
      id: FB_PEER_2,
      name: 'Lucía',
      user_name: 'Lucía',
      peer_user_id: FB_PEER_2,
      user_id: FB_PEER_2,
      reviews: fbReviews2,
      rating: getAverage(fbReviews2),
      lastMessage: lm2?.text ?? '',
      time: lm2?.at ?? '',
      brand: 'Toyota',
      model: 'Yaris',
      plate: '9012 XYZ',
      peerUserId: FB_PEER_2,
      chatLastMessage: lm2?.text ?? '',
      chatUnreadCount: 0,
      user_photo: null,
      unreadCount: 0,
      phone: '+34600111222',
      allow_phone_calls: true,
    },
  ]
}

/**
 * @param {string} threadId
 * @returns {boolean}
 */
export function isDmDevFallbackThread(threadId) {
  if (!devFallbackAllowed() || !threadId) return false
  seedFallbackDmIfNeeded()
  return fallbackThreadMessages.has(threadId)
}

function mergeFallbackListCards() {
  seedFallbackDmIfNeeded()
  const dynamic = [...fallbackDynamicListCards.values()]
  return [...dynamic, ...fallbackStaticListCards]
}

/**
 * @param {string} threadId
 * @param {string} text
 * @param {string} at
 */
function touchFallbackListPreview(threadId, text, at) {
  seedFallbackDmIfNeeded()
  for (const c of [...fallbackStaticListCards, ...fallbackDynamicListCards.values()]) {
    if (c.threadId === threadId) {
      c.lastMessage = text
      c.time = at
      return
    }
  }
}

function setChatsRealOk(ok, devFb) {
  _chatsBackendRealOk = ok
  _chatsDevFallbackActive = devFb
}

/**
 * @param {string} iso
 */
export function formatDmMsgTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

/**
 * @param {{
 *   thread: { id: string, user_a: string, user_b: string },
 *   peerId: string,
 *   profile: Record<string, unknown> | null,
 *   lastMessage: { body?: string, created_at?: string } | null,
 * }} p
 */
export function dmThreadToListCard(p) {
  const pr = p.profile && typeof p.profile === 'object' ? p.profile : {}
  const name = String(pr.name ?? '').trim()
  const last = p.lastMessage && typeof p.lastMessage === 'object' ? p.lastMessage : null
  const phoneRaw = String(pr.phone ?? '').trim()
  const peerId = String(p.peerId ?? '')
  const threadId = p.thread.id
  /** Solo peer: nunca usar threadId como entidad de reseñas (evita mezcla de IDs). */
  const reviews = generateReviewsForEntityId(peerId)
  const rating = getAverage(reviews)
  const lastMessage = String(last?.body ?? '')
  const phone = phoneRaw || null
  return {
    threadId,
    /** Usuario (peer). Nunca usar threadId aquí. */
    id: peerId,
    name,
    user_name: name,
    peerUserId: peerId,
    peer_user_id: peerId,
    user_id: peerId,
    reviews,
    rating,
    lastMessage,
    chatLastMessage: lastMessage,
    time: formatDmMsgTime(last?.created_at ? String(last.created_at) : ''),
    brand: String(pr.car_brand ?? ''),
    model: String(pr.car_model ?? ''),
    plate: String(pr.plate ?? ''),
    user_photo: pr.avatar_url ?? null,
    unreadCount: 0,
    chatUnreadCount: 0,
    phone,
    allow_phone_calls: phoneRaw.length > 0,
  }
}

/**
 * @param {string} userId
 * @returns {Promise<{ data: ReturnType<typeof dmThreadToListCard>[] | null, error: Error | null, usedDevFallback: boolean }>}
 */
export async function listDmThreadsForUser(userId) {
  const dev = devFallbackAllowed()

  const returnFallback = () => {
    setChatsRealOk(false, true)
    return { data: mergeFallbackListCards(), error: null, usedDevFallback: true }
  }

  if (!isSupabaseConfigured() || !supabase) {
    if (dev) return returnFallback()
    setChatsRealOk(false, false)
    return { data: [], error: null, usedDevFallback: false }
  }

  if (!isRealSupabaseAuthUid(userId)) {
    if (dev) return returnFallback()
    setChatsRealOk(false, false)
    return { data: [], error: null, usedDevFallback: false }
  }

  const { data: threads, error: tErr } = await supabase
    .from('waitme_dm_threads')
    .select('id, user_a, user_b, created_at, updated_at')
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)

  if (tErr) {
    console.error('[WaitMe][Chats] list threads', tErr.message, tErr)
    if (dev && isMissingWaitmeRelationError(tErr)) return returnFallback()
    setChatsRealOk(false, false)
    return { data: null, error: new Error(tErr.message), usedDevFallback: false }
  }
  if (!threads?.length) {
    setChatsRealOk(true, false)
    return { data: [], error: null, usedDevFallback: false }
  }

  const sortedThreads = [...threads].sort((a, b) =>
    String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? ''))
  )

  const peerIds = [...new Set(sortedThreads.map((t) => (t.user_a === userId ? t.user_b : t.user_a)))]
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select(PROFILE_MIN)
    .in('id', peerIds)

  if (pErr) {
    console.error('[WaitMe][Chats] profiles', pErr.message, pErr)
    if (dev && isMissingWaitmeRelationError(pErr)) return returnFallback()
    setChatsRealOk(false, false)
    return { data: null, error: new Error(pErr.message), usedDevFallback: false }
  }

  const profileById = new Map((profiles ?? []).map((r) => [r.id, r]))

  const cards = []
  for (const t of sortedThreads) {
    const peerId = t.user_a === userId ? t.user_b : t.user_a
    const { data: lastRows, error: mErr } = await supabase
      .from('waitme_dm_messages')
      .select('body, created_at')
      .eq('thread_id', t.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (mErr) {
      console.error('[WaitMe][Chats] last message', mErr.message, mErr)
      if (dev && isMissingWaitmeRelationError(mErr)) return returnFallback()
      setChatsRealOk(false, false)
      return { data: null, error: new Error(mErr.message), usedDevFallback: false }
    }
    const lastMessage = lastRows?.[0] ?? null
    cards.push(
      dmThreadToListCard({
        thread: t,
        peerId,
        profile: profileById.get(peerId) ?? null,
        lastMessage,
      })
    )
  }

  setChatsRealOk(true, false)
  return { data: cards, error: null, usedDevFallback: false }
}

/**
 * @param {string} userId
 * @param {string} threadId
 */
export async function fetchDmMessages(userId, threadId) {
  if (isDmDevFallbackThread(threadId)) {
    seedFallbackDmIfNeeded()
    const list = fallbackThreadMessages.get(threadId)
    if (!list) {
      return { data: [], error: null, usedDevFallback: true }
    }
    return { data: list.map((m) => ({ ...m })), error: null, usedDevFallback: true }
  }

  if (!isSupabaseConfigured() || !supabase || !isRealSupabaseAuthUid(userId)) {
    return { data: [], error: null, usedDevFallback: false }
  }

  const { data: thread, error: tErr } = await supabase
    .from('waitme_dm_threads')
    .select('id, user_a, user_b')
    .eq('id', threadId)
    .maybeSingle()

  if (tErr || !thread) {
    if (tErr) console.error('[WaitMe][Chats] thread gate', tErr.message, tErr)
    return {
      data: null,
      error: tErr ? new Error(tErr.message) : new Error('thread_not_found'),
      usedDevFallback: false,
    }
  }
  if (thread.user_a !== userId && thread.user_b !== userId) {
    return { data: null, error: new Error('forbidden'), usedDevFallback: false }
  }

  const { data, error } = await supabase
    .from('waitme_dm_messages')
    .select('id, sender_id, body, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[WaitMe][Chats] messages', error.message, error)
    return { data: null, error: new Error(error.message), usedDevFallback: false }
  }

  const rows = Array.isArray(data) ? data : []
  const mapped = rows.map((m) => ({
    id: m.id,
    from: m.sender_id === userId ? 'me' : 'them',
    text: String(m.body ?? ''),
    at: formatDmMsgTime(m.created_at ? String(m.created_at) : ''),
  }))
  return { data: mapped, error: null, usedDevFallback: false }
}

/**
 * @param {string} userId
 * @param {string} threadId
 * @param {string} body
 */
export async function sendDmMessage(userId, threadId, body) {
  const trimmed = String(body ?? '').trim()
  if (!trimmed) return { data: null, error: new Error('empty_body'), usedDevFallback: false }

  if (isDmDevFallbackThread(threadId)) {
    seedFallbackDmIfNeeded()
    const list = fallbackThreadMessages.get(threadId)
    if (!list) return { data: null, error: new Error('thread_not_found'), usedDevFallback: true }
    const at = formatDmMsgTime(new Date().toISOString())
    const row = { id: `fb-send-${Date.now()}`, from: /** @type {'me'} */ ('me'), text: trimmed, at }
    list.push(row)
    touchFallbackListPreview(threadId, trimmed, at)
    return { data: { id: row.id, from: 'me', text: trimmed, at }, error: null, usedDevFallback: true }
  }

  if (!isSupabaseConfigured() || !supabase || !isRealSupabaseAuthUid(userId)) {
    return { data: null, error: new Error('not_configured'), usedDevFallback: false }
  }

  const { data: thread, error: tErr } = await supabase
    .from('waitme_dm_threads')
    .select('id, user_a, user_b')
    .eq('id', threadId)
    .maybeSingle()

  if (tErr || !thread) {
    return { data: null, error: tErr ? new Error(tErr.message) : new Error('thread_not_found'), usedDevFallback: false }
  }
  if (thread.user_a !== userId && thread.user_b !== userId) {
    return { data: null, error: new Error('forbidden'), usedDevFallback: false }
  }

  const { data, error } = await supabase
    .from('waitme_dm_messages')
    .insert({ thread_id: threadId, sender_id: userId, body: trimmed })
    .select('id, sender_id, body, created_at')
    .single()

  if (error) {
    console.error('[WaitMe][Chats] send', error.message, error)
    return { data: null, error: new Error(error.message), usedDevFallback: false }
  }

  return {
    data: {
      id: data.id,
      from: 'me',
      text: String(data.body ?? ''),
      at: formatDmMsgTime(data.created_at ? String(data.created_at) : ''),
    },
    error: null,
    usedDevFallback: false,
  }
}

/**
 * @param {string} otherUserId
 */
export async function getOrCreateDmThread(otherUserId) {
  const dev = devFallbackAllowed()
  const peer = String(otherUserId ?? '')

  const fallbackForPeer = () => {
    setChatsRealOk(false, true)
    seedFallbackDmIfNeeded()
    if (peer === FB_PEER_1) return { data: FB_THREAD_1, error: null, usedDevFallback: true }
    if (peer === FB_PEER_2) return { data: FB_THREAD_2, error: null, usedDevFallback: true }
    const existing = fallbackDynamicListCards.get(peer)
    if (existing) return { data: existing.threadId, error: null, usedDevFallback: true }
    const tid = crypto.randomUUID()
    const at = formatDmMsgTime(new Date().toISOString())
    const dynReviews = generateReviewsForEntityId(peer)
    fallbackThreadMessages.set(tid, [
      {
        id: 'fb-dyn-seed',
        from: 'them',
        text: 'Hola, escribe cuando quieras.',
        at,
      },
    ])
    const card = {
      threadId: tid,
      id: peer,
      name: '',
      user_name: '',
      peer_user_id: peer,
      user_id: peer,
      reviews: dynReviews,
      rating: getAverage(dynReviews),
      lastMessage: 'Hola, escribe cuando quieras.',
      chatLastMessage: 'Hola, escribe cuando quieras.',
      time: at,
      brand: '',
      model: '',
      plate: '',
      peerUserId: peer,
      user_photo: null,
      unreadCount: 0,
      chatUnreadCount: 0,
    }
    fallbackDynamicListCards.set(peer, card)
    return { data: tid, error: null, usedDevFallback: true }
  }

  if (!isSupabaseConfigured() || !supabase) {
    if (dev) return fallbackForPeer()
    return { data: null, error: new Error('not_configured'), usedDevFallback: false }
  }

  const { data, error } = await supabase.rpc('waitme_get_or_create_dm_thread', {
    other_user_id: otherUserId,
  })
  if (!error) {
    const id = typeof data === 'string' ? data : null
    if (id) setChatsRealOk(true, false)
    return { data: id, error: id ? null : new Error('rpc_no_id'), usedDevFallback: false }
  }

  console.error('[WaitMe][Chats] rpc thread', error.message, error)
  if (dev && isMissingWaitmeRelationError(error)) return fallbackForPeer()

  setChatsRealOk(false, false)
  return { data: null, error: new Error(error.message), usedDevFallback: false }
}
