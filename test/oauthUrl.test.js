import test from 'node:test'
import assert from 'node:assert/strict'
import { consumeOAuthUrlError } from '../src/services/auth.js'

function withMockWindow(run) {
  const had = Object.prototype.hasOwnProperty.call(globalThis, 'window')
  const prev = globalThis.window
  try {
    return run()
  } finally {
    if (had) globalThis.window = prev
    else delete globalThis.window
  }
}

test('consumeOAuthUrlError: returns null without window', () => {
  withMockWindow(() => {
    delete globalThis.window
    assert.equal(consumeOAuthUrlError(), null)
  })
})

test('consumeOAuthUrlError: reads query error, cleans URL, returns decoded message', () => {
  withMockWindow(() => {
    const loc = { href: 'https://app.test/cb?error=access_denied&error_description=hello%2Bworld' }
    let replaced = ''
    globalThis.window = {
      location: loc,
      history: {
        replaceState(_a, _b, url) {
          replaced = url
          loc.href = `https://app.test${url.startsWith('/') ? '' : '/'}${url}`
        },
      },
    }
    const msg = consumeOAuthUrlError()
    // URLSearchParams decodifica %2B como '+'; luego el código normaliza '+' a espacio antes de decodeURIComponent.
    assert.equal(msg, 'hello world')
    assert.equal(replaced, '/cb')
    assert.equal(loc.href.includes('error'), false)
  })
})

test('consumeOAuthUrlError: reads hash fragment when query empty', () => {
  withMockWindow(() => {
    const loc = { href: 'https://app.test/x#error=failed&error_description=bad' }
    globalThis.window = {
      location: loc,
      history: {
        replaceState(_a, _b, url) {
          loc.href = `https://app.test${url}`
        },
      },
    }
    const msg = consumeOAuthUrlError()
    assert.equal(msg, 'bad')
    assert.ok(!loc.href.includes('error_description'))
  })
})

test('consumeOAuthUrlError: returns null when no error params', () => {
  withMockWindow(() => {
    const loc = { href: 'https://app.test/ok?foo=1' }
    globalThis.window = {
      location: loc,
      history: { replaceState: () => {} },
    }
    assert.equal(consumeOAuthUrlError(), null)
  })
})
