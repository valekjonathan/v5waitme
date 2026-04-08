#!/usr/bin/env node
/**
 * Validación REAL en cascada (auto-detección).
 *
 * Reglas:
 * - Si existen credenciales → ejecuta la validación real correspondiente.
 * - Si NO existen → falla con mensaje claro (sin “skip silencioso”).
 *
 * Integraciones:
 * - BrowserStack: requiere BROWSERSTACK_USERNAME + BROWSERSTACK_ACCESS_KEY
 * - Sentry: requiere VITE_SENTRY_DSN (SDK runtime). (Sourcemaps: SENTRY_AUTH_TOKEN+ORG+PROJECT solo build)
 * - Percy: requiere PERCY_TOKEN
 */
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const viteFileEnv = loadEnv('development', root, '')
for (const [k, v] of Object.entries(viteFileEnv)) {
  if (!String(process.env[k] ?? '').trim()) process.env[k] = v
}

function env(name) {
  return String(process.env[name] || '').trim()
}

function hasAll(names) {
  return names.every((n) => Boolean(env(n)))
}

function run(label, cmd, args, extraEnv = {}) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`[validate] ${label}`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`$ ${cmd} ${args.join(' ')}`)
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...extraEnv },
  })
  const code = r.status === null ? 1 : r.status
  return code
}

const checks = [
  {
    id: 'BrowserStack',
    required: ['BROWSERSTACK_USERNAME', 'BROWSERSTACK_ACCESS_KEY'],
    run: () => run('BrowserStack (Playwright grid)', 'npm', ['run', 'test:e2e:browserstack']),
  },
  {
    id: 'Sentry',
    required: ['VITE_SENTRY_DSN'],
    run: () => run('Sentry (smoke e2e: envelope POST)', 'npm', ['run', 'test:sentry']),
  },
  {
    id: 'Percy',
    required: ['PERCY_TOKEN'],
    run: () => run('Percy (upload: percy exec)', 'npm', ['run', 'test:percy:upload']),
  },
]

const results = []
let exitCode = 0

for (const c of checks) {
  if (!hasAll(c.required)) {
    console.error(`\n[validate] ${c.id}: BLOQUEADO (faltan credenciales)`)
    for (const k of c.required) {
      if (!env(k)) console.error(`  - falta ${k}`)
    }
    results.push({ id: c.id, status: 'BLOCKED' })
    exitCode = 1
    continue
  }

  const code = c.run()
  if (code === 0) {
    results.push({ id: c.id, status: 'PASS' })
  } else {
    results.push({ id: c.id, status: 'FAIL' })
    exitCode = 1
  }
}

console.log(`\n==========================================================`)
console.log(`[validate] RESUMEN`)
for (const r of results) {
  console.log(`- ${r.id}: ${r.status}`)
}
console.log(`==========================================================\n`)

process.exit(exitCode)

