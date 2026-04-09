/** Handoff DM peer entre pantallas (Strict Mode: take atómico). */
const KEY = 'waitme.pending_dm_peer_v1'

/** Peer en URL `#/chat/<id>` (SPA; mismo rol que `/chat/:id` en router). */
export function parseChatPeerFromHash() {
  if (typeof window === 'undefined') return null
  const m = window.location.hash.match(/^#\/chat\/([^/?#]+)/)
  if (!m) return null
  try {
    return decodeURIComponent(m[1])
  } catch {
    return m[1]
  }
}

/**
 * @param {string} peerUserId
 */
export function stashPendingDmPeerUserId(peerUserId) {
  try {
    sessionStorage.setItem(KEY, peerUserId)
  } catch {
    /* */
  }
}

/** @returns {string | null} */
export function takePendingDmPeerUserId() {
  try {
    const v = sessionStorage.getItem(KEY)
    if (v) sessionStorage.removeItem(KEY)
    return v
  } catch {
    return null
  }
}
