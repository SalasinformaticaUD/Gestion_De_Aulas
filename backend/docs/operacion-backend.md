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
`npx tsc --noEmit --incremental false`. Con el servicio iniciado, consulte
`GET /health` y pruebe el inicio de sesión con el administrador inicial.
