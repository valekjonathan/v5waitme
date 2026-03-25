/**
 * Espaciado usado en la app (px). Escala principal + valores que solo aparecen en un sitio.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
}

/** Valores adicionales que ya existían en componentes concretos */
export const spacingExact = {
  navPaddingTop: 6,
  navPaddingBottomCalc: 'calc(4px + env(safe-area-inset-bottom, 0px))',
  headerGap: 11,
  profileCardPadding: 10,
  profileCardGap: 6,
  bottomNavHeight: 60,
  entryButtonGap: 16,
  headerPaddingY: 12,
  headerPaddingX: 16,
  balancePillPaddingY: 6,
  balancePillPaddingX: 12,
}
