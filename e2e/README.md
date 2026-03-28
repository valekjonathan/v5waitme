# E2E (Playwright)

- **`npm run test:e2e`** ejecuta `playwright test` (specs en esta carpeta).
- Primera vez en la máquina: `npx playwright install chromium` (CI instala vía workflow).
- Playwright levanta Vite en **puerto 5174** (no compite con `npm run dev` en 5173). Headless por defecto; **no** abre Safari.
