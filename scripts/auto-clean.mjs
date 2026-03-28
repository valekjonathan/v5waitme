/**
 * Formato: grafo unused desde main.jsx, eslint --fix, Prettier (HomePage excluido). No borra archivos; no sustituye a `quality`.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const srcDir = join(root, 'src')
const HOMEPAGE_REL = 'src/features/home/components/HomePage.jsx'

const REPORT_LINE = '━━━ AUTO CLEAN REPORT ━━━'

function toRel(p) {
  return relative(root, p).split('\\').join('/')
}

function walkSrcSourceFiles() {
  /** @type {string[]} */
  const out = []
  function walk(dir) {
    if (!fs.existsSync(dir)) return
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name)
      if (ent.isDirectory()) walk(p)
      else if (/\.(jsx?|tsx?)$/.test(ent.name)) out.push(p)
    }
  }
  walk(srcDir)
  return out
}

function resolveRelativeImport(fromFile, specifier) {
  const dir = dirname(fromFile)
  const base = join(dir, specifier)
  const candidates = [
    base,
    `${base}.jsx`,
    `${base}.js`,
    `${base}.tsx`,
    `${base}.ts`,
    join(base, 'index.jsx'),
    join(base, 'index.js'),
    join(base, 'index.tsx'),
    join(base, 'index.ts'),
  ]
  for (const c of candidates) {
    try {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) return c
    } catch {
      /* */
    }
  }
  return null
}

function extractRelativeImports(content) {
  const out = new Set()
  const res = [
    /\bfrom\s+['"](\.[^'"]+)['"]/g,
    /\bimport\s+['"](\.[^'"]+)['"]\s*$/gm,
    /\bimport\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g,
  ]
  for (const re of res) {
    let m
    const r = new RegExp(re.source, re.flags)
    while ((m = r.exec(content)) !== null) out.add(m[1])
  }
  return [...out]
}

function buildReachableFromMain() {
  const reachable = new Set()
  const mainPath = join(srcDir, 'main.jsx')
  if (!fs.existsSync(mainPath)) return reachable

  const queue = [mainPath]
  while (queue.length) {
    const file = queue.pop()
    const rel = toRel(file)
    if (reachable.has(rel)) continue
    try {
      if (!fs.statSync(file).isFile()) continue
    } catch {
      continue
    }
    reachable.add(rel)

    let text
    try {
      text = fs.readFileSync(file, 'utf8')
    } catch {
      continue
    }

    for (const spec of extractRelativeImports(text)) {
      const resolved = resolveRelativeImport(file, spec)
      if (!resolved) continue
      const r = toRel(resolved)
      if (!r.startsWith('src/') || reachable.has(r)) continue
      if (fs.existsSync(resolved)) queue.push(resolved)
    }
  }
  return reachable
}

function reportUnusedFiles() {
  const reachable = buildReachableFromMain()
  const allowNeverReport = new Set(['src/main.jsx', 'src/app/App.jsx', HOMEPAGE_REL])
  /** Referencias de tipos / ambiente: no entran en imports JS pero son válidas. */
  const allowAmbientOnly = new Set([
    'src/vite-env.d.ts',
    'src/ui/Header.d.ts',
    'src/ui/BottomNav.d.ts',
  ])

  const unused = []
  for (const abs of walkSrcSourceFiles()) {
    const rel = toRel(abs)
    if (allowNeverReport.has(rel) || allowAmbientOnly.has(rel)) continue
    if (!reachable.has(rel)) unused.push(rel)
  }
  unused.sort()
  return unused
}

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { cwd: root, stdio: 'inherit', env: process.env, ...opts })
}

function runPrettierWithoutHomePage() {
  const ignorePath = join(root, 'node_modules', '.auto-clean-prettierignore')
  const baseIgnore = join(root, '.prettierignore')
  let combined = ''
  try {
    combined = fs.readFileSync(baseIgnore, 'utf8')
  } catch {
    combined = 'node_modules\ndist\n'
  }
  if (!combined.endsWith('\n')) combined += '\n'
  combined += `${HOMEPAGE_REL}\n**/HomePage.jsx\n`
  fs.mkdirSync(dirname(ignorePath), { recursive: true })
  fs.writeFileSync(ignorePath, combined, 'utf8')

  const r = run('npx', ['prettier', '--write', '.', '--ignore-path', ignorePath])
  return r.status === 0
}

function main() {
  console.error('')
  console.error(REPORT_LINE)
  console.error('')

  const unused = reportUnusedFiles()
  for (const rel of unused) {
    console.error(`[WARN] UNUSED_FILE: ${rel}`)
  }
  if (unused.length === 0) {
    console.error('[INFO] UNUSED_FILE: ninguno detectado (grafo desde src/main.jsx)')
  }

  console.error('')
  const eslintFix = run('npx', ['eslint', '.', '--fix'])
  if (eslintFix.status !== 0) {
    console.error('[ERROR] ESLint --fix falló (revisa salida anterior)')
    process.exit(eslintFix.status ?? 1)
  }
  console.error('[FIX] ESLint autofix aplicado')
  console.error('')

  if (!runPrettierWithoutHomePage()) {
    console.error('[ERROR] Prettier falló')
    process.exit(1)
  }
  console.error('[FIX] Prettier aplicado (HomePage.jsx excluido)')
  console.error('')

  console.error(REPORT_LINE)
  console.error('[OK] Formato y autofix listos (CI/pre-push: npm run quality)')
  console.error('')
}

main()
