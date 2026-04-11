/**
 * Instrumentación temporal (iPhone / Capacitor).
 * Quitar junto con `src/debug/NativeRuntimeDebugPanel.jsx` y mounts asociados.
 */
export function isCapacitorNativeRuntime() {
  if (typeof window === 'undefined') return false
  if (window.Capacitor?.isNativePlatform?.() === true) return true
  const p = window.location?.protocol || ''
  return p === 'capacitor:' || p === 'ionic:'
}
