/** Cobertura de createPositionGuard — fuera del pipeline en cabecera de src/services/location.js. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { createPositionGuard, sendEventToBackend } from '../src/services/location.js'

function point({ lat = 43.3619, lng = -5.8494, accuracy = 20, ts = 1000 } = {}) {
  return { lat, lng, accuracy, ts }
}

test('createPositionGuard: rejects impossible jump', () => {
  const guard = createPositionGuard()
  const base = guard(point({ ts: 1000 }))
  assert.ok(base)

  const jump = guard(point({ lat: 43.5, lng: -5.2, accuracy: 22, ts: 2000 }))
  assert.equal(jump, null)
})

test('createPositionGuard: smooths jitter and keeps fields', () => {
  const guard = createPositionGuard()
  const p1 = guard(point({ ts: 1000, accuracy: 25 }))
  const p2 = guard(point({ lat: 43.36191, lng: -5.84939, ts: 2000, accuracy: 28 }))

  assert.ok(p2)
  assert.equal(typeof p2.confidence, 'number')
  assert.ok(['searching', 'unstable', 'stable', 'lost'].includes(p2.tracking))
  assert.notEqual(p2.lat, p1.lat)
})

test('createPositionGuard: tracking transitions to stable after consistent good points', () => {
  const guard = createPositionGuard()
  const p1 = guard(point({ ts: 1000, accuracy: 14 }))
  const p2 = guard(point({ lat: 43.36194, lng: -5.84938, ts: 2500, accuracy: 14 }))
  const p3 = guard(point({ lat: 43.36199, lng: -5.84935, ts: 4200, accuracy: 13 }))

  assert.equal(p1.tracking, 'searching')
  assert.equal(p2.tracking, 'searching')
  assert.equal(p3.tracking, 'stable')
})

test('createPositionGuard: confidence is higher in good scenario than bad scenario', () => {
  const good = createPositionGuard()
  good(point({ ts: 1000, accuracy: 12 }))
  const goodOut = good(point({ lat: 43.36195, lng: -5.84937, ts: 2600, accuracy: 12 }))

  const bad = createPositionGuard()
  bad(point({ ts: 1000, accuracy: 120 }))
  const badOut = bad(point({ lat: 43.3624, lng: -5.8488, ts: 1700, accuracy: 150 }))

  assert.ok(goodOut.confidence > badOut.confidence)
})

test('createPositionGuard: reaches unstable/lost on repeated poor samples', () => {
  const guard = createPositionGuard()
  guard(point({ ts: 1000, accuracy: 20 }))

  const u1 = guard(point({ lat: 43.3622, lng: -5.8489, ts: 1800, accuracy: 220 }))
  const u2 = guard(point({ lat: 43.3625, lng: -5.8486, ts: 2600, accuracy: 320 }))
  const u3 = guard(point({ lat: 43.3627, lng: -5.8482, ts: 3400, accuracy: 420 }))

  assert.ok(['searching', 'unstable', 'lost'].includes(u1.tracking))
  assert.ok(['unstable', 'lost'].includes(u2.tracking))
  assert.ok(['unstable', 'lost'].includes(u3.tracking))
})

test('createPositionGuard: trajectoryValidator can drop sample', () => {
  const guard = createPositionGuard({
    trajectoryValidator: () => ({ drop: true, reason: 'server_reject' }),
  })

  const first = guard(point({ ts: 1000 }))
  const second = guard(point({ ts: 2200, lat: 43.362, lng: -5.849 }))

  assert.ok(first)
  assert.equal(second, null)
})

test('createPositionGuard: trajectoryValidator confidence penalty is applied', () => {
  const baseGuard = createPositionGuard()
  baseGuard(point({ ts: 1000, accuracy: 20 }))
  const base = baseGuard(point({ ts: 2400, lat: 43.362, lng: -5.8492, accuracy: 20 }))

  const penalizedGuard = createPositionGuard({
    trajectoryValidator: () => ({ confidencePenalty: 0.2 }),
  })
  penalizedGuard(point({ ts: 1000, accuracy: 20 }))
  const penalized = penalizedGuard(point({ ts: 2400, lat: 43.362, lng: -5.8492, accuracy: 20 }))

  assert.ok(base.confidence > penalized.confidence)
})

test('createPositionGuard: emits observability events', () => {
  const events = []
  const guard = createPositionGuard({ onEvent: (event) => events.push(event) })

  guard(point({ ts: 1000, accuracy: 300 }))
  guard(point({ ts: 2000, lat: 43.36001, lng: -5.84001, accuracy: 310 }))

  assert.ok(events.some((event) => event.type === 'tracking_changed'))
})

test('createPositionGuard: persistEvent receives normalized event stream', () => {
  const persisted = []
  const guard = createPositionGuard({ persistEvent: (event) => persisted.push(event) })

  guard(point({ ts: 1000, accuracy: 20 }))
  guard(point({ ts: 2000, lat: 43.9, lng: -3.9, accuracy: 20 }))

  assert.ok(persisted.some((event) => event.type === 'tracking_changed'))
  assert.ok(persisted.some((event) => event.type === 'position_discarded'))

  for (const event of persisted) {
    assert.ok(Object.hasOwn(event, 'type'))
    assert.ok(Object.hasOwn(event, 'timestamp'))
    assert.ok(Object.hasOwn(event, 'lat'))
    assert.ok(Object.hasOwn(event, 'lng'))
    assert.ok(Object.hasOwn(event, 'accuracy'))
    assert.ok(Object.hasOwn(event, 'confidence'))
    assert.ok(Object.hasOwn(event, 'tracking'))
  }
})

test('sendEventToBackend: returns false when forward flag or endpoint is missing', async () => {
  const sent = await sendEventToBackend({ type: 'tracking_changed' })
  assert.equal(sent, false)
})
