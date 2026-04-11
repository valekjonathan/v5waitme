# Paridad Safari ↔ iPhone y fuentes de verdad

## Por qué `localhost` no es la verdad final

- **Safari en `http://localhost:5173`** solo existe mientras **Vite** está en marcha en **tu Mac**. No representa un despliegue estable ni es comparable con lo que lleva un **IPA** o **TestFlight**.
- **Paridad profesional** exige:
  - **Web:** la misma salida que `vite build` servida en una **URL HTTPS pública** (staging o producción).
  - **Nativo:** **`dist/`** copiado en el proyecto iOS con **`cap sync`** **sin** `WAITME_CAP_DEV_SERVER_URL`, de modo que **no** se genere `server.url` en Capacitor.

## Configuración actual (repo)

| Qué | Dónde |
|-----|--------|
| `webDir`, `appId`, `appName` | `capacitor.config.ts` → `webDir: 'dist'`, `appId: 'es.waitme.v5waitme'`, `appName: 'WaitMe'` |
| `server.url` (solo desarrollo) | Misma fuente: solo si **`WAITME_CAP_DEV_SERVER_URL`** está definida al ejecutar `npx cap sync` |
| Generado para Xcode | `ios/App/App/capacitor.config.json` (sin `server` cuando el sync es de producción) |

## Flujos

### A) Safari Mac = URL HTTPS real

1. Despliega el resultado de **`npm run build`** (carpeta `dist/`) en tu hosting (p. ej. flujo descrito en [STAGING_VERCEL.md](./STAGING_VERCEL.md) o producción en tu proveedor).
2. Abre en Safari la **URL HTTPS** de ese despliegue. Esa es la referencia web estable.

### B) iPhone = bundle embebido

1. **No** definas `WAITME_CAP_DEV_SERVER_URL`.
2. Ejecuta **`npm run ios:embed:sync`** (o **`npm run cap:sync:prod`**, equivalente): build web + `cap sync ios` con entorno limpio.
3. En Xcode: **Product → Archive** y distribución (TestFlight / Ad Hoc) según tu cuenta de desarrollador.

### C) Comparar “lo mismo” en los dos lados

- **Safari:** build de producción en **HTTPS**.
- **iPhone:** mismo commit / mismo `npm run build` embebido con sync de producción.  
No compares localhost con TestFlight.

## TestFlight (honesto)

El repo **no** sustituye a: cuenta **Apple Developer**, **signing** de distribución, **App Store Connect**, subida del **archive** y configuración de la app en el portal. Eso lo haces en Xcode y en [developer.apple.com](https://developer.apple.com). El proyecto iOS está en `ios/App/` para compilar y archivar; la viabilidad de TestFlight depende de tu equipo y certificados, no solo del código.

## Referencias

- [FLUJO_JONATHAN.md](./FLUJO_JONATHAN.md)
- [DEV_IOS_LIVE_RELOAD.md](./DEV_IOS_LIVE_RELOAD.md) (solo desarrollo; no es la solución final de paridad)
