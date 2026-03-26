import test from 'node:test'
import assert from 'node:assert/strict'
import { getCurrentUser, getSession, signInWithGoogle, signOut } from '../src/services/auth.js'

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
