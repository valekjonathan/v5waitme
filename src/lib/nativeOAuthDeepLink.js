import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { supabase } from '../services/supabase.js'

export function registerNativeOAuthDeepLink() {
  if (!Capacitor.isNativePlatform() || !supabase) return

  App.addListener('appUrlOpen', async ({ url }) => {
    try {
      if (!url) return

      // SOLO manejar nuestro callback
      if (!url.startsWith('es.waitme.v5waitme://auth-callback')) return

      // Obtener el code (PKCE)
      const parsed = new URL(url.replace('es.waitme.v5waitme://', 'http://localhost/'))

      const code = parsed.searchParams.get('code')

      if (!code) return

      // INTERCAMBIO REAL DE SESIÓN
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('OAuth exchange error:', error)
        return
      }

      console.log('LOGIN COMPLETADO EN APP')

      // Forzar refresco de estado
      window.location.reload()
    } catch (err) {
      console.error('Deep link error:', err)
    }
  })
}
