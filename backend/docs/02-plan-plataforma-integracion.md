# Plan de implementacion backend - Plataforma e integracion

Fecha base: 19/08/2026

Este plan corresponde al frente de Plataforma e integracion definido para 1 persona. Su responsabilidad es dejar el backend profesionalmente preparado para que los demas frentes implementen sin romper contratos: configuracion NestJS, Prisma compartido, autenticacion, usuarios, roles, permisos, dependencias, auditoria, convenciones de API e integracion futura con Gestion de Monitores.

Este frente debe avanzar primero porque desbloquea al Core operativo y a los Modulos paralelos.

---

## 0. Reglas del frente

- [ ] No cambiar rutas funcionales existentes sin documentarlo y coordinarlo.
- [ ] No conectar directamente a la base de datos de Gestion de Monitores.
- [ ] No almacenar datos propios de Monitores dentro de esta base, salvo identificadores externos necesarios para integracion por API.
- [ ] Proteger credenciales, tokens y secretos desde el inicio.
- [ ] Cada cambio transversal debe incluir una prueba smoke o e2e minima.
- [ ] Todo contrato comun debe quedar documentado en `backend/docs` o `backend/src/MODULES.md`.
- [ ] Cerrar cada fase con `npm test -- --runInBand` y `npx tsc --noEmit --incremental false`.

---

## 1. Semana 1 - Infraestructura base de NestJS

Objetivo: convertir la app Nest en una API consistente y lista para crecimiento.

### 1.1 Configuracion de entorno

- [ ] Instalar y configurar `@nestjs/config`.
- [ ] Crear `.env.example` en `backend`.
- [ ] Definir variables minimas:
  - `DATABASE_URL`
  - `PORT`
  - `JWT_SECRET`
  - `JWT_EXPIRES_IN`
  - `FRONTEND_URL`
  - `NODE_ENV`
  - `MONITORES_API_URL` si aplica para integracion futura
- [ ] Validar variables con un helper propio o libreria aprobada por el equipo.
- [ ] Garantizar que `.env` no se versiona.

### 1.2 Bootstrap de API

- [ ] Configurar `app.setGlobalPrefix('api')` o decidir explicitamente mantener rutas sin prefijo.
- [ ] Habilitar CORS restringido a `FRONTEND_URL`.
- [ ] Registrar `ValidationPipe` global:
  - `whitelist: true`
  - `transform: true`
  - `forbidNonWhitelisted: true` si no rompe integracion inicial
- [ ] Crear filtro global de excepciones con respuesta uniforme.
- [ ] Definir formato de exito recomendado: objeto directo o `{ data }`, pero uno solo para todo el backend.
- [ ] Crear endpoint `GET /health` o `GET /api/health`.

### 1.3 Pruebas

- [ ] Ajustar e2e actual para health y 404 raiz segun la decision de prefijo.
- [ ] Verificar arranque con `npm run start:dev`.
- [ ] Verificar tipos con `npx tsc --noEmit --incremental false`.

Criterio de cierre: cualquier modulo nuevo hereda validacion, CORS, errores y configuracion.

---

## 2. Semana 1 - PrismaModule y PrismaService

Objetivo: centralizar el acceso a base de datos y evitar que cada modulo invente su conexion.

### 2.1 Crear modulo compartido

- [ ] Crear `backend/src/prisma/prisma.module.ts`.
- [ ] Crear `backend/src/prisma/prisma.service.ts`.
- [ ] Extender `PrismaClient` desde el cliente generado por Prisma.
- [ ] Implementar `onModuleInit` para conectar.
- [ ] Implementar `enableShutdownHooks` o manejo equivalente para cierre ordenado.
- [ ] Exportar `PrismaService` desde `PrismaModule`.
- [ ] Importar `PrismaModule` en `AppModule` o marcarlo como global.

### 2.2 Ajustar Prisma 7

- [ ] Confirmar que `prisma/schema.prisma` genera cliente en `generated/prisma`.
- [ ] Confirmar ruta real de import para el `PrismaClient`.
- [ ] Si se prefiere convencion mas comun, evaluar cambiar generator a `prisma-client-js` y documentarlo antes de tocar migraciones.
- [ ] Verificar que `prisma.config.ts` toma `DATABASE_URL`.

### 2.3 Scripts y flujo de base de datos

- [ ] Agregar scripts al `package.json` si faltan:
  - `prisma:generate`
  - `prisma:migrate`
  - `prisma:deploy`
  - `prisma:studio`
- [ ] Documentar comandos para desarrollo local.
- [ ] Crear seed inicial cuando auth y permisos esten listos.

### 2.4 Pruebas

- [ ] Test unitario simple de `PrismaService` con mock si no hay DB.
- [ ] Smoke test que arranque `AppModule` con `PrismaModule`.
- [ ] Validar que los servicios funcionales puedan inyectarlo sin ciclos.

Criterio de cierre: Core y Paralelos pueden reemplazar stubs por consultas reales.

---

## 3. Semana 1 - Contratos comunes de API

Objetivo: evitar incompatibilidades entre equipos.

### 3.1 Convenciones

- [ ] Definir si la API usa prefijo `/api`.
- [ ] Definir plural/singular de rutas. Recomendacion: conservar rutas actuales y no renombrar durante MVP salvo errores claros.
- [ ] Definir paginacion comun:
  - `page`
  - `limit`
  - `total`
  - `items`
- [ ] Definir filtros por query string.
- [ ] Definir formato de fechas en ISO 8601.
- [ ] Definir uso de UUID como string.

### 3.2 Errores

- [ ] 400 para validacion.
- [ ] 401 para no autenticado.
- [ ] 403 para sin permiso.
- [ ] 404 para recurso inexistente.
- [ ] 409 para conflicto de negocio, por ejemplo horario cruzado.
- [ ] 500 para error inesperado sin filtrar secretos.

### 3.3 Documentacion

- [ ] Crear tabla de endpoints por modulo.
- [ ] Incluir permisos requeridos por endpoint.
- [ ] Incluir ejemplo de request/response para los endpoints consumidos por frontend.
- [ ] Mantener `backend/src/MODULES.md` como mapa tecnico y `backend/docs` como plan/contratos.

Criterio de cierre: frontend puede conectar sin depender de leer servicios internos.

---

## 4. Semana 1 y 2 - Usuarios, dependencias, roles y permisos

Objetivo: implementar los modulos transversales antes de proteger operaciones.

### 4.1 Dependencias

- [ ] Completar DTOs de `dependencias`.
- [ ] Implementar CRUD real con Prisma.
- [ ] Evitar borrar dependencias con usuarios asociados.
- [ ] Seed inicial:
  - Aulas de Software
  - Electrica y Electronica
  - Fisica

### 4.2 Modulos y permisos

- [ ] Crear seed de `Modulo` con los modulos del documento:
  - dashboard
  - horarios
  - aulas
  - disponibilidad
  - practicas-libres
  - prestamos-docentes
  - audiovisuales
  - software
  - observaciones
  - limpieza
  - tareas
  - multas
  - credenciales
  - reportes
  - administracion
- [ ] Crear permisos por accion minima: leer, crear, actualizar, eliminar, aprobar, exportar.
- [ ] Implementar `permisos` con consultas por modulo.
- [ ] Implementar `roles` con asignacion de permisos.

### 4.3 Usuarios

- [ ] Completar DTOs de `usuarios`.
- [ ] Implementar crear usuario con password hasheada.
- [ ] Implementar listado con filtros por estado, dependencia y rol.
- [ ] Implementar desactivacion, no borrado fisico.
- [ ] Implementar asignacion de roles.
- [ ] Evitar devolver `passwordHash` en respuestas.

### 4.4 Pruebas

- [ ] Unit tests de usuarios sin exponer password.
- [ ] E2E de crear dependencia, rol, permiso y usuario.
- [ ] E2E de desactivar usuario.

Criterio de cierre: existe administracion basica para autenticar y autorizar.

---

## 5. Semana 1 y 2 - Autenticacion centralizada

Objetivo: reemplazar el login simulado del frontend por auth real.

### 5.1 Dependencias

- [ ] Instalar `@nestjs/jwt`.
- [ ] Instalar libreria de hash aprobada, por ejemplo `bcryptjs`.
- [ ] Definir si se usara Passport o guard JWT propio simple.

### 5.2 DTOs

- [ ] `LoginDto`: usuario/correo y contrasena.
- [ ] `AuthResponseDto` o mapper: token, usuario, permisos, aplicaciones habilitadas.
- [ ] No devolver hash ni datos sensibles.

### 5.3 Servicio

- [ ] Buscar usuario por `nombreUsuario` o `correo`.
- [ ] Validar estado `ACTIVA`.
- [ ] Comparar contrasena hasheada.
- [ ] Firmar JWT con `sub`, `nombreUsuario`, `dependenciaId`, roles y permisos resumidos.
- [ ] Devolver permisos por modulo para Gestion de Aulas.
- [ ] Preparar respuesta para selector de aplicativos:
  - puedeAccederAulas
  - puedeAccederMonitores
  - urlMonitores si aplica

### 5.4 Guards y decoradores

- [ ] Crear `JwtAuthGuard`.
- [ ] Crear `CurrentUser` decorator.
- [ ] Crear `PermissionsGuard`.
- [ ] Crear `RequirePermissions` decorator.
- [ ] Permitir modo temporal sin permisos solo durante integracion inicial si el equipo lo necesita, pero documentarlo.

### 5.5 Endpoints

- [ ] `POST /auth/login`
- [ ] `GET /auth/me`
- [ ] `POST /auth/logout` si se decide manejar lista de revocacion; si no, documentar logout frontend.

### 5.6 Pruebas

- [ ] Unit tests de login exitoso.
- [ ] Unit tests de password invalida.
- [ ] E2E de ruta protegida con y sin token.

Criterio de cierre: frontend puede reemplazar `saveDemoSession` por token real.

---

## 6. Semana 2 - Auditoria transversal

Objetivo: registrar operaciones criticas sin duplicar codigo en cada modulo.

### 6.1 Alcance MVP

- [ ] Registrar cambios en usuarios, roles, permisos, aulas, horarios, prestamos, credenciales y multas.
- [ ] Guardar usuarioId, entidad, entidadId, accion, datosPrevios y datosNuevos.
- [ ] No registrar secretos en texto plano.

### 6.2 Implementacion

- [ ] Completar `AuditoriaService`.
- [ ] Crear metodo `registrar`.
- [ ] Crear helper para sanitizar campos sensibles.
- [ ] Definir acciones estandar: CREATE, UPDATE, DELETE, DISABLE, APPROVE, CANCEL, LOGIN.
- [ ] Integrar manualmente en servicios criticos durante MVP.

### 6.3 Endpoints

- [ ] `GET /auditoria?entidad=&entidadId=&usuarioId=&desde=&hasta=`
- [ ] Proteger solo para administradores.

### 6.4 Pruebas

- [ ] Unit test de sanitizacion.
- [ ] Unit test de registro.
- [ ] E2E de consulta protegida.

Criterio de cierre: operaciones criticas quedan trazables para la prueba piloto.

---

## 7. Semana 7 - Integracion con Gestion de Monitores

Objetivo: preparar comunicacion por API sin mezclar bases de datos.

### 7.1 Principios

- [ ] Gestion de Aulas autentica y autoriza.
- [ ] Gestion de Monitores conserva su propia API y base.
- [ ] La comunicacion se hace por HTTP/API.
- [ ] No crear migraciones para tablas internas de Monitores en este backend.
- [ ] Usar identificadores externos cuando se necesite relacion logica.

### 7.2 Cliente HTTP

- [ ] Crear modulo `integraciones`.
- [ ] Crear `MonitoresClientService`.
- [ ] Leer `MONITORES_API_URL` desde config.
- [ ] Definir timeouts y manejo de errores.
- [ ] Crear DTOs de respuesta esperada, no usar `any`.

### 7.3 Endpoints puente

- [ ] `GET /integraciones/monitores/estado`
- [ ] `GET /integraciones/monitores/usuario/:usuarioExternoId` si se requiere.
- [ ] Evitar endpoints que repliquen toda la API de Monitores sin necesidad.

### 7.4 Pruebas

- [ ] Unit tests con HTTP mockeado.
- [ ] E2E de estado con servicio mock si no existe API real disponible.

Criterio de cierre: el selector de aplicativos puede validar acceso sin acoplar bases.

---

## 8. Semana 8 - Integracion general y endurecimiento

Objetivo: preparar una version interna utilizable.

### 8.1 Checklist tecnico

- [ ] Todos los modulos funcionales importan `PrismaModule` correctamente.
- [ ] No quedan servicios productivos con respuestas `This action...`.
- [ ] No quedan DTOs vacios en modulos marcados como implementados.
- [ ] Todas las rutas protegidas tienen guard.
- [ ] CORS permite el frontend local.
- [ ] Health endpoint responde.
- [ ] Migraciones corren desde cero.
- [ ] Seeds minimos crean permisos, roles y usuario administrador inicial.

### 8.2 Checklist de pruebas

- [ ] `npm test -- --runInBand`.
- [ ] `npm run test:e2e`.
- [ ] `npx tsc --noEmit --incremental false`.
- [ ] Smoke manual:
  - login;
  - crear aula;
  - crear horario;
  - consultar disponibilidad;
  - crear prestamo;
  - consultar panel.

### 8.3 Documentacion

- [ ] Actualizar README del backend.
- [ ] Documentar variables de entorno.
- [ ] Documentar flujo de migraciones.
- [ ] Documentar usuario admin inicial.
- [ ] Documentar contratos minimos para frontend.

Criterio de cierre: los otros frentes pueden integrar sin depender de conocimiento informal.

---

## 9. Orden recomendado de entrega

1. Configuracion global y health.
2. PrismaModule y PrismaService.
3. Convenciones de errores, DTOs y pipes.
4. Dependencias, modulos, permisos y roles.
5. Usuarios.
6. Auth y guards.
7. Auditoria.
8. Cliente de integracion con Monitores.
9. Seeds, documentacion y pruebas generales.

Este orden reduce riesgo porque primero entrega las bases compartidas y despues habilita seguridad e integraciones.
