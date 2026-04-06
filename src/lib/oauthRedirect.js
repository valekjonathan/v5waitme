/**
 * Deep link OAuth (PKCE) para iOS/Android vía Capacitor.
 * Debe coincidir con CFBundleURLSchemes en Info.plist y estar en Supabase → Auth → Redirect URLs.
 */
export const NATIVE_OAUTH_REDIRECT_URL = 'es.waitme.v5waitme://auth-callback'

export function isNativeOAuthCallbackUrl(url) {
  return typeof url === 'string' && url.startsWith('es.waitme.v5waitme://')
}
