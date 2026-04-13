# v5waitme

WaitMe v5 — React 19 + Vite 8. Contrato de layout: `src/ui/layout/layout.ts`, shell único: `ScreenShell.tsx`.

## Dos modos (no mezclar)

| Modo | Qué es | Comando / URL |
|------|--------|----------------|
| **Preview web (Mac)** | Vite en caliente; abre manualmente Safari (o el navegador) en **`http://localhost:5173/?iphone=true`** (marco `IphoneFrame`) | `npm run dev` |
| **App iOS real** | `dist/` copiado dentro del proyecto Xcode; **sin** servidor de desarrollo, **sin** `server.url` | `npm run build && npx cap sync ios` → instalar desde Xcode / TestFlight |

La app nativa **no** usa localhost ni el Mac: embebe solo archivos estáticos tras `vite build`.

## Desarrollo

```bash
npm install
npm run dev
```

**Preview:** con el servidor en marcha, abre **`http://localhost:5173/?iphone=true`** en Safari.

**iOS (IPA / dispositivo):** `npm run build && npx cap sync ios` y abre `ios/` en Xcode. No hay live reload ni `server.url` en este flujo.

**Web pública (Mac apagado):** deploy en Vercel. PWA: `public/manifest.json` + meta en `index.html`.

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
