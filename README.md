# v5waitme

WaitMe v5 — React 19 + Vite 8. Contrato de layout: `src/ui/layout/layout.ts`, shell único: `ScreenShell.tsx`.

## Dos modos (no mezclar)

| Modo | Qué es | Comando / URL |
|------|--------|----------------|
| **Preview web (Mac)** | Vite en caliente, Safari u otro navegador | `npm run dev` → abre **`http://localhost:5173/?iphone=true`** para el marco tipo iPhone (`IphoneFrame`) |
| **App iOS real** | `dist/` copiado dentro del proyecto Xcode; **sin** servidor de desarrollo, **sin** `server.url` | `npm run ios:embed:sync` (equiv. `cap:sync:prod`) → instalar desde Xcode / TestFlight |

La app nativa **no** usa localhost ni el Mac: embebe solo archivos estáticos tras `vite build`.

## Desarrollo

```bash
npm install
npm run dev
```

**Preview:** con el servidor en marcha, en Safari (Mac) entra a `http://localhost:5173/?iphone=true`.

**iOS (IPA / dispositivo):** `npm run ios:embed:sync` y abre `ios/` en Xcode. No hay live reload ni `WAITME_CAP_DEV_SERVER_URL` en este flujo.

**Web pública (Mac apagado):** deploy en Vercel. PWA: `public/manifest.json` + meta en `index.html`.

**Índice:** [docs/FLUJO_JONATHAN.md](docs/FLUJO_JONATHAN.md).

**Android:** no hay carpeta `android/` en este repo.

## Calidad

```bash
npm run lint
npm run test
npm run test:ui
npm run build:check
npm run e2e
npm run quality
```

**Git hooks** (tras `npm install`): pre-commit = lint + test + build:check; pre-push = `quality`.

TypeScript gradual: `layout.ts`, `ScreenShell.tsx`, `services/reviews.ts`; el resto en JS/JSX.

## Main y CI

- Push/PR a `main`: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — `quality` + Playwright E2E.
- `GTP/STATE_OF_APP.txt` se genera en `quality` (no editar a mano).
