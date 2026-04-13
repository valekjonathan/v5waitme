# Flujo de trabajo: en casa, fuera y producción

**Documento maestro.** El resto amplía detalles: [DEV_IOS_LIVE_RELOAD.md](./DEV_IOS_LIVE_RELOAD.md) (casa técnico), [STAGING_VERCEL.md](./STAGING_VERCEL.md) (staging en Vercel).

---

## Verdad operativa (no mezclar)

| Dónde estás       | Qué usar                                                                                                              | Qué **no** usar                                                            |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Casa**          | `npm run dev:ios` + URL **LAN** (`http://192.168.x.x:5173` o `10.x.x.x:5173`, la que imprime el script)               | `localhost` / `127.0.0.1` en iPhone ni en Supabase para OAuth en este modo |
| **Fuera de casa** | **No** la IP LAN (no alcanza tu Mac). Web: **staging** (si lo montaste) **o** **producción**. Nativo: **TestFlight**. | Abrir la URL LAN del Wi‑Fi de casa desde fuera                             |
| **Producción**    | `npm run cap:sync:prod` (iOS sin `server.url`) + deploy web habitual                                                  | `WAITME_CAP_DEV_SERVER_URL` en la misma shell que `cap sync` de tienda     |

---

## Hoja de ruta rápida

| Situación              | Qué hacer                                                                                                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Casa — iterar UI**   | **`npm run dev:ios`** (único comando de trabajo). Safari e iPhone usan **la misma URL LAN**; se actualizan solos con HMR mientras Vite sigue en marcha.                                                                   |
| **Casa — Safari**      | Se abre **solo** en la URL LAN (tras `200` en `/`). Mira **`OPEN IN SAFARI`** en consola.                                                                                                                                 |
| **Casa — iPhone**      | Misma Wi‑Fi + app instalada desde Xcode al menos una vez. Misma URL que **`OPEN IN IPHONE`**.                                                                                                                             |
| **Fuera — web**        | Si **staging** está montado en Vercel → URL del **Preview** de la rama `staging` (ver [STAGING_VERCEL.md](./STAGING_VERCEL.md)). Si **no** hay staging → usa la **URL web de producción** (dominio Production de Vercel). |
| **Fuera — app nativa** | **TestFlight** (build sin live reload del Mac).                                                                                                                                                                           |
| **Tienda iOS**         | **`npm run cap:sync:prod`** + Xcode / TestFlight.                                                                                                                                                                         |

---

## A) En casa (única forma correcta de iterar cambios)

**Comando único en casa con iPhone:** **`npm run dev:ios`**. **Solo Safari Mac + marco iPhone:** **`npm run dev`** (URL `http://localhost:5173/?iphone=true`). **Solo Vite sin abrir Safari:** **`npm run vite:only`**.

**Cursor / VS Code:** tarea **`dev:ios`** o **`dev`**.

**Qué hace (resumen)**

1. Detecta IP LAN (10.x / 192.168.x); opcional `CAP_LAN_IP=…` o `SKIP_LAN_PING=1`.
2. Actualiza **`.env.local`** → `VITE_DEV_LAN_ORIGIN=http://<IP>:5173`.
3. `WAITME_CAP_DEV_SERVER_URL` = misma URL → **`npx cap sync ios`** (iPhone apunta al Mac).
4. Arranca **Vite** (5173, HMR, sin abrir Chrome desde Vite).
5. Cuando **`/`** responde, en **macOS** abre **solo Safari** en esa URL.

**URL exacta en Safari e iPhone en casa:** la de **`RUNNING ON LAN`**, **`OPEN IN SAFARI`** y **`OPEN IN IPHONE`** (las tres iguales). **No** uses `http://localhost:5173` para el flujo iPhone + OAuth en casa.

**Autoactualización:** con **`npm run dev:ios`** activo, los cambios en código se reflejan solos en **Safari (LAN)** y en el **WKWebView del iPhone** (mismo servidor Vite).

**Solo web sin tocar Capacitor:** `npm run dev` (Safari + preview) o `npm run vite:only` (solo Vite). IP LAN para OAuth en iPhone: ver `.env.local` y `dev:ios`.

---

## B) Fuera de casa

**La IP LAN de tu Mac no sirve** fuera de tu red: no intentes abrirla en el iPhone en 4G ni en Wi‑Fi ajena.

**Staging (remoto “casi producción”)**

- **No está “operativo” en el repo** por sí solo: hace falta que **tú** tengas en Vercel un **Preview** de la rama **`staging`** (Git conectado + push a `staging`).
- Si **ya** lo tienes: la URL es la que muestra Vercel en **Deployments → rama staging → Visit** (no va fijada en el repo). Pasos: [STAGING_VERCEL.md](./STAGING_VERCEL.md).
- Si **aún no** lo tienes: el **siguiente paso** es crear la rama `staging`, empujarla y comprobar en el dashboard que aparece un deploy Preview; luego copiar la URL y añadirla en Supabase **Redirect URLs**. Hasta entonces, **fuera de casa la referencia web es producción**.

**Si no hay staging montado**

- **Web:** abre tu **URL de producción** (Vercel Production / dominio real).
- **Nativo:** **TestFlight**.

**OAuth:** cada URL pública que uses (staging o prod) debe estar en Supabase; ver tabla más abajo.

---

## C) Producción (protegida)

1. **`npm run cap:live:off`** (o terminal sin `WAITME_CAP_DEV_SERVER_URL`).
2. **`npm run cap:sync:prod`** → `build` + `cap sync ios` **sin** arrastrar la variable de dev → **no** queda `server.url` en `ios/App/App/capacitor.config.json`.
3. **No** uses `npm run dev:ios` para el binario de tienda.

**Web:** deploy Production en Vercel como siempre.

---

## OAuth / Supabase (Redirect URLs)

| Entorno                     | Redirect                                             |
| --------------------------- | ---------------------------------------------------- |
| Nativo                      | `capacitor://localhost`                              |
| Web **casa**                | `http://<IP_LAN>:5173` (misma que imprime `dev:ios`) |
| Web **staging** (si existe) | `https://<URL exacta del dashboard Vercel>`          |
| Web **producción**          | `https://<tu dominio production>`                    |

---

## Cursor (tareas)

- **`dev:ios`** / **`dev`** → modo casa.
- **`cap:live:off`** → quita live reload del proyecto iOS.
- **`cap:sync:prod`** → iOS listo para tienda sin `server.url`.

---

## Resumen de comandos

| Situación        | Comando                                      |
| ---------------- | -------------------------------------------- |
| Casa, iterar     | **`npm run dev:ios`**                        |
| Casa, iOS limpio | `npm run ios:fresh:dev`                      |
| Quitar live iOS  | `npm run cap:live:off`                       |
| iOS tienda-ready | **`npm run cap:sync:prod`**                  |
| Fuera, web       | Staging (si existe) **o** URL **producción** |
| Fuera, app real  | TestFlight                                   |
