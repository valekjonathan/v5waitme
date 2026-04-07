/**
 * Safari / navegador en `vite dev`: espejo de trabajo sin Capacitor.
 * Producción web (`vite build`), tests (`MODE=test`) y app iOS/Android: false.
 */
export function isDevSafari() {
  return (
    import.meta.env.DEV &&
    import.meta.env.MODE !== 'test' &&
    typeof window !== 'undefined' &&
    !window.Capacitor?.isNativePlatform?.()
  )
}
