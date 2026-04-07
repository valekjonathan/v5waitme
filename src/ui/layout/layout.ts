/**
 * Contrato maestro de layout (v5waitme).
 * Cadena: `html/body/#root` → `.waitme-app-root` → `.waitme-iphone-frame-fullbleed` → ScreenShell.
 * ScreenShell: Header + `<main>` (scroll en inset cuando toca) + BottomNav (fuera de `<main>`).
 * Mapa / overlays: bajo `data-waitme-content-slot` dentro de `<main>`.
 */

/** Coordenadas en px relativas únicamente a `[data-waitme-map-slot]`. */
export const MAP_SLOT = {
  searchTop: 12,
  controlsTop: 82,
  filterRight: 16,
  cardBottomSearch: 24,
  cardBottomParked: 16,
  /** Alto visible al colapsar la tarjeta inferior (fila peek). */
  cardPeek: 44,
} as const

export const LAYOUT = {
  screen: {
    maxWidth: 448,
    paddingX: 16,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  z: {
    map: 0,
    overlay: 5,
    content: 10,
    nav: 20,
    /** Controles flotantes en slot de mapa (zoom, etc.). */
    mapZoomControls: 15,
    /** Botón filtros parking (encima del buscador, bajo modales). */
    mapFilterButton: 18,
    /** Tarjeta inferior (alerta / crear) sobre capas base del overlay. */
    parkingCardStack: 9999,
    /** Scrim y panel de filtros (orden relativo preservado). */
    mapFiltersBackdrop: 199999,
    mapFiltersPanel: 200000,
    /** Lista de resultados StreetSearch por encima del stack de parking. */
    streetSearchResults: 300000,
    /** Apilamiento local dentro del input (icono vs caja). */
    streetSearchLayer: 1,
  },
} as const

export const SCREEN_SHELL_MAIN_MODE = {
  INSET: 'inset',
  FULL_BLEED: 'fullBleed',
} as const

export type ScreenShellMainMode =
  (typeof SCREEN_SHELL_MAIN_MODE)[keyof typeof SCREEN_SHELL_MAIN_MODE]
