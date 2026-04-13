import { useEffect } from 'react'

/**
 * Una sola fuente de altura: `--app-height` en `documentElement`.
 * visualViewport cuando existe; si no, innerHeight. Listeners mínimos alineados con Safari/iOS.
 */
export function useAppHeight() {
  useEffect(() => {
    const set = () => {
      const h = window.visualViewport?.height ?? window.innerHeight
      document.documentElement.style.setProperty('--app-height', `${h}px`)
    }

    set()

    const vv = window.visualViewport
    vv?.addEventListener('resize', set)
    vv?.addEventListener('scroll', set)
    window.addEventListener('resize', set)

    return () => {
      vv?.removeEventListener('resize', set)
      vv?.removeEventListener('scroll', set)
      window.removeEventListener('resize', set)
    }
  }, [])
}
