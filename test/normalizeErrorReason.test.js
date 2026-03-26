import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeToError } from '../src/lib/normalizeErrorReason.js'

test('normalizeToError: devuelve misma instancia si ya es Error', () => {
  const e = new Error('a')
  assert.equal(normalizeToError(e), e)
})

test('normalizeToError: null usa fallback', () => {
  const e = normalizeToError(null, 'fb')
  assert.equal(e.message, 'fb')
})

test('normalizeToError: string', () => {
  assert.equal(normalizeToError('oops').message, 'oops')
})

test('normalizeToError: objeto con message tipo API', () => {
  const e = normalizeToError({ name: 'AuthApiError', message: 'token bad', stack: 'stackline' })
  assert.equal(e.message, 'token bad')
  assert.equal(e.name, 'AuthApiError')
  assert.equal(e.stack, 'stackline')
})

test('normalizeToError: objeto sin message → JSON', () => {
  const e = normalizeToError({ code: 418 })
  assert.ok(e.message.includes('418'))
})
