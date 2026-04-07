# Desarrollo iOS: Live Reload, Safari y Web Inspector

## Resumen

| Entorno                                | Uso                                                                                             |
| -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Safari en Mac (`npm run dev`)**      | Espejo **rápido** de layout (marco tipo iPhone en escritorio). **No** sustituye al dispositivo. |
| **iPhone + Capacitor + Vite**          | Ver cambios en tiempo casi real con **Live Reload** (`server.url` solo en dev).                 |
| **Safari → Develop**                   | Inspección del **WKWebView real** en el iPhone (build Debug).                                   |
| **Duplicación de pantalla del iPhone** | Monitor físico del dispositivo (función del sistema Apple), no del repo.                        |

## 1. Espejo rápido en Mac (sin cambios)

- `npm run dev` en `localhost`.
- En ventana ancha, el proyecto ya aplica simulación tipo iPhone (`IphoneFrame` + `force-iphone`); sirve para iterar **rápido** en CSS/layout.
- La **verdad final** para el usuario es **WKWebView en iPhone** (misma Wi‑Fi + Live Reload o build de release).

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

Luego, cuando toque empaquetar web + nativo:

```bash
npm run cap:sync
```

(`build` + `cap sync` sin variable de entorno → **no** queda `server.url` en la config generada.)

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

## Tareas en Cursor / VS Code

En `.vscode/tasks.json` hay tareas `cap:live:on` y `cap:live:off` para ejecutar desde el IDE.
