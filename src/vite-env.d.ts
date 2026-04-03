/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SENTRY_DSN?: string
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
