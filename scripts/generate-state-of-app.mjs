/**
 * Genera GTP/STATE_OF_APP.txt: inventario del repo, servicios, pantallas, grafo desde main.jsx.
 * Uso: node scripts/generate-state-of-app.mjs [--enforce-orphans]
 */
import fs from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const srcDir = join(root, 'src')
const outPath = join(root, 'GTP', 'STATE_OF_APP.txt')

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', 'test-results', '.vercel'])

function toRel(p) {
  return relative(root, p).split('\\').join('/')
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

function walkSrcSourceFiles() {
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

function findOrphanSrcFiles(reachable) {
  const allowNeverReport = new Set([
    'src/main.jsx',
    'src/app/App.jsx',
    'src/features/home/components/HomePage.jsx',
  ])
  const allowAmbientOnly = new Set([
    'src/vite-env.d.ts',
    'src/ui/Header.d.ts',
    'src/ui/BottomNav.d.ts',
  ])

  const orphans = []
  for (const abs of walkSrcSourceFiles()) {
    const rel = toRel(abs)
    if (allowNeverReport.has(rel) || allowAmbientOnly.has(rel)) continue
    if (!reachable.has(rel)) orphans.push(rel)
  }
  return orphans.sort()
}

function treeLines(dir, prefix = '', maxDepth = 5, depth = 0) {
  const lines = []
  if (depth > maxDepth) return lines
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return lines
  }
  entries.sort((a, b) => a.name.localeCompare(b.name))
  for (const ent of entries) {
    if (ent.name.startsWith('.')) continue
    if (SKIP_DIRS.has(ent.name)) {
      lines.push(`${prefix}${ent.name}/  [omitido]`)
      continue
    }
    const p = join(dir, ent.name)
    const rel = toRel(p)
    if (ent.isDirectory()) {
      lines.push(`${prefix}${ent.name}/`)
      lines.push(...treeLines(p, `${prefix}  `, maxDepth, depth + 1))
    } else {
      lines.push(`${prefix}${ent.name}`)
    }
  }
  return lines
}

function readPackageJson() {
  try {
    return JSON.parse(fs.readFileSync(join(root, 'package.json'), 'utf8'))
  } catch {
    return {}
  }
}

function gitRevisionMetadata() {
  const ciSha = (process.env.GITHUB_SHA || '').trim()
  if (ciSha.length >= 7) {
    return { revision: ciSha, source: 'GITHUB_SHA', dirty: false }
  }
  const r = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  })
  const head = (r.stdout || '').trim() || '(no git)'
  const st = spawnSync('git', ['status', '--porcelain'], {
    cwd: root,
    encoding: 'utf8',
  })
  const dirty = Boolean((st.stdout || '').trim())
  return { revision: head, source: 'git', dirty }
}

function listDir(rel) {
  const p = join(root, rel)
  if (!fs.existsSync(p)) return []
  return fs
    .readdirSync(p)
    .filter((n) => !n.startsWith('.'))
    .sort()
}

function criticalModuleEdges(reachable) {
  const hubs = [
    'src/lib/AuthContext.jsx',
    'src/ui/layout/ScreenShell.tsx',
    'src/services/reviews.ts',
  ]
  const lines = []
  for (const hub of hubs) {
    const abs = join(root, hub)
    if (!fs.existsSync(abs)) continue
    let text
    try {
      text = fs.readFileSync(abs, 'utf8')
    } catch {
      continue
    }
    const imps = extractRelativeImports(text).slice(0, 12)
    lines.push(`${hub}  ← ${imps.length} import(s) relativos (muestra): ${imps.join(', ') || '—'}`)
  }
  const rev = { auth: 0, layout: 0, reviews: 0, map: 0 }
  for (const rel of reachable) {
    if (rel.includes('/AuthContext') || rel.includes('/auth')) rev.auth++
    if (rel.includes('/layout/') || rel.includes('ScreenShell')) rev.layout++
    if (rel.includes('/reviews/') || rel.includes('/reviews.ts')) rev.reviews++
    if (rel.includes('/map/')) rev.map++
  }
  lines.push(
    `Módulos en grafo alcanzable (aprox. por ruta): auth-path ${rev.auth}, layout ${rev.layout}, reviews ${rev.reviews}, map ${rev.map}`
  )
  return lines
}

function buildDocument(orphans, reachable) {
  const pkg = readPackageJson()
  const deps = Object.keys(pkg.dependencies || {}).sort()
  const devDeps = Object.keys(pkg.devDependencies || {}).sort()

  const gitMeta = gitRevisionMetadata()
  const lines = []
  lines.push('=== STATE_OF_APP v1 ===')
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push(`Git revision: ${gitMeta.revision}`)
  lines.push(
    gitMeta.source === 'GITHUB_SHA'
      ? 'Git source: GITHUB_SHA (CI checkout; inventario coincide con el commit bajo prueba).'
      : gitMeta.dirty
        ? 'Git source: local HEAD (working tree dirty: contenido puede incluir cambios sin commit).'
        : 'Git source: local HEAD (working tree clean al generar).'
  )
  lines.push('')
  lines.push('=== ESTRUCTURA (árbol, raíz del repo; carpetas pesadas omitidas) ===')
  lines.push(...treeLines(root, '', 4, 0).slice(0, 400))
  lines.push('')
  lines.push('=== DEPENDENCIAS CLAVE (package.json) ===')
  lines.push(`runtime: ${deps.join(', ')}`)
  lines.push(`dev: ${devDeps.join(', ')}`)
  lines.push('')
  lines.push('=== SERVICIOS (src/services/) ===')
  lines.push(listDir('src/services').join(', ') || '(vacío)')
  lines.push('')
  lines.push('=== PANTALLAS / RUTAS LÓGICAS ===')
  lines.push(
    'Entry: src/main.jsx → src/app/App.jsx. Vistas: loading | login | autenticado (perfil incompleto → ProfilePage; completo → home / profile / reviews según AppScreenContext).'
  )
  lines.push(
    'Pantallas internas (appScreenState): home | profile | reviews — ver reduceAppScreen en src/lib/appScreenState.js'
  )
  lines.push(
    'Componentes de pantalla: HomePage, LoginPage, ProfilePage, ReviewsPage (mapa: Map lazy).'
  )
  lines.push('')
  lines.push('=== ARCHIVOS CRÍTICOS (arranque y shell) ===')
  lines.push(
    'src/main.jsx, src/app/App.jsx, src/lib/AuthContext.jsx, src/lib/AppScreenContext.jsx, src/ui/layout/ScreenShell.tsx, src/ui/layout/layout.ts'
  )
  lines.push('')
  lines.push('=== GRAFO DESDE main.jsx (módulos críticos) ===')
  lines.push(...criticalModuleEdges(reachable))
  lines.push('')
  lines.push('=== ORPHAN_MODULES (src no alcanzable desde main.jsx; .d.ts excluidos) ===')
  if (orphans.length === 0) lines.push('ninguno')
  else orphans.forEach((o) => lines.push(o))
  lines.push('')
  lines.push('=== RIESGOS / NOTAS ===')
  lines.push(
    '- Cabecera Git: «Git revision» + «Git source» — en GitHub Actions es GITHUB_SHA del checkout; en local, árbol dirty implica divergencia hasta el próximo commit.',
    '- Cambios en ScreenShell/layout afectan todas las pantallas con shell.',
    '- AuthContext + perfil incompleto redirigen a ProfilePage sin pasar por Home.',
    '- Map bundle es pesado (lazy load en App).',
    orphans.length > 0
      ? `- HUÉRFANOS detectados: ${orphans.length} archivo(s); revisar o enlazar desde main.jsx.`
      : '- Sin huérfanos detectados en el grafo actual.'
  )
  lines.push('')
  lines.push('=== CHECKPOINT PRODUCCIÓN (2026-04) ===')
  lines.push(
    '- Producción Vercel: https://v5waitme.vercel.app — despliegues Production en estado Ready; build OK; sin depender de localhost.',
    '- APIs: Mapbox (VITE_MAPBOX_ACCESS_TOKEN); Supabase (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY) en env Production Vercel.',
    '- Shell: header + bottom nav OK en layout; fix de altura aplicado en src/app/App.jsx (fade200Style: height 100% + flex column) y src/ui/layout/ScreenShell.tsx (shellRootStyle: flex 1).',
    '- Problema previo resuelto: centro negro / área central por altura 0 en cadena flex (header/nav fixed no daban altura al flujo).',
    '- Estado actual: funcional en móvil (mejorable pero usable). PWA: si el icono de inicio muestra versión vieja, quitar y volver a añadir.',
    '- Retomar mañana: «continúa donde lo dejamos en WaitMe v5 producción iPhone (mapa ya renderiza, revisar UX y ajustes finales)».'
  )
  lines.push('')
  lines.push('=== FIN ===')
  return lines.join('\n')
}

function validateOutput(text) {
  if (text.length < 400) return 'salida demasiado corta'
  if (!text.includes('=== STATE_OF_APP v1 ===')) return 'falta cabecera STATE_OF_APP'
  if (!text.includes('=== ORPHAN_MODULES')) return 'falta sección ORPHAN_MODULES'
  if (!text.includes('=== FIN ===')) return 'falta fin de documento'
  return null
}

function main() {
  const enforceOrphans = process.argv.includes('--enforce-orphans')
  fs.mkdirSync(join(root, 'GTP'), { recursive: true })

  const reachable = buildReachableFromMain()
  const orphans = findOrphanSrcFiles(reachable)
  const doc = buildDocument(orphans, reachable)

  const err = validateOutput(doc)
  if (err) {
    console.error(`[state-of-app] ERROR validación interna: ${err}`)
    process.exit(1)
  }

  fs.writeFileSync(outPath, doc, 'utf8')
  console.error(`[state-of-app] Escrito ${toRel(outPath)} (${doc.length} bytes)`)

  if (enforceOrphans && orphans.length > 0) {
    console.error('[state-of-app] ERROR: módulos huérfanos:')
    for (const o of orphans) console.error(`  ${o}`)
    process.exit(1)
  }
}

main()
