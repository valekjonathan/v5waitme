# Flujo de trabajo: en casa, fuera y producción

Tres modos separados. Sin mezclar URLs ni `server.url` en builds finales.

## A) Dev en casa (cambios al instante)

**Qué ejecutar (una vez por sesión de trabajo)**  
En Cursor: tarea **dev** (`.vscode/tasks.json`) o en terminal: `npm run dev`.

**Qué hace solo el comando**

1. Detecta IP LAN (10.x o 192.168.x), opcional `CAP_LAN_IP=…` si hace falta.
2. Exporta `WAITME_CAP_DEV_SERVER_URL=http://<IP>:5173` y ejecuta `npx cap sync ios` → el iPhone nativo apunta al Mac.
3. Arranca Vite (host de red, puerto 5173, HMR).
4. En macOS abre **Safari** en la URL LAN (la misma que debe usar el OAuth web).

**Qué debes tener abierto**

- Terminal / tarea con `npm run dev` (Vite vivo).
- iPhone con la app **ya instalada** desde Xcode al menos una vez; en la misma Wi‑Fi que el Mac.

**Qué se actualiza solo**

- Código web: HMR en Safari (LAN) y en el WKWebView del iPhone (live reload al mismo servidor).

**Qué no es este modo**

- No es Vercel. No uses `*.vercel.app` en `WAITME_CAP_DEV_SERVER_URL` (Capacitor lo rechaza).

**Si algo falla el ping a la IP**  
`SKIP_LAN_PING=1 npm run dev`

**Solo web, sin tocar iOS**  
`npm run dev:vite`

---

## B) Fuera de casa (staging = “casi como el usuario”)

**Objetivo**  
Ver la **app web** empaquetada como en producción, sin Mac ni LAN. El repo ya está enlazado a **Vercel** (proyecto `v5waitme`).

**Ruta recomendada (profesional y mínima)**

1. En [Vercel](https://vercel.com): proyecto **v5waitme** → **Settings → Git** → activa una rama **staging** (o usa **Preview Deployments** por PR).
2. Cada push a esa rama genera un deploy. La URL aparece en el dashboard (p. ej. `v5waitme-git-staging-….vercel.app`) o, mejor, asigna un subdominio fijo tipo `staging.tudominio.com` en **Domains** del mismo proyecto o de un proyecto solo-staging.

**Variables de entorno en Vercel**

- **Production**: las de usuarios finales (`VITE_SUPABASE_*`, Mapbox, etc.).
- **Preview / staging**: puedes usar el mismo Supabase que prod o uno de staging; lo importante es **no confundir** qué entorno estás mirando (nombre del dominio / rama).

**Cómo saber que ves staging y no producción**

- El **dominio** en la barra del navegador (preview/staging ≠ producción).
- Opcional: en Supabase, proyecto o redirect URLs distintos por entorno.

**Nativo iOS fuera de casa**

- **TestFlight** (build sin `server.url`, ver modo C). No hay “live reload” remoto del Mac; es el binario real.

**OAuth (Supabase → URL Configuration → Redirect URLs)**  
Debes tener listadas **todas** las orígenes que uses:

| Dónde              | Redirect / origen típico                             |
| ------------------ | ---------------------------------------------------- |
| iOS/Android nativo | `capacitor://localhost`                              |
| Web dev en casa    | `http://<IP_LAN>:5173` (misma que imprime Vite)      |
| Web staging        | `https://<tu-staging>.vercel.app` (o tu dominio)     |
| Web producción     | `https://<tu-producción>` (`window.location.origin`) |

---

## C) Producción (limpio, sin `server.url`)

**Web**  
Deploy habitual en Vercel (rama production de tu proyecto).

**iOS nativo final**  
No uses `npm run dev` para generar el binario de tienda.

1. Asegúrate de no arrastrar live reload: **`npm run cap:live:off`** (o una terminal sin `WAITME_CAP_DEV_SERVER_URL`).
2. Empaqueta web + sync **sin** variable de dev: **`npm run cap:sync:prod`**  
   (equivale a `build` + `cap sync ios` con `WAITME_CAP_DEV_SERVER_URL` eliminada del entorno del proceso).
3. Abre Xcode y archiva / sube a TestFlight como siempre.

**Comprobar que no quedó `server.url`**  
En `ios/App/App/capacitor.config.json` **no** debe existir el bloque `"server"` tras un sync de producción.

**Limpieza profunda tras muchos experimentos iOS**  
`npm run ios:fresh:dev` (dev otra vez) vs para prod usar `cap:sync:prod` tras `cap:live:off`.

---

## Cursor (sin repetir comandos a mano)

- **Run Task → `dev`**: modo A completo.
- **Run Task → `cap:live:off`**: quita live reload del proyecto iOS.
- **Run Task → `cap:sync:prod`**: build + sync producción iOS seguro.

Más detalle técnico iOS/Safari: [DEV_IOS_LIVE_RELOAD.md](./DEV_IOS_LIVE_RELOAD.md).

---

## Resumen rápido

| Situación        | Comando / acción principal      |
| ---------------- | ------------------------------- |
| Casa, iterar     | `npm run dev`                   |
| Casa, iOS limpio | `npm run ios:fresh:dev`         |
| Quitar live iOS  | `npm run cap:live:off`          |
| iOS tienda-ready | `npm run cap:sync:prod`         |
| Fuera, web       | URL staging/preview en Vercel   |
| Fuera, app real  | TestFlight (build sin `server`) |
