import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getCurrentUser,
  getSession,
  isNativeOAuthCallbackUrl,
  resolveWebOAuthRedirectTo,
  shouldUseNativeOAuthFlow,
  signInWithGoogle,
  signOut,
} from '../src/services/auth.js'

test('getCurrentUser sin Supabase configurado devuelve null', async () => {
  const user = await getCurrentUser()
  assert.equal(user, null)
})

test('getSession sin Supabase devuelve sesión null y sin error', async () => {
  const { data, error } = await getSession()
  assert.equal(data.session, null)
  assert.equal(error, null)
})

test('signOut sin Supabase devuelve error null', async () => {
  const { error } = await signOut()
  assert.equal(error, null)
})

test('signInWithGoogle sin Supabase devuelve error controlado', async () => {
  const { data, error } = await signInWithGoogle()
  assert.equal(data, null)
  assert.ok(error instanceof Error)
  assert.match(error.message, /supabase_not_configured/i)
})

test('isNativeOAuthCallbackUrl reconoce redirect iOS y variantes de mayúsculas', () => {
  assert.equal(isNativeOAuthCallbackUrl('es.waitme.v5waitme://auth-callback?code=x'), true)
  assert.equal(isNativeOAuthCallbackUrl('es.waitme.v5waitme://Auth-Callback?code=x'), true)
  assert.equal(isNativeOAuthCallbackUrl('es.waitme.v5waitme://auth/callback?code=x'), false)
  assert.equal(isNativeOAuthCallbackUrl('https://example.com/callback?code=x'), false)
})

test('resolveWebOAuthRedirectTo: prod usa origen de la pestaña + /auth/callback', () => {
  assert.equal(
    resolveWebOAuthRedirectTo({
      windowOrigin: 'https://app.example.com',
      hostname: 'app.example.com',
      isProd: true,
      devLanOrigin: '',
    }),
    'https://app.example.com/auth/callback'
  )
})

test('resolveWebOAuthRedirectTo: dev en loopback con VITE_DEV_LAN_ORIGIN usa LAN (iPhone OAuth)', () => {
  assert.equal(
    resolveWebOAuthRedirectTo({
      windowOrigin: 'http://localhost:5173',
      hostname: 'localhost',
      isProd: false,
      devLanOrigin: 'http://192.168.0.55:5173',
    }),
    'http://192.168.0.55:5173/auth/callback'
  )
})

test('resolveWebOAuthRedirectTo: dev ya en IP LAN no sustituye por LAN', () => {
  assert.equal(
    resolveWebOAuthRedirectTo({
      windowOrigin: 'http://192.168.0.55:5173',
      hostname: '192.168.0.55',
      isProd: false,
      devLanOrigin: 'http://192.168.0.99:5173',
    }),
    'http://192.168.0.55:5173/auth/callback'
  )
})

test('resolveWebOAuthRedirectTo: dev loopback sin LAN cae en origen actual', () => {
  assert.equal(
    resolveWebOAuthRedirectTo({
      windowOrigin: 'http://127.0.0.1:5173',
      hostname: '127.0.0.1',
      isProd: false,
      devLanOrigin: '',
    }),
    'http://127.0.0.1:5173/auth/callback'
  )
})

test('shouldUseNativeOAuthFlow: true si isNativePlatform() es true', () => {
  assert.equal(
    shouldUseNativeOAuthFlow({
      isNativePlatform: () => true,
      locationProtocol: 'http:',
    }),
    true
  )
})

test('shouldUseNativeOAuthFlow: true si protocolo capacitor: (WKWebView aunque falle el bridge)', () => {
  assert.equal(
    shouldUseNativeOAuthFlow({
      isNativePlatform: () => false,
      locationProtocol: 'capacitor:',
    }),
    true
  )
})

test('shouldUseNativeOAuthFlow: false en navegador https normal', () => {
  assert.equal(
    shouldUseNativeOAuthFlow({
      isNativePlatform: () => false,
      locationProtocol: 'https:',
    }),
    false
  )
})

test('shouldUseNativeOAuthFlow: true si hay puente nativo (misma heurística que Capacitor core)', () => {
  assert.equal(
    shouldUseNativeOAuthFlow({
      isNativePlatform: () => false,
      hasNativeBridge: true,
      locationProtocol: 'https:',
    }),
    true
  )
})
