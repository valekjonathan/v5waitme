import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

function read(rel) {
  return fs.readFileSync(path.join(process.cwd(), rel), 'utf8')
}

function assertNotIncludes(haystack, needle, message) {
  assert.equal(haystack.includes(needle), false, message)
}

test('LoginPage: MainLayout envuelve LoginButtons', () => {
  const code = read('src/features/auth/components/LoginPage.jsx')
  assert.match(code, /<MainLayout\b/i, 'LoginPage debe usar MainLayout')
  assert.match(
    code,
    /loginEntrance/i,
    'LoginPage sigue pasando loginEntrance (MainLayout lo acepta; entrada instantánea)'
  )
  assert.match(code, /<LoginButtons\s*\/?>/i, 'LoginPage debe renderizar LoginButtons')
  assert.match(
    code,
    /import\s+MainLayout\s+from\s+'.*MainLayout'/i,
    'LoginPage debe importar MainLayout'
  )
  assert.match(
    code,
    /import\s+LoginButtons\s+from\s+'.*LoginButtons'/i,
    'LoginPage debe importar LoginButtons'
  )
})

test('LoginButtons: render básico de ambos CTA OAuth', () => {
  const code = read('src/features/auth/components/LoginButtons.jsx')
  assert.match(
    code,
    /Continuar\s+con\s+Google/i,
    'LoginButtons debe contener el CTA “Continuar con Google”'
  )
  assert.match(
    code,
    /Continuar\s+con\s+Apple/i,
    'LoginButtons debe contener el CTA “Continuar con Apple”'
  )
  assert.match(code, /<ButtonBase\b/i, 'LoginButtons debe usar ButtonBase para icono+texto')
})

test('Login: no debe introducir style inline object en JSX crítico', () => {
  const files = [
    'src/features/auth/components/LoginButtons.jsx',
    'src/features/auth/components/LoginPage.jsx',
    'src/features/home/components/HomePage.jsx',
    'src/features/shared/components/MainLayout.jsx',
  ]
  for (const f of files) {
    const code = read(f)
    assertNotIncludes(code, 'style={{', `No debe aparecer “style={{” en ${f}`)
  }
})

test('ButtonBase: el contenedor de contenido debe centrarse como bloque compacto', () => {
  const code = read('src/ui/primitives/ButtonBase.jsx')
  // Asegura que buttonContent centra el bloque icon+texto.
  assert.match(
    code,
    /const\s+buttonContent\s*=\s*\{[^}]*justifyContent:\s*'center'/s,
    'buttonContent debe tener justifyContent: "center"'
  )
  // Asegura que no se reintroduzca width: 100% dentro del buttonContent (evita expansión del bloque).
  assert.match(code, /const\s+buttonContent\s*=\s*\{([\s\S]*?)\}/, 'buttonContent debe existir')
  const m = code.match(/const\s+buttonContent\s*=\s*\{([\s\S]*?)\}/)
  const inner = String(m?.[1] ?? '')
  assert.equal(
    /width\s*:\s*'100%'\s*,?/.test(inner),
    false,
    'buttonContent NO debe volver a tener width: "100%"'
  )
})
