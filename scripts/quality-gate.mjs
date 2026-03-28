/**
 * Control de calidad automático: state-of-app + chequeos estáticos + lint + test + test:ui + vite build (siempre).
 * Cualquier fallo → exit 1 (CI / `npm run quality`). El hook pre-commit solo ejecuta lint + test.
 * JSX y variables/imports no usados: ESLint (no-unused-vars, react/jsx-uses-vars, --max-warnings 0).
 * Sin dependencias extra (solo Node + npm + vite ya en el proyecto).
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { basename, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const srcDir = join(root, 'src')

const SEP = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

/** @typedef {{ level: 'ERROR' | 'WARN', code: string, message: string, files?: string[] }} Issue */

/** @type {Issue[]} */
const issues = []

function rel(p) {
  return relative(root, p).split('\\').join('/')
}

function walkSrcFiles() {
  /** @type {string[]} */
  const out = []
  function walk(dir) {
    if (!fs.existsSync(dir)) return
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name)
      if (ent.isDirectory()) walk(p)
      else if (/\.(jsx?|tsx?|mjs|cjs)$/.test(ent.name)) out.push(p)
    }
  }
  walk(srcDir)
  return out
}

function checkEmptyFiles() {
  for (const file of walkSrcFiles()) {
    try {
      const st = fs.statSync(file)
      if (st.size === 0) {
        issues.push({
          level: 'ERROR',
          code: 'EMPTY_FILE',
          message: 'Archivo fuente vacío (0 bytes)',
          files: [rel(file)],
        })
      }
    } catch {
      /* */
    }
  }
}

/** Import completo (incluye bloques multilínea `import { … } from 'x'`). */
function extractCompleteImportStatements(text) {
  const result = []
  const lines = text.split(/\r?\n/)
  let buf = ''
  for (const line of lines) {
    const t = line.trim()
    if (!buf) {
      if (!t.startsWith('import ')) continue
      buf = t
    } else {
      buf += ` ${t}`
    }
    const sideOnly = /^import\s+['"][^'"]+['"]\s*;?$/.test(buf)
    const withFrom = /\bfrom\s+['"][^'"]+['"]\s*;?\s*$/.test(buf)
    if (sideOnly || withFrom) {
      result.push(buf.replace(/\s+/g, ' ').trim())
      buf = ''
    }
  }
  return result
}

function checkDuplicateImports() {
  for (const file of walkSrcFiles()) {
    let text
    try {
      text = fs.readFileSync(file, 'utf8')
    } catch {
      continue
    }
    const statements = extractCompleteImportStatements(text)
    const seen = new Set()
    for (const stmt of statements) {
      if (seen.has(stmt)) {
        issues.push({
          level: 'ERROR',
          code: 'DUPLICATE_IMPORT_LINE',
          message: `Import duplicado: ${stmt.slice(0, 72)}${stmt.length > 72 ? '…' : ''}`,
          files: [rel(file)],
        })
        break
      }
      seen.add(stmt)
    }
  }
}

function normalizeLine(line) {
  return line.replace(/\/\/.*$/, '').trim()
}

/**
 * Bloque interno repetido (copiar/pegar): misma secuencia de líneas ≥ minLines aparece 2+ veces en el archivo.
 */
function checkIntraFileDuplicateBlocks() {
  const minLines = 14
  for (const file of walkSrcFiles()) {
    let text
    try {
      text = fs.readFileSync(file, 'utf8')
    } catch {
      continue
    }
    const raw = text.split(/\r?\n/)
    const norm = raw.map(normalizeLine).filter((l) => l.length > 0)
    if (norm.length < minLines * 2) continue

    for (let len = minLines; len <= Math.floor(norm.length / 2); len++) {
      for (let i = 0; i + len <= norm.length; i++) {
        const block = norm.slice(i, i + len).join('\n')
        if (block.length < 120) continue
        const tail = norm.slice(i + len).join('\n')
        if (tail.includes(block)) {
          issues.push({
            level: 'ERROR',
            code: 'DUPLICATE_BLOCK_SAME_FILE',
            message: `Bloque duplicado (~${len} líneas repetidas en el mismo archivo)`,
            files: [rel(file)],
          })
          len = norm.length
          break
        }
      }
    }
  }
}

function checkDuplicateDefaultExports() {
  const re = /export\s+default\s+function\s+(\w+)/g
  /** @type {Map<string, string[]>} */
  const byName = new Map()

  for (const file of walkSrcFiles()) {
    let text
    try {
      text = fs.readFileSync(file, 'utf8')
    } catch {
      continue
    }
    let m
    const local = new RegExp(re.source, 'g')
    while ((m = local.exec(text)) !== null) {
      const name = m[1]
      if (!byName.has(name)) byName.set(name, [])
      byName.get(name).push(rel(file))
    }
  }

  for (const [name, paths] of byName) {
    const unique = [...new Set(paths)]
    if (unique.length > 1) {
      issues.push({
        level: 'ERROR',
        code: 'DUPLICATE_DEFAULT_COMPONENT_NAME',
        message: `Nombre de componente default export repetido en varios archivos: "${name}"`,
        files: unique,
      })
    }
  }
}

function printReport() {
  const errors = issues.filter((i) => i.level === 'ERROR')
  const warns = issues.filter((i) => i.level === 'WARN')
  console.error('')
  console.error(SEP)
  console.error('[quality-gate] Informe de chequeos estáticos')
  console.error(SEP)

  if (issues.length === 0) {
    console.error('  (sin incidencias automáticas en src/)')
  } else {
    for (const i of issues) {
      console.error(`  [${i.level}] ${i.code}: ${i.message}`)
      if (i.files?.length) {
        for (const f of i.files) console.error(`         → ${f}`)
      }
    }
  }
  console.error('')
  console.error(`  Errores: ${errors.length}  |  Avisos: ${warns.length}`)
  console.error(SEP)
  console.error('')

  if (errors.length > 0) {
    console.error('[quality-gate] ESTADO: ERROR (corregir antes de continuar)')
    process.exit(1)
  }
  if (warns.length > 0) {
    console.error('[quality-gate] Avisos: revisar; el flujo continúa (lint/test/build).')
    console.error('')
  }
}

const HEX_IN_SVG = /#[0-9a-fA-F]{3,8}\b/

/**
 * Heurística: módulos .jsx bajo src/ cuyo nombre base no aparece en ningún import (riesgo de componente muerto).
 * Excluye entry y nombres demasiado genéricos.
 */
function checkLikelyUnimportedJsxModules() {
  const files = walkSrcFiles().filter((f) => f.endsWith('.jsx'))
  let combined = ''
  for (const f of files) {
    try {
      combined += fs.readFileSync(f, 'utf8') + '\n'
    } catch {
      /* */
    }
  }

  const skipBasenames = new Set([
    'main.jsx',
    'App.jsx',
    'Button.jsx',
    'Switch.jsx',
    'Header.jsx',
    'BottomNav.jsx',
    'IphoneFrame.jsx',
  ])

  for (const file of files) {
    const bn = basename(file)
    if (skipBasenames.has(bn)) continue
    const nameSansExt = bn.replace(/\.jsx$/, '')
    if (nameSansExt.length < 4) continue
    const escaped = nameSansExt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const fromImport = new RegExp(`from\\s+['"][^'"]*${escaped}[^'"]*['"]`)
    if (!fromImport.test(combined)) {
      issues.push({
        level: 'WARN',
        code: 'POSSIBLY_UNIMPORTED_MODULE',
        message: `Ningún "from '…${nameSansExt}…'" detectado en src/ (¿módulo no usado?)`,
        files: [rel(file)],
      })
    }
  }
}

function printIconConsistencyReport() {
  const iconsDir = join(root, 'src/ui/icons')
  if (!fs.existsSync(iconsDir)) return

  const lines = []
  for (const ent of fs.readdirSync(iconsDir, { withFileTypes: true })) {
    if (!ent.isFile() || !ent.name.endsWith('.jsx')) continue
    const file = join(iconsDir, ent.name)
    let text
    try {
      text = fs.readFileSync(file, 'utf8')
    } catch {
      continue
    }
    const base = rel(file)
    const noComments = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    const hasHex = HEX_IN_SVG.test(noComments)
    HEX_IN_SVG.lastIndex = 0
    const hasCurrent = /\bcurrentColor\b/.test(text)
    const hasDesignColors = /\bcolors\.\w+/.test(text)
    const m = text.match(/export\s+default\s+function\s+(\w+)/)
    const exportName = m ? m[1] : ''
    const nameOk = /Icon|IconHome$/.test(exportName)

    const bits = []
    if (!nameOk) bits.push(`export default "${exportName}" (convención *Icon / *IconHome)`)
    if (!/\bviewBox=/.test(text)) bits.push('falta viewBox')
    if (!/aria-hidden|aria-label/.test(text)) bits.push('sin aria-hidden/aria-label')
    if (hasHex && hasCurrent) bits.push('mezcla #hex y currentColor')
    else if (hasHex && !hasCurrent && !hasDesignColors)
      bits.push('solo #hex (resto del set suele usar currentColor o colors.*)')
    if (hasDesignColors && hasHex) bits.push('mezcla colors.* y #hex')

    if (bits.length) lines.push(`  ${base}: ${bits.join('; ')}`)
    else lines.push(`  ${base}: OK`)
  }

  console.error('')
  console.error(SEP)
  console.error('[quality-gate] Iconos src/ui/icons (solo informe; no bloquea)')
  console.error(SEP)
  if (lines.length === 0) {
    console.error('  (sin archivos)')
  } else {
    for (const ln of lines) console.error(ln)
  }
  console.error(SEP)
  console.error('')
}

function runStateOfApp() {
  const script = join(root, 'scripts', 'generate-state-of-app.mjs')
  const r = spawnSync(process.execPath, [script, '--enforce-orphans'], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  })
  if (r.status !== 0) {
    console.error('')
    console.error('[quality-gate] ESTADO: ERROR (GTP/STATE_OF_APP.txt o módulos huérfanos)')
    process.exit(r.status ?? 1)
  }
}

function runNpm(script) {
  console.error(SEP)
  console.error(`[quality-gate] npm run ${script}`)
  console.error(SEP)
  const r = spawnSync('npm', ['run', script], {
    stdio: 'inherit',
    cwd: root,
    env: process.env,
  })
  if (r.status !== 0) {
    console.error('')
    console.error(`[quality-gate] ESTADO: ERROR (falló npm run ${script})`)
    process.exit(r.status ?? 1)
  }
}

function main() {
  console.error('')
  console.error('[quality-gate] Inicio (src + lint + test + test:ui + build)')
  console.error('')

  checkEmptyFiles()
  checkDuplicateImports()
  checkDuplicateDefaultExports()
  checkIntraFileDuplicateBlocks()
  checkLikelyUnimportedJsxModules()
  printIconConsistencyReport()
  printReport()

  runStateOfApp()

  runNpm('lint')
  runNpm('test')
  runNpm('test:ui')

  runNpm('build')

  console.error(SEP)
  console.error('[quality-gate] ESTADO: OK')
  console.error(SEP)
  console.error('')
}

main()
