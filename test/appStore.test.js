import test from 'node:test'
import assert from 'node:assert/strict'
import { appReducer, initialAppState } from '../src/store/appStore.js'

test('appReducer: AUTH_SYNC sets authenticated user', () => {
  const user = { id: 'u1', email: 'a@b.c' }
  const session = { access_token: 't' }
  const next = appReducer(initialAppState, {
    type: 'app/AUTH_SYNC',
    payload: { user, session, authStatus: 'authenticated' },
  })
  assert.equal(next.authStatus, 'authenticated')
  assert.equal(next.user, user)
  assert.equal(next.session, session)
  assert.equal(next.profileBootstrapReady, false)
})

test('appReducer: AUTH_SYNC same user does not reset profileBootstrapReady', () => {
  const user = { id: 'u1', email: 'a@b.c' }
  const step1 = appReducer(initialAppState, {
    type: 'app/AUTH_SYNC',
    payload: { user, session: {}, authStatus: 'authenticated' },
  })
  const step2 = appReducer(step1, {
    type: 'app/PROFILE_BOOTSTRAP',
    payload: { isNewUser: false, isProfileComplete: true },
  })
  const step3 = appReducer(step2, {
    type: 'app/AUTH_SYNC',
    payload: { user, session: { access_token: 'refreshed' }, authStatus: 'authenticated' },
  })
  assert.equal(step3.profileBootstrapReady, true)
  assert.equal(step3.isProfileComplete, true)
})

test('appReducer: PROFILE_BOOTSTRAP and PROFILE_MARK_COMPLETE', () => {
  const authed = appReducer(initialAppState, {
    type: 'app/AUTH_SYNC',
    payload: { user: { id: 'u1' }, session: {}, authStatus: 'authenticated' },
  })
  const boot = appReducer(authed, {
    type: 'app/PROFILE_BOOTSTRAP',
    payload: { isNewUser: true, isProfileComplete: false },
  })
  assert.equal(boot.isNewUser, true)
  assert.equal(boot.isProfileComplete, false)
  assert.equal(boot.profileBootstrapReady, true)
  const done = appReducer(boot, { type: 'app/PROFILE_MARK_COMPLETE' })
  assert.equal(done.isNewUser, false)
  assert.equal(done.isProfileComplete, true)
})

test('appReducer: AUTH_SYNC clears session when unauthenticated', () => {
  const loggedIn = appReducer(initialAppState, {
    type: 'app/AUTH_SYNC',
    payload: {
      user: { id: 'u1' },
      session: {},
      authStatus: 'authenticated',
    },
  })
  const next = appReducer(loggedIn, {
    type: 'app/AUTH_SYNC',
    payload: { user: null, session: null, authStatus: 'unauthenticated' },
  })
  assert.equal(next.authStatus, 'unauthenticated')
  assert.equal(next.user, null)
  assert.equal(next.session, null)
})

test('appReducer: AUTH_BOOT_TIMEOUT only from loading', () => {
  const fromLoading = appReducer(initialAppState, { type: 'app/AUTH_BOOT_TIMEOUT' })
  assert.equal(fromLoading.authStatus, 'unauthenticated')
  assert.equal(fromLoading.user, null)
  assert.equal(fromLoading.profileBootstrapReady, true)

  const authed = appReducer(initialAppState, {
    type: 'app/AUTH_SYNC',
    payload: { user: { id: 'x' }, session: {}, authStatus: 'authenticated' },
  })
  const afterTimeout = appReducer(authed, { type: 'app/AUTH_BOOT_TIMEOUT' })
  assert.equal(afterTimeout.authStatus, 'authenticated')
  assert.equal(afterTimeout.user.id, 'x')
})

test('appReducer: PUSH_ERROR appends with message', () => {
  const next = appReducer(initialAppState, {
    type: 'app/PUSH_ERROR',
    payload: { message: 'fallo', meta: { code: 1 } },
  })
  assert.equal(next.globalErrors.length, 1)
  assert.equal(next.globalErrors[0].message, 'fallo')
  assert.equal(next.globalErrors[0].meta.code, 1)
  assert.ok(typeof next.globalErrors[0].id === 'string')
})

test('appReducer: CLEAR_ERRORS empties list', () => {
  const withErr = appReducer(initialAppState, {
    type: 'app/PUSH_ERROR',
    payload: { message: 'a' },
  })
  const cleared = appReducer(withErr, { type: 'app/CLEAR_ERRORS' })
  assert.equal(cleared.globalErrors.length, 0)
})

test('appReducer: DISMISS_ERROR removes by id', () => {
  const withErr = appReducer(initialAppState, {
    type: 'app/PUSH_ERROR',
    payload: { message: 'a' },
  })
  const id = withErr.globalErrors[0].id
  const next = appReducer(withErr, { type: 'app/DISMISS_ERROR', payload: id })
  assert.equal(next.globalErrors.length, 0)
})

test('appReducer: GLOBAL_LOADING toggles', () => {
  const on = appReducer(initialAppState, { type: 'app/GLOBAL_LOADING', payload: true })
  assert.equal(on.globalLoading, true)
  const off = appReducer(on, { type: 'app/GLOBAL_LOADING', payload: false })
  assert.equal(off.globalLoading, false)
})

test('appReducer: unknown action returns same state reference', () => {
  const next = appReducer(initialAppState, { type: 'app/UNKNOWN' })
  assert.equal(next, initialAppState)
})
