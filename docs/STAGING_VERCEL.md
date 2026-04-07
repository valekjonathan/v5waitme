# Staging remoto (Vercel): fuera de casa, sin Mac

**Estado honesto:** el staging **no existe** hasta que haya un **Preview Deployment** de la rama **`staging`** visible en **tu** proyecto Vercel. El repo no incluye esa URL (depende de tu cuenta y del primer deploy).

**Si aún no has hecho los pasos de abajo:** fuera de casa usa la **web de producción** (y TestFlight para nativo). La **IP LAN** no sirve fuera de tu Wi‑Fi.

Esta guía cierra el modo **B** del [FLUJO_JONATHAN.md](./FLUJO_JONATHAN.md). No añade `server.url` al nativo: el iPhone fuera de casa usa **TestFlight** o la **web** en Safari.

## Qué obtienes

- URL **HTTPS** pública (mismo build que producción: `vite build`, `import.meta.env.PROD`).
- OAuth web en staging usa `window.location.origin` → debe coincidir con la URL que abras y con lo permitido en Supabase.

## Prerrequisito

El repo ya tiene proyecto Vercel enlazado (`.vercel/project.json`). En [vercel.com](https://vercel.com) el proyecto **debe** tener **Git** conectado al mismo repositorio que empujas a GitHub/GitLab.

## Pasos (una vez)

### 1. Rama `staging`

En tu máquina (cuando quieras activar staging remoto):

```bash
git checkout main
git pull
git checkout -b staging
git push -u origin staging
```

Si la rama ya existe, solo `git push origin staging` tras tus commits.

### 2. URL que usarás fuera de casa

1. Vercel → proyecto **v5waitme** (o el nombre que tengas) → **Deployments**.
2. Abre el deployment asociado a la rama **`staging`** (tipo **Preview**).
3. Pulsa **Visit** / copia el dominio `https://…vercel.app` (o el dominio custom si añadiste uno solo para previews de `staging`).

**Esa** es la URL de referencia profesional para “fuera de casa”.  
No está fijada en el repo porque Vercel la muestra **solo** en tu cuenta (equipo, nombre de rama y slug pueden variar).

> **URL estable:** suele repetirse entre deploys de la misma rama (mismo host, contenido actualizado). Si quieres un nombre fijo tipo `staging.tudominio.com`, en Vercel → **Domains** asigna el dominio al proyecto y configura que apunte al entorno/rama **Preview** de `staging` (documentación de Vercel: _Assigning a Domain to a Git Branch_).

### 3. Variables de entorno en Vercel

- **Production** (rama `main` / producción): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_MAPBOX_ACCESS_TOKEN`, etc.
- **Preview** (rama `staging`): mismas claves o un Supabase de staging; lo importante es que el build de Preview tenga valores válidos para que la app no quede en blanco.

En **Settings → Environment Variables**, asigna cada variable a **Production**, **Preview** o ambas según necesites.

### 4. Supabase (obligatorio para OAuth)

**Authentication → URL Configuration**

- **Site URL:** para pruebas en staging puedes poner temporalmente la URL de staging, o mantener producción y confiar en redirect URLs (según cómo uses el login). Lo mínimo es que **Redirect URLs** incluya explícitamente:

| Entorno        | Qué añadir en **Redirect URLs**                        |
| -------------- | ------------------------------------------------------ |
| Nativo         | `capacitor://localhost`                                |
| Web en casa    | `http://<TU_IP_LAN>:5173`                              |
| Web staging    | `https://<exactamente-tu-url-staging>` (la del paso 2) |
| Web producción | `https://<tu-dominio-production>`                      |

Sin la línea de **staging**, el login Google en la URL de Vercel staging fallará.

## Qué no hace este flujo

- No sustituye **TestFlight** para validar plugins nativos, GPS, etc.
- No escribe `WAITME_CAP_DEV_SERVER_URL` (eso es solo **en casa** con `npm run dev:ios`).

## Si no ves deploy al empujar `staging`

- Comprueba en Vercel → Settings → Git que el repositorio y las ramas están bien enlazados.
- Revisa que el deploy no esté filtrado por _Ignored Build Step_.
