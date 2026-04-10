/**
 * Misma resolución de avatar que la cabecera del hilo DM (`ChatThreadView`):
 * foto subida si existe; si no, retrato determinista pravatar por nombre/id/hilo.
 */

/** @param {string} s */
export function pravatarImgIdFromString(s) {
  let h = 0
  const str = String(s || 'user')
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return (h % 70) + 1
}

/**
 * @param {Record<string, unknown> | null | undefined} row
 * @returns {string} URL de imagen (nunca vacía si hay id o nombre)
 */
export function resolveDmPeerAvatarUrl(row) {
  const r = row && typeof row === 'object' ? row : {}
  const uploaded = String(r.user_photo ?? r.avatar ?? '').trim()
  if (uploaded) return uploaded
  const displayName = String(r.name ?? r.user_name ?? '').trim()
  const peerId = String(r.peer_user_id ?? r.id ?? '').trim()
  const threadId = String(r.threadId ?? '').trim()
  const key = displayName || peerId || threadId || 'user'
  return `https://i.pravatar.cc/150?img=${pravatarImgIdFromString(key)}`
}
