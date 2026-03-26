/**
 * Comparación estable de resetKeys para ErrorBoundary (testeable sin React).
 */
export function resetKeysChanged(prev, next) {
  if (prev == null && next == null) return false
  if (prev == null || next == null) return true
  if (prev.length !== next.length) return true
  for (let i = 0; i < prev.length; i += 1) {
    if (prev[i] !== next[i]) return true
  }
  return false
}
