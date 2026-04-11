/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SENTRY_DSN?: string
  /** Opcional: versión/release mostrada en Sentry (p. ej. hash de build o tag git). */
  readonly VITE_SENTRY_RELEASE?: string
  /** Mismo origen dev para Safari + OAuth web (p. ej. http://192.168.0.50:5173). Opcional si Vite detecta IP. */
  readonly VITE_DEV_LAN_ORIGIN?: string
  /** Hash corto git inyectado en `vite build` (panel debug nativo temporal). */
  readonly VITE_WAITME_BUILD_HASH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  /** Home: offset vertical punta del pin vs centro del mapa. Search/Parked con layout: no usado (project/unproject). */
  __WAITME_PIN_OFFSET_Y__?: number
}

declare module '*.jsx' {
  import type { ComponentType } from 'react'
  const component: ComponentType<Record<string, unknown>>
  export default component
}
