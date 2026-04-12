/**
 * Marco del dispositivo: define el viewport lógico (390×844) escalado **solo en navegador**.
 * En app nativa (Capacitor) no se aplica `transform: scale`: Mapbox/WKWebView necesitan geometría
 * real del WebView; el escalado rompe resize del canvas y desincroniza respecto a Safari de escritorio.
 * El contenido de la app vive en ScreenShell (ver src/ui/layout/layout.ts).
 */
import { Capacitor } from '@capacitor/core'
import { useLayoutEffect, useState } from 'react'
import { radius } from '../design/radius'
import { shadows } from '../design/shadows'

const FRAME_W = 390
const FRAME_H = 844
const VIEW_PAD = 24

function readScale() {
  const vv = window.visualViewport
  const vh = (vv?.height ?? window.innerHeight) - VIEW_PAD * 2
  const vw = (vv?.width ?? window.innerWidth) - VIEW_PAD * 2
  return Math.min(1, vh / FRAME_H, vw / FRAME_W)
}

const nativeRootStyle = {
  flex: 1,
  width: '100%',
  minHeight: 0,
  alignSelf: 'stretch',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  position: 'relative',
}

export default function IphoneFrame({ children }) {
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    if (Capacitor.isNativePlatform()) return undefined
    const update = () => setScale(readScale())
    update()
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    return () => {
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
    }
  }, [])

  if (Capacitor.isNativePlatform()) {
    return (
      <div data-waitme-hit="iphoneFrame" style={nativeRootStyle}>
        {children}
      </div>
    )
  }

  const s = scale

  return (
    <div
      data-waitme-hit="iphoneFrameOuter"
      style={{
        flex: 1,
        minHeight: 0,
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
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
          data-waitme-hit="iphoneFrame"
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
