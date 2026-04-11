/**
 * Panel de diagnóstico TEMPORAL — solo Capacitor / iPhone nativo.
 * Eliminar: este archivo + `nativeRuntimeDebugMounts.js` + `isCapacitorNativeRuntime.js`
 * + imports en App.jsx, MainLayout.jsx, AuthenticatedMapScreen.jsx + define en vite/vitest.
 */
import { useLayoutEffect, useMemo, useReducer, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useAppScreen } from '../lib/AppScreenContext'
import { isCapacitorNativeRuntime } from './isCapacitorNativeRuntime.js'
import { getNativeDebugMounts, subscribeNativeDebugMounts } from './nativeRuntimeDebugMounts.js'

const panelStyle = {
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 2147483000,
  maxHeight: '38%',
  overflow: 'auto',
  padding: '6px 8px',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize: 9,
  lineHeight: 1.35,
  color: 'rgba(230,230,230,0.95)',
  backgroundColor: 'rgba(20,20,22,0.92)',
  borderTop: '1px solid rgba(255,255,255,0.12)',
  pointerEvents: 'none',
  WebkitFontSmoothing: 'antialiased',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
}

function summarizeHit(el) {
  if (!el || el === document.documentElement) return 'html'
  const tag = el.tagName?.toLowerCase() ?? '?'
  const bits = [tag]
  if (el.id) bits.push(`#${el.id}`)
  const attrs = el.attributes
  if (attrs) {
    for (let i = 0; i < attrs.length; i += 1) {
      const n = attrs[i].name
      if (n.startsWith('data-waitme')) bits.push(`[${n}]`)
    }
  }
  return bits.join('').slice(0, 96)
}

function measureHeights() {
  const shell = document.querySelector('[data-waitme-screen-shell]')
  const main = document.querySelector('[data-waitme-main]')
  const slot = document.querySelector('[data-waitme-content-slot]')
  const mapSlot = document.querySelector('[data-waitme-map-slot]')
  const rr = (n) => (n ? Math.round(n.getBoundingClientRect().height) : 0)
  return {
    shellH: rr(shell),
    mainH: rr(main),
    slotH: rr(slot),
    mapShellH: rr(mapSlot),
  }
}

function measureCenter() {
  const vv = window.visualViewport
  const w = vv?.width ?? window.innerWidth
  const h = vv?.height ?? window.innerHeight
  const ox = vv?.offsetLeft ?? 0
  const oy = vv?.offsetTop ?? 0
  const cx = Math.floor(ox + w / 2)
  const cy = Math.floor(oy + h / 2)
  const el = document.elementFromPoint(cx, cy)
  return {
    cx,
    cy,
    topElementAtCenter: summarizeHit(el),
  }
}

export default function NativeRuntimeDebugPanel() {
  const native = useMemo(() => isCapacitorNativeRuntime(), [])
  const { profileBootstrapReady, isProfileComplete } = useAuth()
  const nav = useAppScreen()
  const activeScreen = nav?.activeScreen ?? '?'
  const mapMode = nav?.mapMode ?? '?'

  const [, bumpLayout] = useReducer((n) => n + 1, 0)
  const [mounts, setMounts] = useState(getNativeDebugMounts)

  useLayoutEffect(() => {
    if (!native) return undefined
    return subscribeNativeDebugMounts(() => {
      setMounts(getNativeDebugMounts())
    })
  }, [native])

  useLayoutEffect(() => {
    if (!native) return undefined
    const bump = () => bumpLayout()
    const ro = new ResizeObserver(bump)
    ro.observe(document.documentElement)
    const slot = document.querySelector('[data-waitme-content-slot]')
    if (slot) ro.observe(slot)
    const main = document.querySelector('[data-waitme-main]')
    if (main) ro.observe(main)
    const vv = window.visualViewport
    vv?.addEventListener('resize', bump)
    vv?.addEventListener('scroll', bump)
    window.addEventListener('resize', bump)
    bump()
    return () => {
      ro.disconnect()
      vv?.removeEventListener('resize', bump)
      vv?.removeEventListener('scroll', bump)
      window.removeEventListener('resize', bump)
    }
  }, [native])

  if (!native) return null

  const hash = String(import.meta.env.VITE_WAITME_BUILD_HASH ?? '').trim() || '?'
  const appHeight = String(
    typeof document !== 'undefined'
      ? getComputedStyle(document.documentElement).getPropertyValue('--app-height').trim()
      : ''
  )
  const vvH = window.visualViewport?.height ?? 0
  const { shellH, mainH, slotH, mapShellH } = measureHeights()
  const center = measureCenter()

  const lines = [
    `hash=${hash}`,
    `href=${String(window.location.href).slice(0, 72)}`,
    `ua=${String(navigator.userAgent).slice(0, 72)}`,
    `activeScreen=${String(activeScreen)} mapMode=${String(mapMode)}`,
    `profileBootstrapReady=${String(Boolean(profileBootstrapReady))} isProfileComplete=${String(Boolean(isProfileComplete))}`,
    `HomePage=${String(mounts.HomePage)} MainLayoutChrome=${String(mounts.MainLayoutChrome)} Map=${String(mounts.Map)}`,
    `top@${center.cx},${center.cy}=${center.topElementAtCenter}`,
    `shellH=${shellH} mainH=${mainH} slotH=${slotH} mapShellH=${mapShellH}`,
    `--app-height=${appHeight || '(none)'} vvH=${Math.round(vvH)} innerH=${window.innerHeight}`,
  ]

  return (
    <aside style={panelStyle} aria-hidden data-waitme-native-debug-panel>
      {lines.join('\n')}
    </aside>
  )
}
