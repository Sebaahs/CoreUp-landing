# Deploy de la landing

La landing se publica en Firebase Hosting, sitio `getcoreup` del proyecto `coreuptoolbox`
(https://getcoreup.web.app). No hay deploy automático: se publica a mano desde `master`.

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

## Volver a la versión anterior

Firebase Console → Hosting → sitio `getcoreup` → historial de versiones → "Revertir".
