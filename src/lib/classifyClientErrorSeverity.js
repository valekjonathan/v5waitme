/**
 * Clasifica severidad para reportes PostHog.
 * @param {{ source: string, message: string }} opts
 * @returns {'critical'|'warning'|'info'}
 */
export function classifyClientErrorSeverity({ source, message }) {
  const m = String(message ?? '').toLowerCase()
  const s = String(source ?? '').toLowerCase()

  // Información benigna: features desactivadas por configuración faltante.
  if (
    m.includes('supabase') &&
    (m.includes('no configurado') ||
      m.includes('not_configured') ||
      m.includes('faltan vite_supabase_url') ||
      m.includes('faltan vite_supabase_anon_key'))
  ) {
    return 'info'
  }
  if (m.includes('mapbox') && m.includes('sin vite_mapbox_access_token')) {
    return 'info'
  }

  // Render crash: rompe experiencia → critical.
  if (s.includes('errorboundary')) return 'critical'
  if (m.includes('errorboundary')) return 'critical'

  // Promesas rechazadas o errores de ventana: pueden ser degradación → warning.
  if (s.includes('unhandledrejection')) return 'warning'
  if (s.includes('window.onerror')) return 'warning'

  return 'warning'
}
