# Desarrollo iOS: Live Reload, Safari y Web Inspector

## Resumen

| Entorno                                | Uso                                                                                                                               |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Safari en Mac (`npm run dev`)**      | Misma URL **LAN** que el iPhone (`http://<IP>:5173`); en escritorio ancho, marco tipo iPhone. **No** sustituye al WKWebView real. |
| **iPhone + Capacitor + Vite**          | Ver cambios en tiempo casi real con **Live Reload** (`server.url` solo en dev).                                                   |
| **Safari → Develop**                   | Inspección del **WKWebView real** en el iPhone (build Debug).                                                                     |
| **Duplicación de pantalla del iPhone** | Monitor físico del dispositivo (función del sistema Apple), no del repo.                                                          |
| **BrowserStack (opcional)**            | Validación **secundaria** en navegadores / iOS remotos; **no** sustituye iPhone real ni WKWebView con Xcode.                      |

## 1. Espejo rápido en Mac

- `npm run dev`: Vite escucha en toda la interfaz; la URL correcta es **`http://<IP_LAN>:5173`** (se imprime al arrancar y Safari en macOS se abre ahí en condiciones normales).
- En ventana muy ancha y **hostname `localhost`**, puede activarse el marco tipo iPhone (`IphoneFrame`); **en LAN** (p. ej. IP del Mac) el layout es ancho completo, alineado con el iPhone en live reload.
- La **verdad final** nativa sigue siendo **WKWebView en iPhone** (misma Wi‑Fi + Live Reload o build de release).

**Guía corta de modos (casa / fuera / prod):** [FLUJO_JONATHAN.md](./FLUJO_JONATHAN.md).

## 2. Live Reload en iPhone real

**Requisitos:** Mac e iPhone en la misma red Wi‑Fi.

1. **Un solo comando** (sync iOS con `server.url` + Vite + Safari en macOS):

   ```bash
   npm run dev
   ```

   Incluye `cap sync ios` con `WAITME_CAP_DEV_SERVER_URL` (IP LAN automática, o `CAP_LAN_IP=…`). Puerto **5173** (`VITE_DEV_PORT` si cambias).

2. **Solo navegador / sin tocar Capacitor:** `npm run dev:vite`

3. **Xcode:** abrir `ios/App/App.xcworkspace` (o `npm run cap:open:ios`), **Run** en el **iPhone** (una vez por sesión o tras cambios nativos). La app carga desde `http://<LAN>:5173` con actualización vía Vite.

4. **`npm run cap:live:on`** sigue disponible si solo quieres sync sin arrancar Vite.

## 3. Volver a modo producción (sin `server.url`)

**Obligatorio** antes de archivar para TestFlight/App Store o si quieres probar el bundle embebido:

```bash
npm run cap:live:off
```

Equivale a `npx cap sync ios` **sin** `WAITME_CAP_DEV_SERVER_URL`. Si exportaste esa variable en la shell, haz `unset WAITME_CAP_DEV_SERVER_URL` antes o usa una terminal nueva.

Luego, cuando toque empaquetar web + nativo **sin arrastrar** `WAITME_CAP_DEV_SERVER_URL` de la shell:

```bash
npm run cap:sync:prod
```

(`build` + `cap sync` en un proceso que **elimina** la variable → **no** queda `server.url`. Si usas `npm run cap:sync` en la misma terminal donde exportaste la URL de dev, podría volver a inyectarse; por eso existe `cap:sync:prod`.)

## 4. Inspeccionar el WKWebView real

- En **Debug**, `InspectableBridgeViewController` pone `webView.isInspectable = true` (iOS 16.4+), solo con `#if DEBUG`.
- En el **iPhone:** Ajustes → Safari → Avanzado → **Inspector web** (activado).
- En el **Mac:** Safari → Preferencias → Avanzado → “Mostrar menú Desarrollo”; menú **Desarrollo** → [tu iPhone] → [WaitMe].

## 5. Duplicación del iPhone como monitor

Usa las funciones del sistema (p. ej. duplicación de pantalla / Continuidad según tu versión de macOS/iOS). No forma parte de este repositorio; solo sirve para **ver** el hardware, no para sustituir Live Reload ni al inspector.

## 6. Producción limpia

- `capacitor.config.ts` **no** incluye `server` salvo que exista `WAITME_CAP_DEV_SERVER_URL` en el momento de `cap sync`.
- No commitees `WAITME_CAP_DEV_SERVER_URL` en `.env` de producción.
- Tras desarrollo con live reload, ejecuta **`npm run cap:live:off`** antes de entregar un build “real”.

## 7. BrowserStack (opcional, secundario)

**No forma parte del flujo principal** de este repo (iPhone físico + Live Reload + Web Inspector). No hay scripts ni dependencias npm de BrowserStack; el flujo de `npm run dev` / `cap:sync` **no cambia**.

### Para qué sí puede servir

- Probar la **app web** (mismo front en el navegador) en **otras versiones de Safari / iOS** o dispositivos que no tengas a mano.
- Smoke tests de **layout responsive** o regresiones visuales **aproximadas** en la nube.

### Para qué no sirve (no usarlo como sustituto del flujo principal)

- **No** reemplaza un **iPhone con Capacitor** conectado por Xcode: no es el mismo binario nativo ni el mismo WKWebView con plugins y permisos reales.
- **No** sustituye **Safari → Develop** sobre el dispositivo ni **Live Reload** en LAN.
- **No** valida rendimiento real, GPS, cámara ni el comportamiento exacto del usuario final en App Store.

### Localhost y BrowserStack Local (solo si lo necesitas)

Si en algún momento quieres que la nube de BrowserStack acceda a tu **`http://localhost:5173`**, la vía habitual es **[BrowserStack Local](https://www.browserstack.com/docs/app-live/local-testing)** (binario o aplicación oficial con tus credenciales de cuenta). Es **opcional**, manual y **ajena** a `capacitor.config` y a producción: **no** añade `server.url` ni toca el build.

### ¿Merece la pena en WaitMe?

Solo si necesitas **matriz extra de Safari/iOS en navegador** sin más hardware. Para el producto **Capacitor**, la referencia sigue siendo **iPhone real**.

## Tareas en Cursor / VS Code

En `.vscode/tasks.json` hay tareas `cap:live:on` y `cap:live:off` para ejecutar desde el IDE.
