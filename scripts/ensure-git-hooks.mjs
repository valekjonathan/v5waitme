/**
 * Copia scripts/git-hooks/pre-commit → .git/hooks/pre-commit (ejecutable).
 * Se ejecuta en `npm install` via `prepare` para proteger commits sin pasos manuales.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(fileURLToPath(new URL('.', import.meta.url)), '..')
const srcHook = path.join(root, 'scripts', 'git-hooks', 'pre-commit')
const gitDir = path.join(root, '.git')
const dstDir = path.join(gitDir, 'hooks')
const dstHook = path.join(dstDir, 'pre-commit')

if (!fs.existsSync(gitDir)) {
  process.exit(0)
}

try {
  fs.mkdirSync(dstDir, { recursive: true })
  fs.copyFileSync(srcHook, dstHook)
  fs.chmodSync(dstHook, 0o755)
} catch (e) {
  console.warn('[prepare] No se pudo instalar git hooks:', e.message)
  process.exit(0)
}
