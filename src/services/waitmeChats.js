/**
 * @fileoverview Hilos DM (`waitme_dm_threads`) y mensajes (`waitme_dm_messages`).
 */
import { supabase, isSupabaseConfigured } from './supabase.js'
import { isRealSupabaseAuthUid } from './authUid.js'

const PROFILE_MIN = 'id,name,car_brand,car_model,plate,avatar_url'

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
  const name = String(pr.name ?? '').trim() || 'Usuario'
  const last = p.lastMessage && typeof p.lastMessage === 'object' ? p.lastMessage : null
  return {
    id: p.thread.id,
    name,
    rating: 4,
    lastMessage: String(last?.body ?? ''),
    time: formatDmMsgTime(last?.created_at ? String(last.created_at) : ''),
    brand: String(pr.car_brand ?? ''),
    model: String(pr.car_model ?? ''),
    plate: String(pr.plate ?? ''),
    peerUserId: p.peerId,
    user_photo: pr.avatar_url ?? null,
  }
}

/**
 * @param {string} userId
 * @returns {Promise<{ data: ReturnType<typeof dmThreadToListCard>[] | null, error: Error | null }>}
 */
export async function listDmThreadsForUser(userId) {
  if (!isSupabaseConfigured() || !supabase || !isRealSupabaseAuthUid(userId)) {
    return { data: [], error: null }
  }

  const { data: threads, error: tErr } = await supabase
    .from('waitme_dm_threads')
    .select('id, user_a, user_b, created_at, updated_at')
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)

  if (tErr) {
    console.error('[WaitMe][Chats] list threads', tErr.message, tErr)
    return { data: null, error: new Error(tErr.message) }
  }
  if (!threads?.length) return { data: [], error: null }

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
    return { data: null, error: new Error(pErr.message) }
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
      return { data: null, error: new Error(mErr.message) }
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

  return { data: cards, error: null }
}

/**
 * @param {Record<string, unknown>} t
 */
export function dmListCardToAlert(t) {
  const c = t && typeof t === 'object' ? t : {}
  return {
    id: c.id,
    user_name: String(c.name ?? ''),
    rating: c.rating,
    brand: c.brand,
    model: c.model,
    plate: c.plate,
    chatLastMessage: c.lastMessage,
    user_photo: c.user_photo ?? null,
  }
}

/**
 * @param {string} userId
 * @param {string} threadId
 */
export async function fetchDmMessages(userId, threadId) {
  if (!isSupabaseConfigured() || !supabase || !isRealSupabaseAuthUid(userId)) {
    return { data: [], error: null }
  }

  const { data: thread, error: tErr } = await supabase
    .from('waitme_dm_threads')
    .select('id, user_a, user_b')
    .eq('id', threadId)
    .maybeSingle()

  if (tErr || !thread) {
    if (tErr) console.error('[WaitMe][Chats] thread gate', tErr.message, tErr)
    return { data: null, error: tErr ? new Error(tErr.message) : new Error('thread_not_found') }
  }
  if (thread.user_a !== userId && thread.user_b !== userId) {
    return { data: null, error: new Error('forbidden') }
  }

  const { data, error } = await supabase
    .from('waitme_dm_messages')
    .select('id, sender_id, body, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[WaitMe][Chats] messages', error.message, error)
    return { data: null, error: new Error(error.message) }
  }

  const rows = Array.isArray(data) ? data : []
  const mapped = rows.map((m) => ({
    id: m.id,
    from: m.sender_id === userId ? 'me' : 'them',
    text: String(m.body ?? ''),
    at: formatDmMsgTime(m.created_at ? String(m.created_at) : ''),
  }))
  return { data: mapped, error: null }
}

/**
 * @param {string} userId
 * @param {string} threadId
 * @param {string} body
 */
export async function sendDmMessage(userId, threadId, body) {
  if (!isSupabaseConfigured() || !supabase || !isRealSupabaseAuthUid(userId)) {
    return { data: null, error: new Error('not_configured') }
  }
  const trimmed = String(body ?? '').trim()
  if (!trimmed) return { data: null, error: new Error('empty_body') }

  const { data: thread, error: tErr } = await supabase
    .from('waitme_dm_threads')
    .select('id, user_a, user_b')
    .eq('id', threadId)
    .maybeSingle()

  if (tErr || !thread) {
    return { data: null, error: tErr ? new Error(tErr.message) : new Error('thread_not_found') }
  }
  if (thread.user_a !== userId && thread.user_b !== userId) {
    return { data: null, error: new Error('forbidden') }
  }

  const { data, error } = await supabase
    .from('waitme_dm_messages')
    .insert({ thread_id: threadId, sender_id: userId, body: trimmed })
    .select('id, sender_id, body, created_at')
    .single()

  if (error) {
    console.error('[WaitMe][Chats] send', error.message, error)
    return { data: null, error: new Error(error.message) }
  }

  return {
    data: {
      id: data.id,
      from: 'me',
      text: String(data.body ?? ''),
      at: formatDmMsgTime(data.created_at ? String(data.created_at) : ''),
    },
    error: null,
  }
}

/**
 * @param {string} otherUserId
 */
export async function getOrCreateDmThread(otherUserId) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: new Error('not_configured') }
  }
  const { data, error } = await supabase.rpc('waitme_get_or_create_dm_thread', {
    other_user_id: otherUserId,
  })
  if (error) {
    console.error('[WaitMe][Chats] rpc thread', error.message, error)
    return { data: null, error: new Error(error.message) }
  }
  const id = typeof data === 'string' ? data : null
  return { data: id, error: id ? null : new Error('rpc_no_id') }
}
