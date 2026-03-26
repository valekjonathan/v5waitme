import test from 'node:test'
import assert from 'node:assert/strict'
import { resetKeysChanged } from '../src/lib/errorBoundaryReset.js'

test('resetKeysChanged: null vs null is no change', () => {
  assert.equal(resetKeysChanged(null, null), false)
})

test('resetKeysChanged: null to array is change', () => {
  assert.equal(resetKeysChanged(null, ['home']), true)
  assert.equal(resetKeysChanged(['home'], null), true)
})

test('resetKeysChanged: same primitive keys is no change', () => {
  assert.equal(resetKeysChanged(['home'], ['home']), false)
})

test('resetKeysChanged: screen navigation is change', () => {
  assert.equal(resetKeysChanged(['home'], ['profile']), true)
})

test('resetKeysChanged: length mismatch is change', () => {
  assert.equal(resetKeysChanged(['home'], ['home', 'x']), true)
})
