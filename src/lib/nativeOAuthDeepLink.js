import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { supabase } from '../services/supabase.js'

const NATIVE_CALLBACK_PREFIX = 'es.waitme.v5waitme://auth-callback'

function normalizeNativeCallbackUrl(url) {
  return url.replace(
    'es.waitme.v5waitme://auth-callback',
    'http://localhost/auth-callback'
  )
}

export function registerNativeOAuthDeepLink() {
  if (!Capacitor.isNativePlatform() || !supabase) return

  App.addListener('appUrlOpen', async ({ url }) => {
    try {
      if (!url) return
      if (!url.startsWith(NATIVE_CALLBACK_PREFIX)) return

      const normalized = normalizeNativeCallbackUrl(url)
      const parsed = new URL(normalized)

      const code =
        parsed.searchParams.get('code') ||
        new URLSearchParams(parsed.hash.replace(/^#/, '')).get('code')

      if (!code) {
        console.error('[WaitMe][Auth] OAuth callback nativo sin code:', url)
        return
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('[WaitMe][Auth] OAuth exchange error:', error)
        return
      }

      try {
        await Browser.close()
      } catch (closeErr) {
        console.error('[WaitMe][Auth] Browser.close:', closeErr)
      }

      window.location.replace('/')
    } catch (err) {
      console.error('[WaitMe][Auth] Deep link error:', err)
    }
  })
}
