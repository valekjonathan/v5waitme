import test from 'node:test'
import assert from 'node:assert/strict'
import {
  APP_SCREEN_ALERTS,
  APP_SCREEN_CHATS,
  APP_SCREEN_HOME,
  APP_SCREEN_PARK_HERE,
  APP_SCREEN_PROFILE,
  APP_SCREEN_SEARCH_PARKING,
  reduceAppScreen,
} from '../src/lib/appScreenState.js'

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

test('reduceAppScreen: openSearchParking', () => {
  assert.equal(reduceAppScreen(APP_SCREEN_HOME, { type: 'openSearchParking' }), APP_SCREEN_SEARCH_PARKING)
})

test('reduceAppScreen: openParkHere', () => {
  assert.equal(reduceAppScreen(APP_SCREEN_HOME, { type: 'openParkHere' }), APP_SCREEN_PARK_HERE)
})

test('reduceAppScreen: openAlerts', () => {
  assert.equal(reduceAppScreen(APP_SCREEN_HOME, { type: 'openAlerts' }), APP_SCREEN_ALERTS)
})

test('reduceAppScreen: openChats', () => {
  assert.equal(reduceAppScreen(APP_SCREEN_HOME, { type: 'openChats' }), APP_SCREEN_CHATS)
})
