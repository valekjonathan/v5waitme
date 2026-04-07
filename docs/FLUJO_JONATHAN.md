# Flujo de trabajo: en casa, fuera y producción

Tres modos separados. Sin mezclar URLs ni `server.url` en builds finales.

## Hoja de ruta (léelo primero)

| Situación                         | Qué usar                                                                                                                                              |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Casa — Safari Mac**             | La URL que imprime la consola: **`RUNNING ON LAN: http://…:5173`** al hacer `npm run dev` (misma que OAuth web en dev).                               |
| **Casa — iPhone**                 | Misma Wi‑Fi + **`npm run dev`** (live reload al Mac). Primera vez: Run desde Xcode.                                                                   |
| **Fuera — web “casi producción”** | URL del deploy **Preview** de la rama **`staging`** en Vercel → [STAGING_VERCEL.md](./STAGING_VERCEL.md) (la copias del dashboard; no va en el repo). |
| **Fuera — app nativa real**       | **TestFlight** (build sin `server.url`, ver modo C).                                                                                                  |
| **Producción web**                | Dominio **Production** de Vercel (rama habitual `main`).                                                                                              |
| **Producción iOS tienda**         | **`npm run cap:sync:prod`** + Xcode / TestFlight.                                                                                                     |

---

## A) Dev en casa (cambios al instante)

**Qué ejecutar (una vez por sesión de trabajo)**  
En Cursor: tarea **dev** (`.vscode/tasks.json`) o en terminal: `npm run dev`.

**Qué hace solo el comando**

1. Detecta IP LAN (10.x o 192.168.x), opcional `CAP_LAN_IP=…` si hace falta.
2. Exporta `WAITME_CAP_DEV_SERVER_URL=http://<IP>:5173` y ejecuta `npx cap sync ios` → el iPhone nativo apunta al Mac.
3. Arranca Vite (host de red, puerto 5173, HMR).
4. En macOS abre **Safari** en la URL LAN (la misma que debe usar el OAuth web).

**URL correcta Safari en casa:** exactamente la de **`RUNNING ON LAN`** / **`ABRE ESTA URL EN TU IPHONE`** (mismo origen). No uses `localhost` en el iPhone ni para Supabase redirect en ese modo.

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

## B) Fuera de casa (staging remoto)

**Objetivo**  
Ver la **app web** como build de producción (`vite build`), **sin Mac ni Wi‑Fi de casa**.

**Implementación en el repo**  
No hace falta workflow extra en GitHub: con el proyecto **ya enlazado a Git**, cada push a la rama **`staging`** genera un **Preview Deployment** en Vercel.

**Tu URL de staging**  
La copias **una vez** del dashboard (Deployments → rama `staging` → Visit). Detalle paso a paso: **[STAGING_VERCEL.md](./STAGING_VERCEL.md)**.

**OAuth**  
Añade esa URL exacta en Supabase **Redirect URLs** (tabla en STAGING_VERCEL.md).

**Nativo iOS fuera de casa**  
**TestFlight** (modo C). No hay live reload del Mac.

---

## C) Producción (limpio, sin `server.url`)

**Web**  
Deploy **Production** en Vercel (normalmente rama `main`).

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

## OAuth / Supabase (cuatro entornos)

| Entorno            | Código (resumen)                        | Redirect en Supabase                     |
| ------------------ | --------------------------------------- | ---------------------------------------- |
| iOS/Android nativo | `capacitor://localhost`                 | `capacitor://localhost`                  |
| Web dev (casa)     | `VITE_DEV_LAN_ORIGIN` (IP LAN)          | `http://<IP_LAN>:5173`                   |
| Web staging        | `window.location.origin` (build Vercel) | `https://<tu-url-staging-del-dashboard>` |
| Web producción     | `window.location.origin`                | `https://<tu-dominio-production>`        |

No mezclar: el nativo **nunca** usa Vercel en `server.url`; el web staging **nunca** debe depender de la IP de casa.

---

## Cursor (sin repetir comandos a mano)

- **Run Task → `dev`**: modo A completo.
- **Run Task → `cap:live:off`**: quita live reload del proyecto iOS.
- **Run Task → `cap:sync:prod`**: build + sync producción iOS seguro.

Más detalle técnico iOS/Safari: [DEV_IOS_LIVE_RELOAD.md](./DEV_IOS_LIVE_RELOAD.md).  
Staging remoto paso a paso: [STAGING_VERCEL.md](./STAGING_VERCEL.md).

---

## Resumen rápido

| Situación        | Comando / acción principal                     |
| ---------------- | ---------------------------------------------- |
| Casa, iterar     | `npm run dev`                                  |
| Casa, iOS limpio | `npm run ios:fresh:dev`                        |
| Quitar live iOS  | `npm run cap:live:off`                         |
| iOS tienda-ready | `npm run cap:sync:prod`                        |
| Fuera, web       | URL Preview rama `staging` en Vercel (ver doc) |
| Fuera, app real  | TestFlight (build sin `server`)                |
