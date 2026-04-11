/**
 * Instrumentación temporal: flags de montaje para diagnóstico en WKWebView.
 * Quitar con el panel en `src/debug/NativeRuntimeDebugPanel.jsx`.
 */
import { useEffect } from 'react'
import { isCapacitorNativeRuntime } from './isCapacitorNativeRuntime.js'

/** @type {Record<'HomePage' | 'MainLayoutChrome' | 'Map', boolean>} */
const mounts = {
  HomePage: false,
  MainLayoutChrome: false,
  Map: false,
}

const listeners = new Set()

function notify() {
  listeners.forEach((fn) => {
    fn()
  })
}

export function setNativeDebugMount(/** @type {keyof typeof mounts} */ key, value) {
  if (mounts[key] === value) return
  mounts[key] = value
  notify()
}

export function subscribeNativeDebugMounts(fn) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function getNativeDebugMounts() {
  return { ...mounts }
}

/** Solo efecto lateral en runtime nativo Capacitor. */
export function useNativeDebugMount(/** @type {keyof typeof mounts} */ key) {
  useEffect(() => {
    if (!isCapacitorNativeRuntime()) return undefined
    setNativeDebugMount(key, true)
    return () => {
      setNativeDebugMount(key, false)
    }
  }, [key])
}
