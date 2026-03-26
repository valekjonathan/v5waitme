/**
 * Flujo de estados de auth a nivel store (misma fuente que AuthProvider vía dispatch).
 * No sustituye tests de React; cubre transiciones que la UI debe respetar.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { appReducer, initialAppState } from '../src/store/appStore.js'

function reduce(state, action) {
  return appReducer(state, action)
}

test('flujo: loading → timeout → unauthenticated', () => {
  assert.equal(initialAppState.authStatus, 'loading')
  const s1 = reduce(initialAppState, { type: 'app/AUTH_BOOT_TIMEOUT' })
  assert.equal(s1.authStatus, 'unauthenticated')
})

test('flujo: loading → sync Supabase-off → unauthenticated', () => {
  const s = reduce(initialAppState, {
    type: 'app/AUTH_SYNC',
    payload: { user: null, session: null, authStatus: 'unauthenticated' },
  })
  assert.equal(s.authStatus, 'unauthenticated')
})

test('flujo: unauthenticated → login exitoso → authenticated → signOut vía reducer', () => {
  let s = reduce(initialAppState, {
    type: 'app/AUTH_SYNC',
    payload: { user: null, session: null, authStatus: 'unauthenticated' },
  })
  s = reduce(s, {
    type: 'app/AUTH_SYNC',
    payload: {
      user: { id: 'u1', email: 'x@y.z' },
      session: { access_token: 't' },
      authStatus: 'authenticated',
    },
  })
  assert.equal(s.authStatus, 'authenticated')
  assert.equal(s.user.id, 'u1')

  s = reduce(s, {
    type: 'app/AUTH_SYNC',
    payload: { user: null, session: null, authStatus: 'unauthenticated' },
  })
  assert.equal(s.authStatus, 'unauthenticated')
  assert.equal(s.user, null)
})

test('flujo: timeout no pisa sesión ya establecida', () => {
  let s = reduce(initialAppState, {
    type: 'app/AUTH_SYNC',
    payload: { user: { id: 'z' }, session: {}, authStatus: 'authenticated' },
  })
  s = reduce(s, { type: 'app/AUTH_BOOT_TIMEOUT' })
  assert.equal(s.authStatus, 'authenticated')
})
