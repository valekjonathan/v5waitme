import test from 'node:test'
import assert from 'node:assert/strict'
import { APP_SCREEN_HOME, APP_SCREEN_PROFILE, reduceAppScreen } from '../src/lib/appScreenState.js'

test('reduceAppScreen: initial home stays on unknown action', () => {
  assert.equal(reduceAppScreen(APP_SCREEN_HOME, { type: 'noop' }), APP_SCREEN_HOME)
})

test('reduceAppScreen: openProfile from home', () => {
  assert.equal(reduceAppScreen(APP_SCREEN_HOME, { type: 'openProfile' }), APP_SCREEN_PROFILE)
})

test('reduceAppScreen: openHome from profile', () => {
  assert.equal(reduceAppScreen(APP_SCREEN_PROFILE, { type: 'openHome' }), APP_SCREEN_HOME)
})

test('reduceAppScreen: openHome idempotent', () => {
  assert.equal(reduceAppScreen(APP_SCREEN_HOME, { type: 'openHome' }), APP_SCREEN_HOME)
})
