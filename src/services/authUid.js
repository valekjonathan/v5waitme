/**
 * @param {unknown} id
 * @returns {boolean}
 */
export function isRealSupabaseAuthUid(id) {
  if (typeof id !== 'string' || !id) return false
  if (id === 'dev-local-user') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}
