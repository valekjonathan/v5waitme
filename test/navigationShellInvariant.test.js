/**
 * Navegación home ↔ profile y recuperación del ErrorBoundary se basan en lógica pura
 * (`reduceAppScreen`, `resetKeysChanged`). Node no puede importar .jsx sin transformar;
 * estos tests validan los invariantes que la UI usa (sin react-dom/jsdom/testing-library).
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { APP_SCREEN_HOME, APP_SCREEN_PROFILE, reduceAppScreen } from '../src/lib/appScreenState.js'
import { resetKeysChanged } from '../src/lib/errorBoundaryReset.js'

function navigate(state, action) {
  return reduceAppScreen(state, action)
}

test('invariante: ir a perfil y volver a home reproduce resetKeys del shell', () => {
  let screen = APP_SCREEN_HOME
  screen = navigate(screen, { type: 'openProfile' })
  assert.equal(screen, APP_SCREEN_PROFILE)
  assert.equal(resetKeysChanged([APP_SCREEN_HOME], [screen]), true)

  const prevKeys = [screen]
  screen = navigate(screen, { type: 'openHome' })
  assert.equal(screen, APP_SCREEN_HOME)
  assert.equal(resetKeysChanged(prevKeys, [screen]), true)
})

test('invariante: mismo screen → resetKeys sin cambio (boundary sigue en error hasta otro cambio)', () => {
  assert.equal(resetKeysChanged([APP_SCREEN_HOME], [APP_SCREEN_HOME]), false)
})

test('invariante: transición no rompe secuencia de estados válidos', () => {
  assert.equal(navigate(APP_SCREEN_PROFILE, { type: 'openProfile' }), APP_SCREEN_PROFILE)
  assert.equal(navigate(APP_SCREEN_HOME, { type: 'openHome' }), APP_SCREEN_HOME)
})
