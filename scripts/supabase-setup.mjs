#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function loadDotEnv(envPath) {
  if (!fs.existsSync(envPath)) return {}
  const out = {}
  const raw = fs.readFileSync(envPath, 'utf8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx <= 0) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const value = trimmed.slice(eqIdx + 1).trim()
    out[key] = value
  }
  return out
}

function getEnv() {
  const fileEnv = loadDotEnv(path.join(ROOT, '.env'))
  return { ...fileEnv, ...process.env }
}

function required(name, env) {
  const v = String(env[name] ?? '').trim()
  if (!v || v === 'REEMPLAZAR') throw new Error(`Missing required env: ${name}`)
  return v
}

function isServiceRoleLike(key) {
  return /service[_-]?role/i.test(String(key || ''))
}

async function validateAuthAndRls(url, anonKey) {
  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously()
  if (signInError) {
    throw new Error(
      `Anonymous auth failed: ${signInError.message}. Enable Anonymous sign-ins in Supabase Auth settings.`
    )
  }
  const userId = signInData?.user?.id
  if (!userId) throw new Error('Anonymous auth returned no user id')
  console.log(`[supabase:setup] Auth OK (anonymous user: ${userId})`)

  const base = {
    id: userId,
    name: 'WAITME_SETUP',
    phone: '+34 000 000 000',
    car_brand: 'Setup',
    car_model: 'Probe',
    color: 'negro',
    vehicle_type: 'car',
    plate: '0000SET',
  }

  // Quick existence check (helps produce clearer errors).
  const { error: existsError } = await supabase.from('profiles').select('id').limit(1)
  if (existsError) {
    if (
      /schema cache/i.test(existsError.message) ||
      /Could not find the table/i.test(existsError.message)
    ) {
      throw new Error(
        'Table profiles missing in PostgREST schema cache. Create `public.profiles` + RLS + policies (see `supabase/migrations/20260325_000001_init_profiles.sql`) then re-run npm run supabase:setup.'
      )
    }
    throw new Error(`profiles check failed: ${existsError.message}`)
  }

  const { data: upserted, error: upsertError } = await supabase
    .from('profiles')
    .upsert(base, { onConflict: 'id' })
    .select('id')
    .maybeSingle()
  if (upsertError) throw new Error(`Insert/upsert failed: ${upsertError.message}`)

  const { error: selectError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()
  if (selectError) throw new Error(`Select failed: ${selectError.message}`)

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ phone: '+34 111 111 111' })
    .eq('id', userId)
  if (updateError) throw new Error(`Update failed: ${updateError.message}`)

  console.log(
    '[supabase:setup] Insert/Select/Update validation OK',
    upserted?.id ? `(row: ${upserted.id})` : ''
  )

  await supabase.auth.signOut()
}

function validateFrontendSecurity() {
  const srcDir = path.join(ROOT, 'src')
  const stack = [srcDir]
  while (stack.length) {
    const dir = stack.pop()
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        stack.push(full)
        continue
      }
      if (!/\.(js|jsx|ts|tsx|mjs|cjs)$/.test(entry.name)) continue
      const text = fs.readFileSync(full, 'utf8')
      if (/SUPABASE_SERVICE_ROLE_KEY|service[_-]?role/i.test(text)) {
        throw new Error(`Potential service key usage in frontend: ${path.relative(ROOT, full)}`)
      }
    }
  }
  console.log('[supabase:setup] Security check OK (no service role key usage in src)')
}

async function main() {
  const env = getEnv()
  const url = required('VITE_SUPABASE_URL', env)
  const anon = required('VITE_SUPABASE_ANON_KEY', env)
  if (isServiceRoleLike(anon)) {
    throw new Error('VITE_SUPABASE_ANON_KEY appears to be service-role-like. Use only anon key.')
  }

  console.log('[supabase:setup] Starting...')
  validateFrontendSecurity()
  try {
    await validateAuthAndRls(url, anon)
  } catch (e) {
    const msg = String(e?.message ?? e)
    if (/Anonymous sign-ins are disabled/i.test(msg)) {
      throw e
    }
    throw e
  }
  console.log('[supabase:setup] DONE')
}

main().catch((err) => {
  console.error('[supabase:setup] FAILED:', err.message)
  process.exitCode = 1
})
