# v5waitme

WaitMe v5 — React 19 + Vite 8. Contrato de layout: `src/ui/layout/layout.ts`, shell único: `ScreenShell.tsx`.

## Dos modos (no mezclar)

| Modo | Qué es | Comando / URL |
|------|--------|----------------|
| **Preview web Jonathan (Mac)** | `npm run dev` abre Safari automáticamente en **`http://localhost:5173/`** con viewport iPhone dev fijo y centrado | `npm run dev` |
| **Preview live iPhone fuera de casa** | `npm run dev:public` expone el localhost real por HTTPS temporal vía Cloudflare Quick Tunnel | `npm run dev:public` |
| **App iOS real (fuente de verdad móvil)** | bundle web embebido en el proyecto iOS del repo, con auth nativa por deep link y sin `server.url` | `npm run ios:embed:sync` → instalar desde Xcode / TestFlight |

La app nativa **no** usa localhost ni el Mac: embebe solo archivos estáticos tras `vite build`.

## Desarrollo

```bash
npm install
npm run dev
```

**Preview Jonathan:** `npm run dev` abre Safari automáticamente en **`http://localhost:5173/`**. El viewport iPhone dev en Mac queda fijo para Jonathan y no vuelve al ancho normal.

**iOS (IPA / dispositivo):** `npm run ios:embed:sync` y abre `ios/` en Xcode. No hay live reload, no hay `server.url` y la referencia móvil seria ya no depende de PWA/Añadir a inicio.

**Web pública estable:** deploy en Vercel. Mantiene la demo web; no sustituye la validación nativa iOS.

**Índice:** [docs/FLUJO_JONATHAN.md](docs/FLUJO_JONATHAN.md).

**Android:** no hay carpeta `android/` en este repo.

## Calidad

```bash
npm run quality
```

Incluye eslint, tsc, knip, tests, vitest y `vite build`. **Git hooks:** si instalas hooks con `node scripts/ensure-git-hooks.mjs`, pre-commit ejecuta eslint + tsc + tests + `build-check` (sin el gate completo).

TypeScript gradual: `layout.ts`, `ScreenShell.tsx`, `services/reviews.ts`; el resto en JS/JSX.

## Main y CI

- Push/PR a `main`: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — `quality` + Playwright E2E.
- `GTP/STATE_OF_APP.txt` se genera en `quality` (no editar a mano).
