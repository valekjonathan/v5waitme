# v5waitme

WaitMe v5 — React 19 + Vite 8. Contrato de layout: `src/ui/layout/layout.ts`, shell único: `ScreenShell.tsx`.

## Desarrollo

```bash
npm install
npm run dev:ios
```

**En casa:** un solo comando — **`npm run dev:ios`** (o **`npm run dev`**). Misma **URL LAN** en Safari e iPhone; se actualizan solos (HMR) mientras el proceso sigue corriendo. La URL exacta sale en consola (`OPEN IN SAFARI` = `OPEN IN IPHONE`). **No** uses `localhost` para ese flujo en el iPhone.

**Fuera de casa:** la **IP LAN no sirve**. Si tienes **staging** en Vercel (rama `staging` + Preview), usa esa URL del dashboard → **[docs/STAGING_VERCEL.md](docs/STAGING_VERCEL.md)**. Si **no**, la referencia web es **producción** (tu dominio Vercel Production). Nativo: **TestFlight**.

**Producción iOS sin `server.url`:** **`npm run cap:sync:prod`**.

**Índice único:** **[docs/FLUJO_JONATHAN.md](docs/FLUJO_JONATHAN.md)**.

Solo navegador sin sync iOS: `npm run dev:vite`. iOS listo para tienda (sin `server.url`): `npm run cap:sync:prod`.

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
