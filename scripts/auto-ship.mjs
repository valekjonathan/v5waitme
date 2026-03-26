/**
 * [opcional] quality-gate → git add . → commit → push al remote y rama detectados.
 * Sin prompts. Requiere repo git válido, al menos un remote, rama no detached.
 *
 * Flags: --no-quality  Omitir quality-gate (uso interno: dev-auto ya lo ejecutó antes).
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const qualityGate = join(root, 'scripts/quality-gate.mjs')
const COMMIT_MSG = 'auto: update'
const skipQuality = process.argv.includes('--no-quality')

function run(cmd, args, { allowFail = false } = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: root })
  if (!allowFail && r.status !== 0) process.exit(r.status ?? 1)
  return r.status === 0
}

function output(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', cwd: root })
  return (r.stdout || '').trim()
}

function assertGitRepo() {
  const r = spawnSync('git', ['rev-parse', '--git-dir'], { encoding: 'utf8', cwd: root })
  if (r.status !== 0 || !(r.stdout || '').trim()) {
    console.error(
      '[AUTO-SHIP] ERROR: no es un repositorio git (falta .git o no estás en la raíz del repo).'
    )
    process.exit(1)
  }
}

function detectBranch() {
  const b = output('git', ['rev-parse', '--abbrev-ref', 'HEAD'])
  if (!b || b === 'HEAD') {
    console.error(
      '[AUTO-SHIP] ERROR: HEAD detached o rama no resoluble; checkout una rama antes de auto-ship.'
    )
    process.exit(1)
  }
  return b
}

function detectRemote(branch) {
  let remote = output('git', ['config', `branch.${branch}.remote`])
  if (remote) return remote

  const remotes = output('git', ['remote'])
    .split(/[\r\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)

  if (remotes.length === 0) {
    console.error('[AUTO-SHIP] ERROR: no hay remotes configurados (git remote add …).')
    process.exit(1)
  }
  if (remotes.includes('origin')) return 'origin'
  if (remotes.length === 1) return remotes[0]

  console.error(
    '[AUTO-SHIP] ERROR: varios remotes y sin branch.*.remote; define upstream: git push -u <remote> ' +
      branch
  )
  process.exit(1)
}

function readVercelJson() {
  const p = join(root, 'vercel.json')
  if (!existsSync(p)) {
    console.error('[AUTO-SHIP] ERROR: falta vercel.json')
    process.exit(1)
  }
  return JSON.parse(readFileSync(p, 'utf8'))
}

function assertVercelConfig() {
  const v = readVercelJson()
  if (v.buildCommand !== 'npm run build') {
    console.error('[AUTO-SHIP] ERROR: vercel.json buildCommand debe ser "npm run build".')
    process.exit(1)
  }
  if (v.outputDirectory !== 'dist') {
    console.error('[AUTO-SHIP] ERROR: vercel.json outputDirectory debe ser "dist".')
    process.exit(1)
  }
}

function vercelConnectionHint() {
  const linked = existsSync(join(root, '.vercel', 'project.json'))
  if (!linked) {
    console.error('')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('[AUTO-SHIP] AVISO VERCEL')
    console.error('No hay .vercel/project.json (normal tras clone o sin `vercel link`).')
    console.error(
      'Para deploy en push: importa este repo en vercel.com y conecta la rama que uses.'
    )
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('')
  }
}

assertGitRepo()
const branch = detectBranch()
const remote = detectRemote(branch)
const remoteUrl = output('git', ['remote', 'get-url', remote])

console.error(`[AUTO-SHIP] rama detectada: ${branch}`)
console.error(`[AUTO-SHIP] remote detectado: ${remote}${remoteUrl ? ` (${remoteUrl})` : ''}`)

assertVercelConfig()
vercelConnectionHint()

if (skipQuality) {
  console.error(
    '[AUTO-SHIP] quality-gate omitido (--no-quality; debe haberse ejecutado antes en el pipeline).'
  )
} else {
  console.error('[AUTO-SHIP] quality-gate (estáticos + lint + test + build condicional)')
  const qg = spawnSync(process.execPath, [qualityGate], {
    stdio: 'inherit',
    cwd: root,
    env: process.env,
  })
  if (qg.status !== 0) {
    console.error('[AUTO-SHIP] quality-gate falló: no hay commit ni push.')
    process.exit(qg.status ?? 1)
  }
}

console.error('[AUTO-SHIP] git add .')
run('git', ['add', '.'])

const noStaged = spawnSync('git', ['diff', '--cached', '--quiet'], { cwd: root })
if (noStaged.status === 0) {
  console.error('[AUTO-SHIP] Nada que commitear.')
  process.exit(0)
}

console.error(`[AUTO-SHIP] git commit -m "${COMMIT_MSG}"`)
if (!run('git', ['commit', '-m', COMMIT_MSG], true)) {
  console.error('[AUTO-SHIP] commit falló')
  process.exit(1)
}

console.error(`[AUTO-SHIP] git push ${remote} ${branch}`)
run('git', ['push', remote, branch])

printVercelEnvReminder()

console.error(
  '[AUTO-SHIP] Push completado. Si Vercel está enlazado al repo, el deploy debería arrancar.'
)

function printVercelEnvReminder() {
  console.error('')
  console.error(
    '[AUTO-SHIP] Variables de entorno en Vercel (Project → Settings → Environment Variables → Production):'
  )
  console.error(
    '  • VITE_MAPBOX_ACCESS_TOKEN — obligatoria para que el mapa renderice (sin ella el área del mapa queda vacía / pantalla muy oscura).'
  )
  console.error('  • VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY — login/sesión.')
  console.error('  • Opcional: VITE_POSTHOG_KEY, VITE_POSTHOG_HOST')
  console.error('  Tras añadir o cambiar variables: redeploy en Vercel (nuevo push o "Redeploy").')
  console.error('')
}
