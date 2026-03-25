/**
 * Build → git add . → commit fijo → push origin main (sin prompts).
 * Vercel despliega al recibir push si el proyecto está importado desde GitHub en vercel.com.
 *
 * Requiere: rama main, remote origin correcto, credenciales git para push.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const EXPECTED_ORIGIN = 'https://github.com/valekjonathan/v5waitme.git'
const COMMIT_MSG = 'auto: update'

function run(cmd, args, { allowFail = false } = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: root })
  if (!allowFail && r.status !== 0) process.exit(r.status ?? 1)
  return r.status === 0
}

function output(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', cwd: root })
  return (r.stdout || '').trim()
}

function canonicalRemote(u) {
  if (!u) return ''
  let s = u.trim()
  if (s.startsWith('git@github.com:')) {
    s = `https://github.com/${s.slice('git@github.com:'.length)}`
  }
  return s.replace(/\.git$/i, '').toLowerCase()
}

function assertOrigin() {
  const url = output('git', ['remote', 'get-url', 'origin'])
  const actual = canonicalRemote(url)
  const expected = canonicalRemote(EXPECTED_ORIGIN)
  if (!actual || actual !== expected) {
    console.error(`[auto-ship] ERROR: origin debe apuntar a ${EXPECTED_ORIGIN}`)
    console.error(`[auto-ship] Actual: ${url || '(sin origin)'}`)
    process.exit(1)
  }
}

function assertMain() {
  const b = output('git', ['rev-parse', '--abbrev-ref', 'HEAD'])
  if (b !== 'main') {
    console.error(`[auto-ship] ERROR: debes estar en main (actual: ${b}).`)
    process.exit(1)
  }
}

function readVercelJson() {
  const p = join(root, 'vercel.json')
  if (!existsSync(p)) {
    console.error('[auto-ship] ERROR: falta vercel.json')
    process.exit(1)
  }
  return JSON.parse(readFileSync(p, 'utf8'))
}

function assertVercelConfig() {
  const v = readVercelJson()
  if (v.buildCommand !== 'npm run build') {
    console.error('[auto-ship] ERROR: vercel.json buildCommand debe ser "npm run build".')
    process.exit(1)
  }
  if (v.outputDirectory !== 'dist') {
    console.error('[auto-ship] ERROR: vercel.json outputDirectory debe ser "dist".')
    process.exit(1)
  }
}

function vercelConnectionHint() {
  const linked = existsSync(join(root, '.vercel', 'project.json'))
  if (!linked) {
    console.error('')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('[auto-ship] AVISO VERCEL')
    console.error('No hay .vercel/project.json (normal tras clone o si no usas `vercel link`).')
    console.error('Para deploy automático en cada push: en https://vercel.com importa el repo')
    console.error('  https://github.com/valekjonathan/v5waitme')
    console.error('y conecta la rama main. Sin eso, el push a GitHub no generará deploy.')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('')
  }
}

assertOrigin()
assertMain()
assertVercelConfig()
vercelConnectionHint()

console.error('[auto-ship] npm run lint')
run('npm', ['run', 'lint'])

console.error('[auto-ship] npm run test')
run('npm', ['run', 'test'])

console.error('[auto-ship] npm run build')
run('npm', ['run', 'build'])

console.error('[auto-ship] git add .')
run('git', ['add', '.'])

const noStaged = spawnSync('git', ['diff', '--cached', '--quiet'], { cwd: root })
if (noStaged.status === 0) {
  console.error('[auto-ship] Nada que commitear.')
  process.exit(0)
}

console.error(`[auto-ship] git commit -m "${COMMIT_MSG}"`)
if (!run('git', ['commit', '-m', COMMIT_MSG], true)) {
  console.error('[auto-ship] commit falló')
  process.exit(1)
}

console.error('[auto-ship] git push origin main')
run('git', ['push', 'origin', 'main'])

printVercelEnvReminder()

console.error('[auto-ship] Push completado. Si Vercel está enlazado al repo, el deploy debería arrancar.')

function printVercelEnvReminder() {
  console.error('')
  console.error('[auto-ship] Variables de entorno en Vercel (Project → Settings → Environment Variables → Production):')
  console.error('  • VITE_MAPBOX_ACCESS_TOKEN — obligatoria para que el mapa renderice (sin ella el área del mapa queda vacía / pantalla muy oscura).')
  console.error('  • VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY — login/sesión.')
  console.error('  • Opcional: VITE_POSTHOG_KEY, VITE_POSTHOG_HOST, VITE_SENTRY_DSN')
  console.error('  Tras añadir o cambiar variables: redeploy en Vercel (nuevo push o "Redeploy").')
  console.error('')
}
