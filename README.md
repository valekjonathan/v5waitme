# v5waitme

WaitMe v5 — React 19 + Vite 8. Contrato de layout: `src/ui/layout/layout.ts`, shell único: `ScreenShell.tsx`.

## Desarrollo

```bash
npm install
npm run dev
```

**LOCAL_DEV_MAC (único comando canónico):** **`npm run dev`** libera el puerto **5173** si hace falta, arranca Vite (`host: true`, `strictPort`), espera **HTTP 200** y abre Safari en **`http://localhost:5173/?iphone=true`** (marco tipo iPhone vía `IphoneFrame`). HMR mientras el proceso sigue.

**Sin abrir Safari** (solo Vite en terminal, p. ej. CI o automatización): **`npm run vite:only`**.

**En casa (iPhone físico + LAN + Capacitor):** **`npm run dev:ios`**. **No** uses `localhost` en el iPhone para OAuth en ese flujo; la consola imprime la URL LAN.

**Fuera de casa (Mac apagado):** **Vercel** preview/production (HTTPS); PWA: `manifest.json` + “Añadir a pantalla de inicio”. Ver **[docs/STAGING_VERCEL.md](docs/STAGING_VERCEL.md)**.

**IOS_BETA_REAL / TestFlight:** build sin `server.url` embebido: **`npm run cap:sync:prod`** (o `ios:embed:sync`). Supabase cloud en el build; OAuth nativo `es.waitme.v5waitme://auth-callback`.

**Índice:** **[docs/FLUJO_JONATHAN.md](docs/FLUJO_JONATHAN.md)**.

**Android:** no hay carpeta `android/` en este repo.

## Calidad

```bash
npm run lint        # eslint + tsc --noEmit
npm run test        # node:test
npm run test:ui     # Vitest
npm run build:check # Vite build rápido (minify off) — usado en pre-commit
npm run e2e         # Playwright E2E (alias de test:e2e; Vite en 5174 — ver e2e/README.md)
npm run quality     # gate completo = STATE_OF_APP + lint + test + test:ui + build
```

**Git hooks** (tras `npm install` se copian a `.git/hooks/`):

| Hook           | Qué ejecuta                                                 |
| -------------- | ----------------------------------------------------------- |
| **pre-commit** | `lint` + `test` + `build:check` (rápido; sin E2E ni Vitest) |
| **pre-push**   | `npm run quality` (igual que CI antes de subir código)      |

**E2E:** no van en hooks (pesado). Úsalos antes de releases sensibles o confía en CI: `npm run e2e`.

TypeScript gradual: `layout.ts`, `ScreenShell.tsx`, `services/reviews.ts`; el resto sigue en JS/JSX.

## Main y CI

- Cada **push** o **PR** a `main` ejecuta [`.github/workflows/ci.yml`](.github/workflows/ci.yml): `npm run quality` y luego **Playwright E2E**.
- El hook **pre-push** ya ejecuta `quality` localmente; CI repite el mismo gate + E2E.
- Snapshot: `GTP/STATE_OF_APP.txt` (generado en `quality`; no editar a mano).
