/**
 * Marco del dispositivo: en navegador solo si la URL lleva `?iphone=true` o `?iphone=1` (preview opcional).
 * Sin esa query, el contenido ocupa el viewport como web normal (Safari escritorio / edición).
 * En Capacitor: sin marco, sin escala y sin wrapper extra; la altura la define html/body/#root + ScreenShell.
 * El contenido de la app vive en ScreenShell (ver src/ui/layout/layout.ts).
 */
import { Capacitor } from '@capacitor/core'
import { useLayoutEffect, useState } from 'react'
import { radius } from '../design/radius'
import { shadows } from '../design/shadows'

const FRAME_W = 390
const FRAME_H = 844
const VIEW_PAD = 24

function readIphonePreviewQuery() {
  if (typeof window === 'undefined') return false
  try {
    const v = new URLSearchParams(window.location.search).get('iphone')
    return v === 'true' || v === '1'
  } catch {
    return false
  }
}

function readScale() {
  const vv = window.visualViewport
  const vh = (vv?.height ?? window.innerHeight) - VIEW_PAD * 2
  const vw = (vv?.width ?? window.innerWidth) - VIEW_PAD * 2
  return Math.min(1, vh / FRAME_H, vw / FRAME_W)
}

export default function IphoneFrame({ children }) {
  const [iphonePreview, setIphonePreview] = useState(() => readIphonePreviewQuery())
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    setIphonePreview(readIphonePreviewQuery())
  }, [])

  useLayoutEffect(() => {
    const onPop = () => setIphonePreview(readIphonePreviewQuery())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useLayoutEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined
    document.documentElement.classList.add('waitme-capacitor')
    return () => document.documentElement.classList.remove('waitme-capacitor')
  }, [])

  useLayoutEffect(() => {
    if (typeof document === 'undefined') return undefined
    if (Capacitor.isNativePlatform()) return undefined
    if (iphonePreview) document.documentElement.classList.add('waitme-iphone-preview')
    else document.documentElement.classList.remove('waitme-iphone-preview')
    return () => document.documentElement.classList.remove('waitme-iphone-preview')
  }, [iphonePreview])

  useLayoutEffect(() => {
    if (Capacitor.isNativePlatform() || !iphonePreview) return undefined
    const update = () => setScale(readScale())
    update()
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    return () => {
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
    }
  }, [iphonePreview])

  if (Capacitor.isNativePlatform()) {
    return <>{children}</>
  }

  if (!iphonePreview) {
    return <>{children}</>
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
        /** `visible`: no recortar sombra del marco; el “teléfono” sigue recortando con overflow en la caja interna. */
        overflow: 'visible',
        /**
         * Safari macOS: un antecesor con `pointer-events: none` impide que los clics lleguen a hijos
         * con `auto` (véase comentario en MainLayout). El marco debe usar `auto`; el letterbox
         * solo absorbe clics fuera del teléfono, sin cambiar layout.
         */
      }}
    >
      <div
        style={{
          width: FRAME_W * s,
          height: FRAME_H * s,
          position: 'relative',
          flexShrink: 0,
          pointerEvents: 'auto',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: FRAME_W,
            height: FRAME_H,
            /**
             * WebKit/Safari: `transform: scale()` en el marco desalineaba hit-testing respecto a los clics.
             * `zoom` escala pintura y caja de interacción de forma coherente (misma apariencia que scale sobre 390×844).
             */
            zoom: s,
            borderRadius: radius.phoneFrame,
            overflow: 'hidden',
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: shadows.iphoneFrame,
            pointerEvents: 'auto',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
