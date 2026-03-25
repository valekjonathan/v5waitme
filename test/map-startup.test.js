import test from 'node:test'
import assert from 'node:assert/strict'
import { getMapboxAccessToken } from '../src/features/map/constants/mapbox.js'

test('getMapboxAccessToken: returns token from env object', () => {
  const token = getMapboxAccessToken({ VITE_MAPBOX_ACCESS_TOKEN: 'abc123' })
  assert.equal(token, 'abc123')
})

test('getMapboxAccessToken: trims token', () => {
  const token = getMapboxAccessToken({ VITE_MAPBOX_ACCESS_TOKEN: '  abc123  ' })
  assert.equal(token, 'abc123')
})

test('getMapboxAccessToken: returns null when token missing', () => {
  assert.equal(getMapboxAccessToken({}), null)
})

test('getMapboxAccessToken: returns null when token blank', () => {
  assert.equal(getMapboxAccessToken({ VITE_MAPBOX_ACCESS_TOKEN: '   ' }), null)
})
