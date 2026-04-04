import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_PITCH,
  DEFAULT_ZOOM,
  getMapboxAccessToken,
  OVIEDO_LAT,
  OVIEDO_LNG,
  reapplyMapVisualLayers,
} from '../src/features/map/constants/mapbox.js'

test('map defaults: fallback GPS y zoom usables', () => {
  assert.ok(Number.isFinite(OVIEDO_LAT) && Math.abs(OVIEDO_LAT) <= 90)
  assert.ok(Number.isFinite(OVIEDO_LNG) && Math.abs(OVIEDO_LNG) <= 180)
  assert.ok(DEFAULT_ZOOM > 0 && DEFAULT_ZOOM <= 22)
  assert.ok(DEFAULT_PITCH >= 0 && DEFAULT_PITCH <= 85)
})

test('reapplyMapVisualLayers: map null es no-op', () => {
  assert.doesNotThrow(() => reapplyMapVisualLayers(null, true))
})

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
