#!/usr/bin/env node
/**
 * Aplica migraciones al Postgres remoto usando el pooler IPv4 (Supavisor).
 * Lee `.env`: VITE_SUPABASE_URL (ref), SUPABASE_DB_URL (contraseña postgres).
 * Opcional: SUPABASE_POOLER_HOST (default: aws-1-eu-central-1.pooler.supabase.com).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function loadDotEnv(envPath) {
  if (!fs.existsSync(envPath)) return {}
  const out = {}
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i <= 0) continue
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim()
  }
  return out
}

const fileEnv = loadDotEnv(path.join(ROOT, '.env'))
const env = { ...fileEnv, ...process.env }

const viteUrl = String(env.VITE_SUPABASE_URL ?? '').trim()
const dbUrlRaw = String(env.SUPABASE_DB_URL ?? '').trim()
if (!viteUrl || !dbUrlRaw) {
  console.error('[supabase-db-push-remote] Necesitan VITE_SUPABASE_URL y SUPABASE_DB_URL en .env')
  process.exit(1)
}

const host = new URL(viteUrl).hostname.split('.')[0]
const dbUrl = new URL(dbUrlRaw)
const pass = decodeURIComponent(dbUrl.password || '')
const poolHost = String(env.SUPABASE_POOLER_HOST ?? 'aws-1-eu-central-1.pooler.supabase.com').trim()
const poolUrl = `postgresql://postgres.${host}:${encodeURIComponent(pass)}@${poolHost}:5432/postgres?sslmode=require`

const r = spawnSync('npx', ['supabase', 'db', 'push', '--db-url', poolUrl, '--yes'], {
  cwd: ROOT,
  stdio: 'inherit',
  shell: false,
})
process.exit(r.status === null ? 1 : r.status)
