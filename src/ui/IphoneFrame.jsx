/**
 * Navegador con `?iphone=true|1`: marco 390×844 escalado al viewport (`--app-height` + visualViewport).
 * Capacitor: sin marco; `waitme-capacitor` en `documentElement` (global.css).
 */
import { Capacitor } from '@capacitor/core'
import { useLayoutEffect, useState } from 'react'
import { radius } from '../design/radius'
import { shadows } from '../design/shadows'

const FRAME_W = 390
const FRAME_H = 844
const VIEW_PAD = 28

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
  const pad = VIEW_PAD * 2
  const vh = Math.max(0, (vv?.height ?? window.innerHeight) - pad)
  const vw = Math.max(0, (vv?.width ?? window.innerWidth) - pad)
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
    if (Capacitor.isNativePlatform() || !iphonePreview) return undefined
    const update = () => setScale(readScale())
    update()
    window.addEventListener('resize', update)
    const vv = window.visualViewport
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    return () => {
      window.removeEventListener('resize', update)
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
    }
  }, [iphonePreview])

  useLayoutEffect(() => {
    if (Capacitor.isNativePlatform()) return undefined
    const root = document.documentElement
    if (iphonePreview) root.classList.add('waitme-iphone-preview')
    else root.classList.remove('waitme-iphone-preview')
    return () => {
      root.classList.remove('waitme-iphone-preview')
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
        height: 'var(--app-height)',
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
