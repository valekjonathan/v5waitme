#!/usr/bin/env node
/**
 * Regenera GTP/FULL_REPO_CONTEXT.txt con un snapshot fiel del repo (sin node_modules/dist).
 * Ejecutar: npm run gtp:sync
 * También se ejecuta tras `npm run build` (postbuild) para mantener el TXT alineado con builds.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'GTP')
const OUT_FILE = path.join(OUT_DIR, 'FULL_REPO_CONTEXT.txt')

const SKIP_DIR_NAMES = new Set(['node_modules', 'dist', '.git'])
const SKIP_FILE_NAMES = new Set(['.env'])
const TEXT_EXT = new Set([
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.css',
  '.html',
  '.md',
  '.txt',
  '.example',
])

function isSkippedDir(name) {
  return SKIP_DIR_NAMES.has(name)
}

function walkFiles(dir, rel = '', acc = []) {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return acc
  }
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const name = e.name
    if (name === '.DS_Store') continue
    const r = rel ? `${rel}/${name}` : name
    const full = path.join(dir, name)
    if (e.isDirectory()) {
      if (isSkippedDir(name)) continue
      walkFiles(full, r, acc)
    } else if (e.isFile()) {
      if (SKIP_FILE_NAMES.has(name)) continue
      acc.push(r)
    }
  }
  return acc
}

function buildTreeLines(files) {
  const root = {}
  for (const f of files) {
    const parts = f.split('/')
    let cur = root
    for (const p of parts) {
      cur[p] = cur[p] || {}
      cur = cur[p]
    }
  }
  const lines = []
  function emit(node, prefix = '') {
    const keys = Object.keys(node).sort()
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i]
      const last = i === keys.length - 1
      const branch = last ? '└── ' : '├── '
      const child = node[k]
      lines.push(`${prefix}${branch}${k}`)
      const nextPrefix = prefix + (last ? '    ' : '│   ')
      if (Object.keys(child).length) emit(child, nextPrefix)
    }
  }
  emit(root)
  return lines.length ? lines : ['(vacío)']
}

function recentFiles(files, limit = 18) {
  const scored = []
  for (const r of files) {
    const full = path.join(ROOT, r)
    let st
    try {
      st = fs.statSync(full)
    } catch {
      continue
    }
    if (!st.isFile()) continue
    const ext = path.extname(r).toLowerCase()
    if (!TEXT_EXT.has(ext) && ext !== '' && ext !== '.png') continue
    scored.push({ r, m: st.mtimeMs })
  }
  scored.sort((a, b) => b.m - a.m)
  return scored.slice(0, limit)
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

function readText(p, max = 4000) {
  try {
    const s = fs.readFileSync(p, 'utf8')
    return s.length > max ? `${s.slice(0, max)}\n… [truncado ${s.length - max} chars]` : s
  } catch {
    return '(no legible)'
  }
}

function grepFile(rel, pattern) {
  try {
    return pattern.test(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
  } catch {
    return false
  }
}

function gitNameOnlyForRev(rev, limit = 40) {
  try {
    const out = execSync(`git log -1 ${rev} --name-only --pretty=format: 2>/dev/null`, {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 512 * 1024,
    })
    return out
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .filter((l) => !l.startsWith('node_modules/') && !l.startsWith('dist/'))
      .slice(0, limit)
  } catch {
    return []
  }
}

function gitRecentFiles(limit = 12) {
  return gitNameOnlyForRev('HEAD', limit)
}

function risksFromRepo() {
  const r = []
  if (
    grepFile('src/features/home/components/HomePage.jsx', /<button[^>]*type="button"/) &&
    !grepFile('src/features/home/components/HomePage.jsx', /onClick=/)
  ) {
    r.push('HomePage: botones sin onClick (flujo principal no cableado).')
  }
  const envEx = path.join(ROOT, '.env.example')
  if (!fs.existsSync(envEx)) r.push('Falta .env.example en la raíz.')
  else {
    const t = readText(envEx, 800)
    if (!t.includes('MAPBOX')) r.push('.env.example: documentar VITE_MAPBOX_ACCESS_TOKEN.')
  }
  if (grepFile('src/features/map/components/Map.jsx', /Mapbox omitido/)) {
    r.push('Mapa: sin token o error Mapbox → sin tiles; Home mantiene capa visible (Map no bloqueante).')
  }
  if (!fs.existsSync(path.join(ROOT, 'test'))) r.push('Carpeta test/ ausente.')
  if (!fs.existsSync(path.join(ROOT, '.vscode', 'tasks.json'))) {
    r.push('.vscode/tasks.json ausente.')
  }
  return [...new Set(r)]
}

function main() {
  const now = new Date().toISOString()
  const pkg = readJson(path.join(ROOT, 'package.json'))
  const files = walkFiles(ROOT)
  const treeLines = buildTreeLines(files)
  const recent = recentFiles(files)
  const gitRecent = gitRecentFiles()

  const viteConf = fs.existsSync(path.join(ROOT, 'vite.config.js'))
    ? readText(path.join(ROOT, 'vite.config.js'), 2500)
    : ''

  const tasksTxt = fs.existsSync(path.join(ROOT, '.vscode', 'tasks.json'))
    ? readText(path.join(ROOT, '.vscode', 'tasks.json'), 4000)
    : ''
  const supabaseMigrationFiles = files
    .filter((f) => f.startsWith('supabase/migrations/') && f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b))
  const supabaseEnvTemplate = fs.existsSync(path.join(ROOT, '.env.example'))
    ? readText(path.join(ROOT, '.env.example'), 800)
    : ''

  const screens = [
    'src/features/home/components/HomePage.jsx — landing con mapa bajo overlay, CTAs, logo.',
    'src/features/profile/components/ProfilePage.jsx — perfil local (state), formulario, guardar en memoria.',
    'src/app/App.jsx — AppScreenProvider + IphoneFrame; home | profile.',
  ]

  const tests = files.filter((f) => f.startsWith('test/') && f.endsWith('.js'))

  const risks = risksFromRepo().filter(Boolean)
  if (!risks.length) risks.push('(ningún riesgo heurístico extra detectado por el script; revisar manualmente).')

  const lines = []
  lines.push('WAITME / v5waitme — FULL_REPO_CONTEXT (generado)')
  lines.push(`Generado (UTC): ${now}`)
  lines.push('Script: npm run gtp:sync | postbuild tras npm run build')
  lines.push('')
  lines.push('---')
  lines.push('0) DOCUMENTACIÓN DE PROYECTO SOLICITADA Y AUSENTE')
  lines.push('---')
  lines.push(
    'No están en el repo: WAITME_AGENT_CONTEXT.md, CURSOR_RULES_WAITME.md, SAFE_CHANGE_PROTOCOL.md.',
  )
  lines.push('')
  lines.push('---')
  lines.push('1) ÁRBOL (sin node_modules/, dist/, .git/; sin .env ni .DS_Store)')
  lines.push('---')
  lines.push(...treeLines)
  lines.push('')
  lines.push('---')
  lines.push('2) ARCHIVOS CLAVE')
  lines.push('---')
  lines.push('Entrada: index.html → src/main.jsx → src/app/App.jsx')
  lines.push('Estado pantallas: src/lib/AppScreenContext.jsx')
  lines.push('Mapa: src/features/map/components/Map.jsx + src/features/map/constants/mapbox.js')
  lines.push('Geo: src/services/location.js')
  lines.push('Estilos: src/styles/global.css')
  lines.push('')
  lines.push('---')
  lines.push('3) SCRIPTS NPM (package.json)')
  lines.push('---')
  lines.push(JSON.stringify(pkg.scripts || {}, null, 2))
  lines.push('')
  lines.push('---')
  lines.push('4) DEPENDENCIAS')
  lines.push('---')
  lines.push('dependencies:', JSON.stringify(pkg.dependencies || {}, null, 2))
  lines.push('devDependencies:', JSON.stringify(pkg.devDependencies || {}, null, 2))
  lines.push('')
  lines.push('---')
  lines.push('5) FLUJO DE ARRANQUE')
  lines.push('---')
  lines.push('Producción: npm run auto:ship → lint + test + build + git add . + commit "auto: update" + push main; npm run auto:live → auto:ship + open-prod-refresh (pestaña solo host producción). npm run open:prod solo abre URL.')
  lines.push('Watch (Cursor/VSCode): npm run dev:auto → vigila src/, debounce 2s → auto:ship; Safari loop una vez en background (macOS). Tarea waitme: auto dev con runOn folderOpen.')
  lines.push('Desarrollo local opcional: npm run dev → Vite (ver vite.config).')
  lines.push('Vercel: vercel.json (build npm run build, output dist); importar repo en dashboard para auto-deploy en push.')
  lines.push('Cursor/VSCode: waitme: auto dev, waitme: auto ship, waitme: auto live, waitme: open production.')
  lines.push('--- .vscode/tasks.json (extracto / completo si corto) ---')
  lines.push(tasksTxt || '(no encontrado)')
  lines.push('')
  lines.push('--- vite.config.js ---')
  lines.push(viteConf || '(no encontrado)')
  lines.push('')
  lines.push('---')
  lines.push('6) SUPABASE (config / migraciones / estado)')
  lines.push('---')
  lines.push('- Cliente frontend: src/services/supabase.js (solo anon key).')
  lines.push('- Setup automático: npm run supabase:setup → scripts/supabase-setup.mjs.')
  lines.push('- Variables esperadas: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_DB_URL.')
  lines.push('--- .env.example ---')
  lines.push(supabaseEnvTemplate || '(no encontrado)')
  lines.push('--- Migraciones ---')
  lines.push(
    supabaseMigrationFiles.length
      ? supabaseMigrationFiles.map((m) => `- ${m}`).join('\n')
      : '(sin migraciones)',
  )
  lines.push('')
  lines.push('---')
  lines.push('7) PANTALLAS / COMPONENTES (resumen)')
  lines.push('---')
  lines.push(...screens.map((s) => `- ${s}`))
  lines.push('Componentes UI: Header, BottomNav, CenterPin, IphoneFrame, perfil/*, Map.')
  lines.push('')
  lines.push('---')
  lines.push('8) TESTS')
  lines.push('---')
  lines.push(tests.length ? tests.map((t) => `- ${t}`).join('\n') : '(ninguno encontrado bajo test/)')
  lines.push('')
  lines.push('---')
  lines.push('9) RIESGOS (heurística automática + revisión humana recomendada)')
  lines.push('---')
  lines.push(...risks.map((x) => `- ${x}`))
  lines.push('')
  lines.push('---')
  lines.push('10) ARCHIVOS RECIENTES (mtime en esta máquina, top)')
  lines.push('---')
  lines.push(
    ...recent.map(({ r, m }) => `- ${r}  (${new Date(m).toISOString()})`),
  )
  lines.push('')
  lines.push('---')
  lines.push('11) GIT (último commit — solo si hay repo)')
  lines.push('---')
  if (gitRecent.length) {
    lines.push('Archivos tocados en el último commit (git log -1 --name-only):')
    lines.push(...gitRecent.map((g) => `- ${g}`))
    const lastHasSrc = gitRecent.some((f) => f.startsWith('src/'))
    if (!lastHasSrc) {
      for (let i = 1; i <= 10; i++) {
        const files = gitNameOnlyForRev(`HEAD~${i}`, 60)
        if (!files.length) continue
        if (!files.some((f) => f.startsWith('src/'))) continue
        lines.push('')
        lines.push(`Último commit con cambios bajo src/ (HEAD~${i}, name-only):`)
        lines.push(...files.map((g) => `- ${g}`))
        break
      }
    }
  } else {
    lines.push('No hay repositorio git inicializado aquí, o git no devolvió lista.')
  }
  lines.push('')
  lines.push('---')
  lines.push('FIN')
  lines.push('---')

  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(OUT_FILE, lines.join('\n'), 'utf8')
  console.error(`[gtp-sync] Escrito ${path.relative(ROOT, OUT_FILE)} (${lines.length} líneas)`)
}

main()
