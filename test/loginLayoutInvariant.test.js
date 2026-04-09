import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

function read(rel) {
  return fs.readFileSync(path.join(process.cwd(), rel), 'utf8')
}

test('LoginPage -> MainLayout con LoginButtons como children', () => {
  const code = read('src/features/auth/components/LoginPage.jsx')
  assert.match(code, /<MainLayout\b/i)
  assert.match(code, /<LoginButtons\s*\/?>/i)
  assert.match(code, /import\s+LoginButtons\s+from\s+'.*LoginButtons'/i)
})

test('LoginButtons -> ambos CTAs OAuth + usa ButtonBase', () => {
  const code = read('src/features/auth/components/LoginButtons.jsx')
  assert.match(code, /Continuar\s+con\s+Google/i)
  assert.match(code, /Continuar\s+con\s+Apple/i)
  assert.match(code, /<ButtonBase\b/i)

  // No se permiten hacks de marginLeft para centrar/alinear.
  assert.equal(/marginLeft\s*:\s*2/.test(code), false)
  assert.match(code, /const\s+appleIconStyle\s*=\s*\{[\s\S]*\}/)
})

test('ButtonBase: buttonContent centrado como bloque compacto', () => {
  const code = read('src/ui/primitives/ButtonBase.jsx')

  // justifyContent debe ser center para que el bloque icono+texto se mantenga compacto y centrado.
  assert.match(code, /const\s+buttonContent\s*=\s*\{[\s\S]*?justifyContent:\s*'center'/)

  // buttonContent NO debe volver a expandirse con width: '100%'.
  const m = code.match(/const\s+buttonContent\s*=\s*\{([\s\S]*?)\}/)
  const inner = String(m?.[1] ?? '')
  assert.equal(/width\s*:\s*'100%'\s*,?/.test(inner), false)
})

test('ButtonBase: textSlot NO debe tener flex: 1', () => {
  const code = read('src/ui/primitives/ButtonBase.jsx')
  const m = code.match(/const\s+textSlot\s*=\s*\{([\s\S]*?)\}/)
  const inner = String(m?.[1] ?? '')
  assert.equal(/flex\s*:\s*1\s*,?/.test(inner), false)
})

test('ButtonBase: icono y texto comparten el mismo contenedor directo', () => {
  const code = read('src/ui/primitives/ButtonBase.jsx')
  assert.match(
    code,
    /<div\s+style=\{buttonContent\}>[\s\S]*<div\s+style=\{iconSlot\}>[\s\S]*<div\s+style=\{textSlot\}>/
  )
})

test('MainLayout: hero WaitMe!->subtítulo; CenterPin en hero + MapViewportCenterPin medición; HomePage delega en MainLayout', () => {
  const main = read('src/features/shared/components/MainLayout.jsx')
  const home = read('src/features/home/components/HomePage.jsx')
  const map = read('src/features/map/components/Map.jsx')

  assert.match(home, /import\s+MainLayout\s+from\s+'.*MainLayout'/i)
  assert.match(home, /<MainLayout\b/)
  assert.match(home, /¿Dónde quieres aparcar\?/)
  assert.match(home, /¡Estoy aparcado aquí!/)

  assert.match(
    main,
    /<h1\s+style=\{heroTitleStyle\}>[\s\S]*Wait[\s\S]*<span\s+style=\{meTextStyle\}>Me!<\/span>[\s\S]*<\/h1>/
  )
  assert.match(
    main,
    /<p\s+data-home-subtitle\s+style=\{heroSubtitleStyle\}>[\s\S]*Aparca[\s\S]*donde\s+te[\s\S]*<span\s+style=\{meTextStyle\}>avisen!<\/span>[\s\S]*<\/p>/
  )
  assert.match(map, /MapViewportCenterPin/)
  assert.match(main, /<CenterPin\b/)
  assert.match(main, /hideViewportCenterPin/)
  assert.match(main, /\{hasCta \?/)
})

test('HomePage: sin UI de alertas', () => {
  const code = read('src/features/home/components/HomePage.jsx')
  assert.equal(code.includes('Crear alerta'), false)
  assert.equal(code.includes('CardBase'), false)
})
