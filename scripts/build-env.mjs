/**
 * Vars mínimas para que `vite build` no falle por política de entorno (CI, quality, build-check).
 * No sustituye .env.local en desarrollo; solo rellena si faltan.
 */
export function envWithBuildPlaceholders() {
  const env = { ...process.env }
  if (!String(env.VITE_SUPABASE_URL || '').trim()) {
    /** No usar *.supabase.co ficticio: el cliente lo rechaza como no configurado. */
    env.VITE_SUPABASE_URL = 'https://build-config-missing.invalid'
  }
  if (!String(env.VITE_SUPABASE_ANON_KEY || '').trim()) {
    env.VITE_SUPABASE_ANON_KEY =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.build-placeholder-not-for-production'
  }
  return env
}
