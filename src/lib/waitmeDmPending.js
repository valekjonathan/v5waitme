/** Handoff DM peer entre pantallas (Strict Mode: take atómico). */
const KEY = 'waitme.pending_dm_peer_v1'

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
