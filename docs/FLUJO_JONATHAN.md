# Flujo de trabajo: preview web vs app iOS embebida

**Documento maestro.** Staging Vercel: [STAGING_VERCEL.md](./STAGING_VERCEL.md).

---

## Dos caminos separados

| Objetivo | Cómo | Qué **no** mezclar |
|----------|------|-------------------|
| **Iterar UI en el Mac** | `npm run dev` (Vite :5173). En Safari: `http://localhost:5173/?iphone=true` | No es la app Xcode; es solo navegador |
| **App instalada en iPhone** | `npm run ios:embed:sync` → `dist/` dentro de `ios/` → compilar en Xcode | Sin `server.url`, sin IP LAN, sin Vite en el iPhone |
| **Web pública** | Deploy Vercel (preview/production) | OAuth HTTPS; ver Supabase Redirect URLs |

---

## A) Preview web (Mac)

1. `npm run dev`
2. Abre Safari en **`http://localhost:5173/?iphone=true`** (marco opcional vía query).

Para OAuth en **otro dispositivo en la misma red**, puedes poner en `.env.local` una `VITE_DEV_LAN_ORIGIN` con la IP de tu Mac (ver `.env.example`); eso **no** afecta a la app nativa iOS.

---

## B) App iOS real (sin servidor)

1. Variables de build: `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` apuntando a **Supabase cloud** (no loopback). Ver `.env.example` y `vite.config.js` para `vite build`.
2. **`npm run ios:embed:sync`** (alias de `cap:sync:prod`): `vite build` + `cap sync ios` **sin** `WAITME_CAP_DEV_SERVER_URL`.
3. `ios/App/App/capacitor.config.json` generado solo con `webDir: dist` (sin bloque `server`).
4. Abre el proyecto en Xcode, instala en dispositivo o archive para TestFlight.

El WKWebView carga **`index.html` desde el bundle embebido** (`public/` en el proyecto iOS), no desde localhost ni Vercel.

---

## C) Fuera de casa

- **Web:** URL de Vercel (staging o production).
- **Nativo:** TestFlight / App Store (build del apartado B).

---

## OAuth / Supabase (Redirect URLs)

| Entorno | Ejemplo de redirect |
|---------|---------------------|
| Nativo iOS | `es.waitme.v5waitme://auth-callback` |
| Web local | `http://localhost:5173/auth/callback` |
| Web LAN (si usas `VITE_DEV_LAN_ORIGIN`) | `http://<IP>:5173/auth/callback` |
| Web Vercel | `https://<tu-dominio>/auth/callback` |

---

## Comandos útiles

| Situación | Comando |
|-----------|---------|
| Servidor dev | `npm run dev` |
| iOS listo para dispositivo/TestFlight | `npm run ios:embed:sync` |
| Sync iOS tras cambios sin script de prod | `npm run cap:sync` (incluye `build`) |

---

## Cursor / VS Code

Tarea **`dev`** → `npm run dev`. Tarea **`cap:sync:prod`** → `npm run ios:embed:sync`.
