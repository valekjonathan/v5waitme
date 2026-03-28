import test from 'node:test'
import assert from 'node:assert/strict'
import { isAppProfileComplete } from '../src/services/profile.js'

test('isAppProfileComplete: false sin datos', () => {
  assert.equal(isAppProfileComplete(null), false)
  assert.equal(isAppProfileComplete({}), false)
})

test('isAppProfileComplete: true con mínimos', () => {
  assert.equal(
    isAppProfileComplete({
      full_name: 'Ana',
      phone: '+34 600 00 00',
      brand: 'Seat',
      model: 'Ibiza',
      plate: '1234 ABC',
    }),
    true
  )
})

test('isAppProfileComplete: false si falta matrícula corta', () => {
  assert.equal(
    isAppProfileComplete({
      full_name: 'Ana',
      phone: '+346000000',
      brand: 'Seat',
      model: 'Ibiza',
      plate: '12',
    }),
    false
  )
})

test('isAppProfileComplete: false si falta nombre', () => {
  assert.equal(
    isAppProfileComplete({
      full_name: '',
      phone: '+346000000',
      brand: 'Seat',
      model: 'Ibiza',
      plate: '1234 ABC',
    }),
    false
  )
})
