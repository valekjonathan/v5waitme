/**
 * Marco del dispositivo: define el viewport lógico (390×844) escalado.
 * En viewport estrecho o PWA standalone, el contenido va edge-to-edge (sin marco ni padding).
 */
import { useLayoutEffect, useState } from 'react'
import { radius } from '../design/radius'
import { shadows } from '../design/shadows'

const FRAME_W = 390
const FRAME_H = 844
const VIEW_PAD = 24
/** Por debajo de esto (p. ej. iPhone real o ventana estrecha): sin marco simulado. */
const FULL_BLEED_MAX_WIDTH_PX = 480

function readScale() {
  const vv = window.visualViewport
  const vh = (vv?.height ?? window.innerHeight) - VIEW_PAD * 2
  const vw = (vv?.width ?? window.innerWidth) - VIEW_PAD * 2
  return Math.min(1, vh / FRAME_H, vw / FRAME_W)
}

function readUseFullBleed() {
  if (typeof window === 'undefined') return false
  const mq =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches === true
  const iosStandalone =
    typeof navigator !== 'undefined' &&
    'standalone' in navigator &&
    /** @type {{ standalone?: boolean }} */ (navigator).standalone === true
  const narrow = window.innerWidth <= FULL_BLEED_MAX_WIDTH_PX
  return Boolean(mq || iosStandalone || narrow)
}

export default function IphoneFrame({ children }) {
  const [scale, setScale] = useState(1)
  const [fullBleed, setFullBleed] = useState(false)

  useLayoutEffect(() => {
    const update = () => {
      setFullBleed(readUseFullBleed())
      setScale(readScale())
    }
    update()
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    let mqUnsub = () => {}
    if (typeof window.matchMedia === 'function') {
      const mq = window.matchMedia('(display-mode: standalone)')
      if (typeof mq.addEventListener === 'function') {
        mq.addEventListener('change', update)
        mqUnsub = () => mq.removeEventListener('change', update)
      } else if (typeof mq.addListener === 'function') {
        mq.addListener(update)
        mqUnsub = () => mq.removeListener(update)
      }
    }
    return () => {
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
      mqUnsub()
    }
  }, [])

  if (fullBleed) {
    return (
      <div className="waitme-iphone-frame-fullbleed" style={{ height: '100%', width: '100%' }}>
        {children}
      </div>
    )
  }

  const s = scale

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflowX: 'hidden',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          width: FRAME_W * s,
          height: FRAME_H * s,
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: FRAME_W,
            height: FRAME_H,
            transform: `scale(${s})`,
            transformOrigin: 'top left',
            borderRadius: radius.phoneFrame,
            overflow: 'hidden',
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: shadows.iphoneFrame,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
