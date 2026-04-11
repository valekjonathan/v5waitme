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

test('App.jsx: MainLayout login envuelve LoginPage (un solo shell; LoginPage solo CTAs)', () => {
  const app = read('src/app/App.jsx')
  const login = read('src/features/auth/components/LoginPage.jsx')
  assert.match(app, /<MainLayout\s+loginEntrance/i, 'App debe envolver el login con MainLayout loginEntrance')
  assert.match(app, /<LoginPage\s*\/?>/i, 'App debe renderizar LoginPage dentro de MainLayout')
  assert.match(login, /<LoginButtons\s*\/?>/i, 'LoginPage debe renderizar LoginButtons')
  assert.equal(/import\s+MainLayout/.test(login), false, 'LoginPage no debe importar MainLayout')
  assert.match(
    login,
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
