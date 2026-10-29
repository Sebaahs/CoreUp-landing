# Deploy de la landing

La landing se publica en Firebase Hosting, sitio `getcoreup` del proyecto `coreuptoolbox`
y se sirve en el dominio propio https://getcoreup.com
(`getcoreup.web.app` es el alias técnico de Firebase). No hay deploy automático: se publica a mano desde `master`.

## Requisitos (una sola vez)

- Acceso al proyecto Firebase `coreuptoolbox`.
- Sesión iniciada en Firebase CLI: `npx -y firebase-tools@14 login`.

## Publicar

```bash
git checkout master && git pull
npm ci
npm run deploy
```

`npm run deploy` hace el build (`dist/`) y lo sube al sitio `getcoreup` (ver `firebase.json`).

Para verificar, abrí https://getcoreup.com (recargá sin caché si no ves el cambio).

## Variables del formulario de prueba gratis

Home y `/operacional` tienen el registro "Probá CoreUp gratis 14 días" (`partials/registro.html` +
`src/registro.js`), que llama a `POST /public/signup` del backend. `/flota` sigue con la demo.
Las variables son de build (Vite las incrusta en el JS al hacer `npm run build`), así que tienen
que estar definidas **antes** del `npm run deploy`. Son públicas: no van secretos.

| Variable | Qué es | Local | Producción |
|---|---|---|---|
| `VITE_API_URL` | Backend, sin barra final | `http://localhost:3000` | URL de `toolbox-wrapper` (prod) |
| `VITE_TURNSTILE_SITE_KEY` | Site key de Cloudflare Turnstile | `1x00000000000000000000AA` (prueba) | Site key real del widget de `getcoreup.com` |
| `VITE_TERMS_VERSION` | Versión de Términos aceptada | `2026-10-borrador` | La misma que `TERMS_VERSION` del backend |
| `VITE_TOOLBOX_URL` | Toolbox, para "Iniciá sesión" | `http://localhost:8080` | `https://coreuptoolbox.web.app` (default) |

- Para producción, crear `.env.production.local` (está en `.gitignore`) con los valores de la tabla
  antes de `npm run deploy`. Si falta `VITE_API_URL`, el build avisa y el formulario muestra
  "No pudimos conectarnos". Ojo: Vite también carga `.env.local` en el build; si en la máquina del deploy
  hay uno con valores de local, `.env.production.local` tiene que pisar las cuatro variables.
- **El origen de la landing tiene que estar en `ALLOWED_ORIGINS` del backend** (`https://getcoreup.com`,
  y `https://getcoreup.web.app` si se usa el alias). Sin eso el navegador bloquea la llamada por CORS y
  el usuario ve el mensaje de red caída. En local: `http://localhost:5173`.
- `VITE_TERMS_VERSION` distinta de `TERMS_VERSION` del back → todas las altas dan `VAL-400`.
- La secret key de Turnstile (`TURNSTILE_SECRET`) va solo en el backend.
- `/terminos/` todavía no existe: hay que publicarla antes de abrir el registro en prod.

### Probar en local

Sin backend, con el mock (responde según el email: `dup` → 409, `val` → 400, `rate` → 429,
`caida` → corta la conexión, `lento` → 201 con 3 s de demora, cualquier otro → 201):

```bash
cp .env.example .env.local
npm run mock      # http://localhost:3000
npm run dev       # http://localhost:5173
```

Contra el backend real en local: levantar ToolboxBackend con `ALLOWED_ORIGINS` que incluya
`http://localhost:5173`, `TURNSTILE_BYPASS=true` (o la secret de prueba de Cloudflare
`1x0000000000000000000000000000000AA`), `TERMS_VERSION=2026-10-borrador` y `MAIL_PROVIDER=log`, y
apuntar `VITE_API_URL` a su puerto. El 201 redirige a `urlIngreso` (`APP_URL/?ingreso=…`), que es
Toolbox en dev.

## Volver a la versión anterior

Firebase Console → Hosting → sitio `getcoreup` → historial de versiones → "Revertir".
