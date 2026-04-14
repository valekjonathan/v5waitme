# Flujo de trabajo: preview web vs app iOS embebida

**Documento maestro.** Staging Vercel: [STAGING_VERCEL.md](./STAGING_VERCEL.md).

---

## Dos caminos separados

| Objetivo | Cómo | Qué **no** mezclar |
|----------|------|-------------------|
| **Iterar UI en el Mac (Jonathan)** | `npm run dev` (Vite :5173; en macOS abre Safari cuando responde OK). URL fija: `http://localhost:5173/` | Safari queda siempre en viewport iPhone dev, no en ancho normal |
| **Ver cambios fuera de casa** | `npm run dev:public` | Túnel HTTPS temporal sobre el localhost real, sin push |
| **App nativa en iPhone (verdad móvil)** | `npm run ios:embed:sync` → `dist/` dentro de `ios/` → compilar en Xcode | Sin `server.url`, sin PWA/A2HS como referencia, sin Vite en el iPhone |
| **Web pública** | Deploy Vercel (preview/production) | OAuth HTTPS; ver Supabase Redirect URLs |

---

## A) Preview web (Mac)

1. `npm run dev` (libera :5173 si hace falta; luego Vite).
2. En **macOS**, Safari abre **`http://localhost:5173/`** cuando el servidor responde. Para Jonathan este viewport iPhone dev queda fijo y centrado; no se usa ancho normal ni marco falso.

Para OAuth en **otro dispositivo en la misma red**, puedes poner en `.env.local` una `VITE_DEV_LAN_ORIGIN` con la IP de tu Mac (ver `.env.example`); eso **no** afecta a la app nativa iOS.

---

## B) App iOS nativa (sin servidor)

1. Variables de build: `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` apuntando a **Supabase cloud** (no loopback). Ver `.env.example` y `vite.config.js` para `vite build`.
2. **`npm run ios:embed:sync`**: `vite build` + `cap sync ios` **sin** `WAITME_CAP_DEV_SERVER_URL`.
3. `ios/App/App/capacitor.config.json` generado solo con `webDir: dist` (sin bloque `server`).
4. Abre el proyecto en Xcode, instala en dispositivo o archive para TestFlight.

El WKWebView carga **`index.html` desde el bundle embebido** (`public/` en el proyecto iOS), no desde localhost ni Vercel. La referencia seria para login/layout móvil pasa a ser esta app nativa, no una PWA añadida a inicio.

---

## C) Fuera de casa

- **Live local gratis:** `npm run dev:public` → Cloudflare Quick Tunnel (`https://<slug>.trycloudflare.com`) apuntando al localhost real con recarga instantánea.
- **Web estable:** URL de Vercel (staging o production).
- **Nativo:** Xcode/TestFlight/App Store (build del apartado B).

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
| Servidor dev público temporal | `npm run dev:public` |
| iOS listo para dispositivo/TestFlight | `npm run ios:embed:sync` |
| iOS limpio sin residuos de bundle previo | `npm run ios:embed:sync:clean` |
| Sync iOS tras cambios sin script de prod | `npm run cap:sync` (incluye `build`) |

---

## Cursor / VS Code

Tarea **`dev`** → `npm run dev`. Tarea **`dev:public`** → `npm run dev:public`. Tarea **`ios:embed:sync`** → `npm run ios:embed:sync`.
