import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

function read(rel) {
  return fs.readFileSync(path.join(process.cwd(), rel), 'utf8')
}

test('App: --app-height usa innerHeight en standalone (PWA iOS) y visualViewport en navegador normal', () => {
  const code = read('src/app/App.jsx')
  assert.match(code, /display-mode:\s*standalone/)
  assert.match(code, /navigator\?\.\s*standalone\s*===\s*true/)
  assert.match(code, /isStandalone\s*\?\s*window\.innerHeight\s*:/)
  assert.match(code, /window\.visualViewport\?\./)
})

