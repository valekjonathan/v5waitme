import { createClient } from '@supabase/supabase-js'

/** En ejecución Vite siempre existe; en Node (p. ej. tests) puede ser undefined. */
const viteEnv = typeof import.meta !== 'undefined' && import.meta.env != null ? import.meta.env : {}
const urlRaw = String(viteEnv.VITE_SUPABASE_URL ?? '').trim()
const keyRaw = String(viteEnv.VITE_SUPABASE_ANON_KEY ?? '').trim()

const MISSING_ENV_MSG =
  '[WaitMe][Supabase] Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. Auth y perfil no estarán disponibles.'

function envLooksConfigured() {
  if (!urlRaw || !keyRaw) return false
  if (urlRaw === 'REEMPLAZAR' || keyRaw === 'REEMPLAZAR') return false
  return true
}

if (!envLooksConfigured()) {
  console.warn(MISSING_ENV_MSG)
}

/** null si faltan credenciales o createClient falla; nunca usar sin comprobar `isSupabaseConfigured()`. */
function createSupabaseClient() {
  if (!envLooksConfigured()) return null
  try {
    return createClient(urlRaw, keyRaw, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  } catch (e) {
    console.error('[WaitMe][Supabase] createClient falló; auth desactivado.', e)
    return null
  }
}

export const supabase = createSupabaseClient()

/**
 * Comprueba que las variables Vite estén definidas y no sean placeholders.
 */
export function isSupabaseConfigured() {
  return envLooksConfigured() && supabase != null
}
