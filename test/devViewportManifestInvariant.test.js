import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

function read(rel) {
  return fs.readFileSync(path.join(process.cwd(), rel), 'utf8')
}

test('App usa DevViewport en lugar de IphoneFrame', () => {
  const code = read('src/app/App.jsx')
  assert.match(code, /import\s+DevViewport\s+from\s+'.*DevViewport/)
  assert.doesNotMatch(code, /IphoneFrame/)
})

test('manifest PWA mantiene start_url limpio y display standalone', () => {
  const manifest = JSON.parse(read('public/manifest.json'))
  assert.equal(manifest.id, '/')
  assert.equal(manifest.start_url, '/')
  assert.equal(manifest.scope, '/')
  assert.deepEqual(manifest.display_override, ['standalone'])
  assert.equal(manifest.display, 'standalone')
  assert.equal(String(manifest.start_url).includes('?'), false)
})

test('ScreenShell mantiene chrome posicionado relativo al shell, no al viewport global', () => {
  const shell = read('src/ui/layout/ScreenShell.tsx')
  const header = read('src/ui/Header.jsx')
  const nav = read('src/ui/BottomNav.jsx')

  assert.match(shell, /position:\s*'relative'/)
  assert.match(header, /position:\s*'absolute'/)
  assert.match(nav, /position:\s*'absolute'/)
  assert.doesNotMatch(header, /position:\s*'fixed'/)
  assert.doesNotMatch(nav, /position:\s*'fixed'/)
})
