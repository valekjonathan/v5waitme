import test from 'node:test'
import assert from 'node:assert/strict'
import { buildExceptionCapturePayload } from '../src/lib/exceptionEventPayload.js'

test('buildExceptionCapturePayload: Error instance → campos PostHog $exception', () => {
  const err = new Error('boom')
  err.name = 'TypeError'
  const p = buildExceptionCapturePayload({
    error: err,
    boundaryName: 'shell',
    source: 'ErrorBoundary',
    extra: { componentStack: 'at X' },
  })
  assert.equal(p.$exception_message, 'boom')
  assert.equal(p.$exception_type, 'TypeError')
  assert.match(p.$exception_stack_trace_raw, /boom/)
  assert.equal(p.boundary_name, 'shell')
  assert.equal(p.error_source, 'ErrorBoundary')
  assert.equal(p.error_severity, 'critical')
  assert.equal(p.componentStack, 'at X')
})

test('buildExceptionCapturePayload: valor no-Error → mensaje stringificado', () => {
  const p = buildExceptionCapturePayload({
    error: 'plain',
    source: 'window.onerror',
  })
  assert.equal(p.$exception_message, 'plain')
  assert.equal(p.$exception_type, 'Error')
  assert.equal(p.$exception_stack_trace_raw, '')
  assert.equal(p.error_severity, 'warning')
})

test('buildExceptionCapturePayload: extra omitido no añade basura', () => {
  const p = buildExceptionCapturePayload({ error: new Error('x'), source: 't' })
  assert.equal('componentStack' in p, false)
})

test('buildExceptionCapturePayload: supabase_not_configured -> info', () => {
  const p = buildExceptionCapturePayload({
    error: new Error('supabase_not_configured'),
    source: 'ErrorBoundary',
  })
  assert.equal(p.error_severity, 'info')
})

test('buildExceptionCapturePayload: Mapbox access token missing -> info', () => {
  const p = buildExceptionCapturePayload({
    error: new Error('Mapbox omitido: sin VITE_MAPBOX_ACCESS_TOKEN'),
    source: 'window.onerror',
  })
  assert.equal(p.error_severity, 'info')
})
