/**
 * Vars mínimas para que `vite build` no falle por política de entorno (CI, quality, build-check).
 * No sustituye .env.local en desarrollo; solo rellena si faltan.
 */
export function envWithBuildPlaceholders() {
  const env = { ...process.env }
  if (!String(env.VITE_SUPABASE_URL || '').trim()) {
    env.VITE_SUPABASE_URL = 'https://placeholder.supabase.co'
  }
  if (!String(env.VITE_SUPABASE_ANON_KEY || '').trim()) {
    env.VITE_SUPABASE_ANON_KEY =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.build-placeholder-not-for-production'
  }
  return env
}
