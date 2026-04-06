import { App } from '@capacitor/app'
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
        console.error('OAuth callback sin code:', url)
        return
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('OAuth exchange error:', error)
        return
      }

      window.location.replace('/')
    } catch (err) {
      console.error('Deep link error:', err)
    }
  })
}
