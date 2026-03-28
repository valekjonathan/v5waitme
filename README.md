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
npm run test:e2e  # Playwright (Vite en puerto 5174; ver e2e/README.md)
npm run quality   # quality-gate (lint + test + build condicional)
npm run build
```

TypeScript gradual: `layout.ts`, `ScreenShell.tsx`, `services/reviews.ts`; el resto sigue en JS/JSX.

## Main y CI

- Cada **push** o **PR** a `main` ejecuta [`.github/workflows/ci.yml`](.github/workflows/ci.yml): `npm run quality` (incluye regeneración de `GTP/STATE_OF_APP.txt`, lint, tests, Vitest, build si hay secrets) y luego **Playwright E2E**.
- Antes de subir cambios: `npm run quality` en local (equivale al núcleo del hook **pre-commit**). Si pasa, haz **commit** y **push**; revisa que el workflow quede verde en GitHub **Actions**.
- Snapshot automático del repo: `GTP/STATE_OF_APP.txt` (no editar a mano; lo actualiza el quality gate).
