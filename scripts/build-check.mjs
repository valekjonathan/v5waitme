/**
 * Build rápido (minify off) para pre-commit: valida que el bundle compila sin correr todo el quality gate.
 */
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { envWithBuildPlaceholders } from './build-env.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const r = spawnSync('npx', ['vite', 'build', '--minify', 'false'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
  env: envWithBuildPlaceholders(),
})
process.exit(r.status ?? 1)
