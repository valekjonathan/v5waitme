# v5waitme

WaitMe v5 — React 19 + Vite 8. Contrato de layout: `src/ui/layout/layout.ts`, shell único: `ScreenShell.tsx`.

## Desarrollo

```bash
npm install
npm run dev
```

Abre `http://localhost:5173` en el navegador.

## Calidad

```bash
npm run lint      # eslint + tsc --noEmit
npm run test      # node:test
npm run test:ui   # Vitest
npm run e2e       # Playwright E2E (alias de test:e2e; Vite en 5174 — ver e2e/README.md)
npm run quality   # gate completo: STATE_OF_APP, lint, test, test:ui, vite build
```

**Pre-commit** (rápido): solo `lint` + `test` (sin E2E ni Vitest; el CI ejecuta `quality` completo).

TypeScript gradual: `layout.ts`, `ScreenShell.tsx`, `services/reviews.ts`; el resto sigue en JS/JSX.

## Main y CI

- Cada **push** o **PR** a `main` ejecuta [`.github/workflows/ci.yml`](.github/workflows/ci.yml): `npm run quality` (STATE_OF_APP, lint, tests, Vitest, **build** siempre) y luego **Playwright E2E**.
- Antes de integrar: ejecuta `npm run quality` localmente para igualar CI; el hook **pre-commit** solo valida lo básico (lint + test).
- Snapshot del repo: `GTP/STATE_OF_APP.txt` (generado por el quality gate; no editar a mano).
