import { useEffect } from 'react'

/**
 * Única escritura de `--app-height` en documentElement (visualViewport si existe; si no innerHeight).
 */
export function useAppHeight() {
  useEffect(() => {
    const setAppHeight = () => {
      const height = window.visualViewport?.height ?? window.innerHeight
      document.documentElement.style.setProperty('--app-height', `${height}px`)
    }

    setAppHeight()

    window.visualViewport?.addEventListener('resize', setAppHeight)
    window.visualViewport?.addEventListener('scroll', setAppHeight)
    window.addEventListener('resize', setAppHeight)

    return () => {
      window.visualViewport?.removeEventListener('resize', setAppHeight)
      window.visualViewport?.removeEventListener('scroll', setAppHeight)
      window.removeEventListener('resize', setAppHeight)
    }
  }, [])
}
