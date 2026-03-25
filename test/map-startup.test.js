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

test('getMapboxAccessToken: throws when token missing', () => {
  assert.throws(
    () => getMapboxAccessToken({}),
    /Missing VITE_MAPBOX_ACCESS_TOKEN/,
  )
})

test('getMapboxAccessToken: throws when token blank', () => {
  assert.throws(
    () => getMapboxAccessToken({ VITE_MAPBOX_ACCESS_TOKEN: '   ' }),
    /Missing VITE_MAPBOX_ACCESS_TOKEN/,
  )
})
