# Desarrollo iOS: Live Reload, Safari y Web Inspector

## Resumen

| Entorno                                | Uso                                                                                                                         |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Safari en Mac (`npm run dev:ios`)**  | Espejo en la **misma URL LAN** que el iPhone; Safari se abre **solo** ahí tras arrancar Vite (no Chrome ni Simple Browser). |
| **iPhone + Capacitor + Vite**          | Live reload real (`server.url` solo en dev, misma URL que `VITE_DEV_LAN_ORIGIN` en `.env.local`).                           |
| **Safari → Develop**                   | Inspección del **WKWebView real** en el iPhone (build Debug).                                                               |
| **Duplicación de pantalla del iPhone** | Monitor físico del dispositivo (función del sistema Apple), no del repo.                                                    |
| **BrowserStack (opcional)**            | Validación **secundaria** en navegadores / iOS remotos; **no** sustituye iPhone real ni WKWebView con Xcode.                |

## 1. Un solo comando (casa) — forma correcta de iterar

```bash
npm run dev:ios
```

(`npm run dev` es el mismo flujo.) **Pantallas, botones y layout:** trabaja siempre así en casa; Safari e iPhone comparten la misma URL LAN y se actualizan solos con HMR.

**Qué hace el script**

1. Detecta IPv4 LAN (10.x / 192.168.x) y valida con ping (o `SKIP_LAN_PING=1`).
2. Escribe/actualiza **`.env.local`** → `VITE_DEV_LAN_ORIGIN=http://<IP>:5173`.
3. Exporta `WAITME_LAN_IP` y `WAITME_CAP_DEV_SERVER_URL` (misma URL) y ejecuta **`npx cap sync ios`** → `server.url` + `cleartext: true` en la config generada (solo si existe la variable; nunca en prod sin ella).
4. Arranca **Vite** en **5173**, `host: true`, HMR sin overlay agresivo, **sin** abrir navegador desde Vite.
5. Cuando **`/`** responde **200**, en macOS abre **solo Safari** en esa URL LAN.

**Logs al inicio**

- `RUNNING ON LAN: http://…`
- `OPEN IN SAFARI: …`
- `OPEN IN IPHONE: …`

**Solo Vite / sin sync iOS:** `npm run dev:vite`  
**Solo sync iOS (sin Vite):** `npm run cap:live:on`  
**IP manual:** `CAP_LAN_IP=192.168.x.x npm run dev:ios`  
**Solo imprimir IP / variables:** `npm run get:lan-ip` · `node scripts/get-lan-ip.mjs --export-env` (líneas `WAITME_LAN_IP=…` y `WAITME_CAP_DEV_SERVER_URL=…`).

## 2. Live Reload en iPhone real

**Requisitos:** Mac e iPhone en la misma red Wi‑Fi.

1. `npm run dev:ios` (ver arriba).
2. **Xcode:** abrir `ios/App/App.xcworkspace` (o `npm run cap:open:ios`), **Run** en el **iPhone** (una vez por sesión o tras cambios nativos). La app carga desde `http://<LAN>:5173`.

## 3. Volver a modo producción (sin `server.url`)

```bash
npm run cap:live:off
```

Empaquetar web + iOS **sin** arrastrar `WAITME_CAP_DEV_SERVER_URL`:

```bash
npm run cap:sync:prod
```

## 4. Inspeccionar el WKWebView real

- En **Debug**, `InspectableBridgeViewController` pone `webView.isInspectable = true` (iOS 16.4+), solo con `#if DEBUG`.
- En el **iPhone:** Ajustes → Safari → Avanzado → **Inspector web** (activado).
- En el **Mac:** Safari → Preferencias → Avanzado → “Mostrar menú Desarrollo”; menú **Desarrollo** → [tu iPhone] → [WaitMe].

## 5. Duplicación del iPhone como monitor

Usa las funciones del sistema (p. ej. duplicación de pantalla / Continuidad según tu versión de macOS/iOS). No forma parte de este repositorio.

## 6. Producción limpia

- `capacitor.config.ts` **no** incluye `server` salvo que exista `WAITME_CAP_DEV_SERVER_URL` en el momento de `cap sync`.
- No commitees `WAITME_CAP_DEV_SERVER_URL` en `.env` de producción.
- Tras desarrollo con live reload, **`npm run cap:live:off`** y **`npm run cap:sync:prod`** antes de un build “real”.

## 7. BrowserStack (opcional, secundario)

**No forma parte del flujo principal** de este repo. No hay scripts ni dependencias npm de BrowserStack; `npm run dev:ios` / `cap:sync` **no cambian**.

### Localhost y BrowserStack Local (solo si lo necesitas)

Si quieres que la nube acceda a tu **`http://localhost:5173`**, la vía habitual es **[BrowserStack Local](https://www.browserstack.com/docs/app-live/local-testing)**. Es **opcional** y **ajena** a `capacitor.config` y a producción.

## Tareas en Cursor / VS Code

En `.vscode/tasks.json` la tarea **dev** ejecuta `npm run dev` (= `dev:ios`).

**Verdad operativa (casa / fuera / prod):** [FLUJO_JONATHAN.md](./FLUJO_JONATHAN.md).  
**Staging (solo si lo montaste en Vercel):** [STAGING_VERCEL.md](./STAGING_VERCEL.md).
