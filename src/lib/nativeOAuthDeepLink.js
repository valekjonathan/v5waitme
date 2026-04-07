import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { supabase } from '../services/supabase.js'

const NATIVE_CALLBACK_PREFIX = 'es.waitme.v5waitme://auth-callback'

/** Evita doble intercambio si `getLaunchUrl` y `appUrlOpen` entregan la misma URL. */
const seenOAuthCallbackUrls = new Set()

function normalizeNativeCallbackUrl(url) {
  return url.replace('es.waitme.v5waitme://auth-callback', 'http://localhost/auth-callback')
}

async function handleNativeOAuthUrl(url) {
  if (!url || !url.startsWith(NATIVE_CALLBACK_PREFIX)) return
  if (seenOAuthCallbackUrls.has(url)) return
  seenOAuthCallbackUrls.add(url)

  try {
    const normalized = normalizeNativeCallbackUrl(url)
    const parsed = new URL(normalized)

    const code =
      parsed.searchParams.get('code') ||
      new URLSearchParams(parsed.hash.replace(/^#/, '')).get('code')

    if (!code) {
      console.error('[WaitMe][Auth] OAuth callback nativo sin code:', url)
      seenOAuthCallbackUrls.delete(url)
      return
    }

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[WaitMe][Auth] OAuth exchange error:', error)
      seenOAuthCallbackUrls.delete(url)
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
    seenOAuthCallbackUrls.delete(url)
  }
}

export function registerNativeOAuthDeepLink() {
  if (!Capacitor.isNativePlatform() || !supabase) return

  void App.addListener('appUrlOpen', async ({ url }) => {
    await handleNativeOAuthUrl(url)
  })

  void App.getLaunchUrl().then((launch) => {
    if (launch?.url) void handleNativeOAuthUrl(launch.url)
  })
}
