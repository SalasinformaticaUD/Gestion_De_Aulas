<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Autenticación básica

La API autentica contra el modelo `Usuario` de Prisma. Las contraseñas nuevas deben
guardarse con `PasswordHashService`, que utiliza `bcrypt`; nunca se admite texto plano.

- `POST /auth/login`: recibe `identificador` (usuario o correo) y `password`.
- `GET /auth/me`: requiere `Authorization: Bearer <token>` y devuelve el usuario actual,
  sus roles, permisos y módulos habilitados sin exponer `passwordHash`.

El logout es local: el frontend debe borrar el token almacenado. No se conserva una
lista de revocación durante el MVP.

Variables de entorno:

- `JWT_SECRET`: secreto de firma HS256 obligatorio en producción. `AUTH_TOKEN_SECRET`
  se acepta únicamente como nombre heredado durante la transición.
- `JWT_EXPIRES_IN`: duración del token; por defecto `8h`.
- `AUTH_REQUIRED`: `true` obliga autenticación global; fuera de producción inicia en
  `false` para facilitar la integración progresiva.
- `PERMISSIONS_MODE`: `permissive` durante integración o `strict` para exigir los
  módulos asignados mediante roles y permisos.

## Configuración y base de datos

Copie `.env.example` como `.env` y defina al menos `DATABASE_URL`, `PORT`,
`FRONTEND_URL`, `NODE_ENV`, `JWT_SECRET` y `JWT_EXPIRES_IN`. En producción la
aplicación valida `DATABASE_URL`, `FRONTEND_URL` y `JWT_SECRET` al iniciar.

Las rutas actuales se conservan sin prefijo `/api` para mantener compatibilidad. CORS
solo acepta los orígenes indicados en `FRONTEND_URL` (separados por coma) y
`GET /health` responde `{ "status": "ok" }`.

```bash
# generar el cliente y aplicar migraciones
npm run prisma:generate
npm run prisma:migrate

# cargar los catálogos idempotentes: dependencias, módulos y permisos
npm run prisma:seed

# despliegue y exploración de una base ya existente
npm run prisma:deploy
npm run prisma:studio
```

El seed registra las dependencias iniciales, los 15 módulos funcionales, el módulo de
integración `MONITORES`, sus permisos y el usuario `admin` con rol `ADMINISTRADOR`.
Debe definir `ADMIN_INITIAL_PASSWORD` antes de ejecutarlo. Los permisos incluyen
`LEER`, `CREAR`, `ACTUALIZAR`, `ELIMINAR`, `APROBAR` y `EXPORTAR` por módulo.

Prisma 7 usa el generador `prisma-client` con salida local en `generated/prisma`.
Se conserva esta configuración porque coincide con el adaptador PostgreSQL actual y
evita cambiar las migraciones ya creadas.

La guía operativa para una instalación nueva, migraciones y creación del administrador
inicial está en [docs/operacion-backend.md](docs/operacion-backend.md).

## Integración con Monitores

Monitores usa el mismo secreto `JWT_SECRET` bajo el nombre
`PLATFORM_JWT_SECRET` para validar los JWT HS256 emitidos por Aulas. Configure además
`MONITORES_API_URL`, `MONITORES_API_TIMEOUT_MS` y `MONITORES_SERVICE_TOKEN`.

El endpoint interno `POST /integraciones/monitores/usuarios` solo acepta el header
`X-Monitores-Service-Token`. Lo consume el backend de Monitores para aprovisionar una
identidad central; no debe llamarse desde el frontend.

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
