# Operación del backend

## Instalación nueva

1. Copie `.env.example` a `.env` y complete `DATABASE_URL`, `FRONTEND_URL`,
   `JWT_SECRET`, `MONITORES_SERVICE_TOKEN` y `ADMIN_INITIAL_PASSWORD`.
2. Instale dependencias con `npm install`.
3. Genere el cliente de Prisma: `npm run prisma:generate`.
4. Aplique todas las migraciones existentes: `npm run prisma:deploy`.
5. Cargue los catálogos y el administrador: `npm run prisma:seed`.

En desarrollo, `npm run prisma:migrate` crea una nueva migración a partir de cambios
intencionales del esquema. Esa migración debe revisarse y versionarse. En producción
solo se usa `npm run prisma:deploy`; nunca `prisma migrate dev`.

## Administrador inicial

El seed crea o actualiza el usuario `admin`, con el rol `ADMINISTRADOR`, todos los
permisos de los módulos y la contraseña definida en `ADMIN_INITIAL_PASSWORD`.
No se debe publicar ese valor ni conservarlo en el repositorio. Tras el primer acceso,
asigne usuarios y roles propios de cada dependencia.

## Verificación mínima

Ejecute `npm test -- --runInBand`, `npm run test:e2e` y
`npx tsc -p tsconfig.build.json --noEmit --incremental false`. Con el servicio iniciado, consulte
`GET /health` y pruebe el inicio de sesión con el administrador inicial.

## Instalación completa con contenedores

Desde la carpeta `backend`, complete en el mismo archivo `.env` las variables de
Docker Compose (`POSTGRES_PASSWORD`, `FRONTEND_PUBLIC_URL`,
`MONITORES_DOCKER_API_URL` y los secretos) y ejecute:

```bash
npm run deploy:preflight
docker compose config
docker compose build
docker compose up -d
docker compose ps
```

El Compose construye imágenes independientes para `backend`, `frontend` y
`pdf-renderer`, además de la imagen de inicialización `migration`; PostgreSQL utiliza
la imagen oficial 16 Alpine. Los servicios comparten la red interna
`aulas_internal`, donde el frontend resuelve la API como `backend` y la API resuelve
el renderizador como `pdf-renderer`. Los healthchecks y dependencias condicionadas
por salud hacen que el frontend espere a la API, y la API a PostgreSQL, las
migraciones y el renderizador.

Por defecto, la API y PostgreSQL se publican solo en `127.0.0.1`; el frontend se
publica en todas las interfaces por el puerto `FRONTEND_HOST_PORT`. Para exponerlos
en una red de staging, ajuste explícitamente `BACKEND_BIND_ADDRESS` o
`FRONTEND_BIND_ADDRESS` en `.env`. `AULAS_API_INTERNAL_URL` debe conservar
`http://backend:3000`, porque es la URL que emplea el proxy interno de Next.js.

Use `RUN_DATABASE_SEED=true` únicamente durante la primera instalación. Luego
cámbielo a `false`: el seed actualiza la contraseña de `admin`, mientras que las
migraciones (`prisma migrate deploy`) deben continuar en cada arranque.

La API de Gestión de Monitores pertenece a otro repositorio y no puede construirse
desde este Compose. Configure `MONITORES_DOCKER_API_URL` con una dirección alcanzable
desde Docker. `host.docker.internal` sirve para una instancia que corre en el mismo host.
