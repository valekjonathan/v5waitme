/**
 * Vars mínimas para que `vite build` no falle por política de entorno (CI, quality, build-check).
 *
 * Importante: Vite prioriza variables ya presentes en `process.env` sobre las cargadas desde
 * archivos `.env*`. Si aquí inyectábamos un placeholder en `process.env` sin mirar `.env`, el build
 * ignoraba `VITE_SUPABASE_URL` real del disco y embebía `build-config-missing.invalid` (o forzaba
 * incoherencias). Resolvemos igual que Vite: `loadEnv('production', …)` y solo placeholders si
 * sigue faltando (CI sin credenciales).
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

export function envWithBuildPlaceholders() {
  const fileEnv = loadEnv('production', root, '')
  const env = { ...process.env }

  const url = String(env.VITE_SUPABASE_URL || fileEnv.VITE_SUPABASE_URL || '').trim()
  const key = String(env.VITE_SUPABASE_ANON_KEY || fileEnv.VITE_SUPABASE_ANON_KEY || '').trim()

  if (!url) {
    /** No usar *.supabase.co ficticio: el cliente lo rechaza como no configurado. */
    env.VITE_SUPABASE_URL = 'https://build-config-missing.invalid'
  } else {
    env.VITE_SUPABASE_URL = url
  }
  if (!key) {
    env.VITE_SUPABASE_ANON_KEY =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.build-placeholder-not-for-production'
  } else {
    env.VITE_SUPABASE_ANON_KEY = key
  }
  return env
}
