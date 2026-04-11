/**
 * Copia scripts/git-hooks/pre-commit y pre-push → .git/hooks/ (ejecutables).
 * Se ejecuta en `npm install` via `prepare`.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(fileURLToPath(new URL('.', import.meta.url)), '..')

/** En GitHub Actions no hay hooks locales; evita tocar `.git` del checkout (prepare corre en `npm ci`). */
if (process.env.GITHUB_ACTIONS === 'true') {
  process.exit(0)
}

const gitDir = path.join(root, '.git')
const dstDir = path.join(gitDir, 'hooks')

const hooks = ['pre-commit', 'pre-push']

if (!fs.existsSync(gitDir)) {
  process.exit(0)
}

try {
  fs.mkdirSync(dstDir, { recursive: true })
  for (const name of hooks) {
    const src = path.join(root, 'scripts', 'git-hooks', name)
    const dst = path.join(dstDir, name)
    if (!fs.existsSync(src)) continue
    fs.copyFileSync(src, dst)
    fs.chmodSync(dst, 0o755)
  }
} catch (e) {
  console.warn('[prepare] No se pudo instalar git hooks:', e.message)
  process.exit(0)
}
