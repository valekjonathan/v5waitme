import { useEffect } from 'react'

/**
 * Instrumentación opcional: qué nodo recibe pointerdown (fase captura).
 * Activa con VITE_WAITME_HIT_DEBUG=1 en .env.development.local
 */
export default function HitTestDebug() {
  useEffect(() => {
    const onPointerDownCapture = (e) => {
      const chain = []
      let el = e.target
      let depth = 0
      while (el && el instanceof Element && depth < 14) {
        const hit = el.getAttribute?.('data-waitme-hit')
        const tag = el.tagName?.toLowerCase?.() ?? '?'
        const id = el.id ? `#${el.id}` : ''
        chain.push(hit ? `[${hit}]` : `${tag}${id}`)
        el = el.parentElement
        depth += 1
      }
      console.info('[WaitMe][hit]', e.type, e.clientX, e.clientY, '→', chain.join(' < '))
    }

    document.addEventListener('pointerdown', onPointerDownCapture, true)
    document.addEventListener('click', onPointerDownCapture, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDownCapture, true)
      document.removeEventListener('click', onPointerDownCapture, true)
    }
  }, [])

  return null
}
