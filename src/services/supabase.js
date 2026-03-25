import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

/** Cliente único; con URL/key vacías las llamadas fallarán de forma controlada en los servicios. */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Comprueba que las variables Vite estén definidas y no sean placeholders.
 */
export function isSupabaseConfigured() {
  const url = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim()
  const key = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()
  if (!url || !key) return false
  if (url === 'REEMPLAZAR' || key === 'REEMPLAZAR') return false
  return true
}
