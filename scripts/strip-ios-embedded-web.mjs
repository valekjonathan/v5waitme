#!/usr/bin/env node
/**
 * Tras `cap sync ios` con `WAITME_CAP_DEV_SERVER_URL`, borra la copia embebida en
 * `ios/App/App/public`. El runtime debe usar solo `server.url` (Vite LAN); evita mezcla con bundle estático.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

export function stripIosEmbeddedWeb(rootDir = root) {
  const publicDir = path.join(rootDir, 'ios', 'App', 'App', 'public')
  try {
    fs.rmSync(publicDir, { recursive: true, force: true })
    console.info('[waitme] Eliminado ios/App/App/public (modo live: solo server.url).\n')
  } catch (e) {
    console.warn('[waitme] No se pudo eliminar ios/App/App/public:', e)
  }
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isCli) {
  stripIosEmbeddedWeb()
}
