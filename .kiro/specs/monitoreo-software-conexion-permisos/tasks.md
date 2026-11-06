# Implementation Plan: Monitoreo de software — Conexión y permisos

## Overview

Plan de implementación del Incremento 1 (conexión de solo lectura a Softracker, permisos del módulo `MONITOREO_SOFTWARE` y endpoint `GET /monitoreo-software/filtros` con caché mínima). El lenguaje de implementación es **TypeScript** (NestJS), tal como define el diseño.

Cada tarea es un paso de codificación incremental que compila y se prueba antes de avanzar: primero las dependencias y las piezas puras del módulo `softracker-db`, luego el servicio con pool perezoso, después `monitoreo-software` (mapper, servicio con caché, controller), el cableado en `app.module.ts`/`main.ts`, los permisos (constantes, seed, migración), la configuración y su validación, las pruebas E2E y la documentación. Las sub-tareas de prueba se marcan con `*` (opcionales para un MVP); las propiedades de corrección (Property N) se implementan con `fast-check`.

## Tasks

- [x] 1. Agregar `fast-check` a las dependencias de desarrollo
  - En `backend/package.json`, agregar `"fast-check": "3.23.2"` dentro de `devDependencies`, con la versión fijada igual a la ya resuelta en el lockfile (dependencia transitiva de `prisma`).
  - Ejecutar la instalación para refrescar `package-lock.json` sin cambiar la versión resuelta.
  - _Requirements: 6.1, 6.4, 6.7_

- [x] 2. Crear las piezas puras del módulo `softracker-db`
  - [x] 2.1 Crear `softracker-db.constants.ts`
    - Definir el símbolo `SOFTRACKER_POOL_FACTORY`, el tipo `SoftrackerPoolFactory = (config: PoolConfig) => Pool` y la fábrica `crearPoolPg`.
    - Definir `MENSAJE_SOFTRACKER_NO_DISPONIBLE` y `MENSAJE_SOFTRACKER_ERROR_INTERNO`.
    - Implementar `construirConfigPool(connectionString)` con `max: 5`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 5000`, `statement_timeout: 10000`, `application_name: 'gestion-aulas'` y `options: '-c default_transaction_read_only=on'`.
    - _Requirements: 1.2, 1.11_

  - [x] 2.2 Implementar `softracker-db.errors.ts`
    - Definir `CODIGOS_RED_NO_DISPONIBLE`, `SQLSTATE_NO_DISPONIBLE` y `MENSAJES_PG_NO_DISPONIBLE` según las reglas del diseño (red Node, SQLSTATE clase 08, `28P01`, `28000`, `57P01/02/03`, `57014`, mensajes de timeout/conexión terminada).
    - Implementar `esErrorDeDisponibilidad(error)` evaluando recursivamente `cause` y `errors` (AggregateError) hasta profundidad 3; `25006`, `42P01`, `42501` y no-objetos devuelven `false`.
    - Implementar `sanitizarParaLog(error, connectionString)` que arma `"<code> <message>"` y redacta la cadena de conexión, URLs `postgres(ql)://…` y la contraseña de la URL.
    - _Requirements: 1.7, 1.8, 1.11, 1.12_

  - [x]* 2.3 Escribir prueba de propiedad para `esErrorDeDisponibilidad`
    - **Property 1: Clasificación total de errores de Softracker**
    - **Validates: Requirements 1.7, 1.8, 1.11, 1.12**
    - En `softracker-db.errors.spec.ts`, generar códigos dentro/fuera del conjunto, SQLSTATE de 5 caracteres con y sin prefijo `08`, mensajes conocidos rodeados de texto aleatorio, envolturas `cause`/`AggregateError` de profundidad 0–3 y valores no objeto; contrastar con un modelo de referencia (`fc.assert`, `numRuns: 100`).

- [x] 3. Implementar el servicio y el módulo global `softracker-db`
  - [x] 3.1 Crear `monitoreo-software.types.ts` con las filas crudas de Softracker
    - Definir `FilaAula { sala_codigo: string | null }`, `FilaSoftware { id: string; nombre: string; categoria: string | null }` y `FilaCategoria { categoria: string | null }`.
    - Definir `SoftwareFiltro { id; nombre; categoria }` y `RespuestaFiltros { aulas; software; categorias; generadoEn }`.
    - _Requirements: 4.3, 4.5_

  - [x] 3.2 Implementar `softracker-db.service.ts`
    - Clase `SoftrackerDbService` con pool perezoso (`pool: Pool | null`), inyectando `SOFTRACKER_POOL_FACTORY`.
    - `consultar<T>(sql, params = [])`: leer `SOFTRACKER_DATABASE_URL`, lanzar `ServiceUnavailableException` si está ausente/vacía/espacios sin crear el pool; crear el pool con `construirConfigPool` en la primera consulta y registrar `pool.on('error', …)` con log saneado; ejecutar `pool.query<T>(sql, [...params])` y devolver `rows`.
    - En `catch`, loguear con `sanitizarParaLog`, traducir a `ServiceUnavailableException` o `InternalServerErrorException` sin `cause`; relanzar `HttpException` tal cual.
    - `onModuleDestroy`: cerrar el pool con `end()`, capturar y loguear el error sin relanzar, dejar `pool = null`.
    - _Requirements: 1.4, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12_

  - [x] 3.3 Crear `softracker-db.module.ts` global
    - `@Global()` `@Module` que provee `SoftrackerDbService` y `{ provide: SOFTRACKER_POOL_FACTORY, useValue: crearPoolPg }`, y exporta `SoftrackerDbService`.
    - _Requirements: 1.1, 1.3_

  - [x]* 3.4 Escribir prueba de propiedad: traducción de errores sin exponer datos
    - **Property 2: `consultar` traduce errores sin exponer datos sensibles**
    - **Validates: Requirements 1.7, 1.8, 6.4**
    - En `softracker-db.service.spec.ts`, pool simulado cuyo error incrusta la URL/`sql`/`params`; verificar excepción correcta, mensaje fijo y que ninguna línea de log contiene la cadena de conexión (`Logger` espiado).

  - [x]* 3.5 Escribir prueba de propiedad: transporte de sentencia, parámetros y filas
    - **Property 3: `consultar` transporta sentencia, parámetros y filas sin alterarlos**
    - **Validates: Requirements 1.6**
    - `pool.query` invocado una vez con el mismo `sql` y `params` (o `[]` si se omite); resultado igual a las filas devueltas (vacío si no hay filas).

  - [x]* 3.6 Escribir prueba de propiedad: creación única y perezosa del pool
    - **Property 4: El pool se crea una sola vez y solo al consultar**
    - **Validates: Requirements 1.2, 1.4**
    - Para `n ≥ 0` consultas exitosas, la fábrica se invoca `min(n, 1)` veces, siempre con `construirConfigPool(url)`.

  - [x]* 3.7 Escribir prueba de propiedad: sin URL nunca se abre el pool
    - **Property 5: Sin URL configurada nunca se abre el pool**
    - **Validates: Requirements 1.9**
    - Para URL ausente/vacía/espacios y `n ≥ 1` consultas, cada una rechaza con `ServiceUnavailableException` y mensaje fijo; la fábrica se invoca 0 veces.

  - [x]* 3.8 Escribir pruebas de ejemplo del servicio y la configuración del pool
    - `construirConfigPool` devuelve los valores exactos del diseño; se registra el listener `error`; `onModuleDestroy` sin pool no hace nada, con pool llama `end()` y si `end()` rechaza no lanza; `25006` → `InternalServerErrorException`, `timeout exceeded when trying to connect` → `ServiceUnavailableException`.
    - _Requirements: 1.2, 1.10, 1.11, 1.12, 6.4_

- [x] 4. Checkpoint — Asegurar que las pruebas pasan
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implementar el mapper puro de filtros
  - [x] 5.1 Implementar `filtros.mapper.ts`
    - `compararTexto(a, b)` total por unidades de código UTF-16 (`a < b ? -1 : a > b ? 1 : 0`).
    - `construirRespuestaFiltros(filas, generadoEn)`: `aulas`/`categorias` descartan no-string, `null` y `trim()` vacío, deduplican y ordenan con `compararTexto`; `software` descarta filas sin `id`/`nombre` string válido, conserva la primera por `id`, ordena por `nombre` y luego `id`; el objeto tiene exactamente `aulas`, `software`, `categorias`, `generadoEn`.
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.15_

  - [x]* 5.2 Escribir prueba de propiedad: normalización de aulas/categorías y forma de la respuesta
    - **Property 7: Normalización de aulas y categorías y forma de la respuesta**
    - **Validates: Requirements 4.3, 4.4, 4.6, 4.15**
    - En `filtros.mapper.spec.ts`, listas con cadenas, vacías, espacios, `null`, duplicados y listas vacías; verificar claves exactas y orden estrictamente ascendente sin repetidos.

  - [x]* 5.3 Escribir prueba de propiedad: software deduplicado y ordenado
    - **Property 8: Software sin `id` repetido y ordenado por nombre e `id`**
    - **Validates: Requirements 4.5, 4.15**
    - Filas con `id`/`nombre` de alfabetos pequeños; cada `id` válido aparece una vez y cada par consecutivo cumple el orden `(nombre, id)`.

- [x] 6. Implementar el servicio, el controller y el módulo de `monitoreo-software`
  - [x] 6.1 Crear `monitoreo-software.constants.ts`
    - Definir `RELOJ_MONITOREO` (símbolo) y `RelojMonitoreo = () => number`, `TTL_FILTROS_MS = 3_600_000`, `ESTADO_SOFTWARE_ACTIVO = 'ACTIVO'`, `PERMISO_MONITOREO_LEER = 'MONITOREO_SOFTWARE_LEER'`.
    - _Requirements: 4.2, 5.2_

  - [x] 6.2 Implementar `monitoreo-software.service.ts`
    - `MonitoreoSoftwareService` con `cacheFiltros` de una sola entrada y reloj inyectado (`RELOJ_MONITOREO`).
    - `obtenerFiltros()`: devolver la Promise vigente si `expiraEn > ahora`; si no, crear la Promise, guardarla de forma síncrona antes de cualquier `await` con `expiraEn = ahora + TTL_FILTROS_MS`, y en `catch` borrar la entrada solo si la identidad coincide.
    - `consultarFiltros(ahora)`: `generadoEn = new Date(ahora).toISOString()`, tres `consultar` en `Promise.all` con `SQL_AULAS` (`[]`), `SQL_SOFTWARE` (`['ACTIVO']`), `SQL_CATEGORIAS` (`['ACTIVO']`) y `construirRespuestaFiltros`.
    - Definir las constantes SQL parametrizadas que solo nombran `resumen_diario_uso` y `software_catalogo`, sin concatenar valores de la petición.
    - _Requirements: 4.7, 4.8, 4.9, 5.1, 5.2, 5.3, 5.4, 5.7_

  - [x] 6.3 Crear `monitoreo-software.controller.ts`
    - `@Controller('monitoreo-software')` con `@RequireModule(MODULOS.MONITOREO_SOFTWARE)`; `GET filtros` con `@RequirePermissions(PERMISO_MONITOREO_LEER)` que delega en `obtenerFiltros()`.
    - _Requirements: 4.1, 4.2_

  - [x] 6.4 Crear `monitoreo-software.module.ts`
    - `@Module` con el controller, el servicio y `{ provide: RELOJ_MONITOREO, useValue: () => Date.now() }`; no importa `SoftrackerDbModule` (es global).
    - _Requirements: 4.1_

  - [x]* 6.5 Escribir prueba de propiedad: caché secuencial conforme al modelo
    - **Property 9: Caché secuencial de filtros conforme al modelo**
    - **Validates: Requirements 4.7, 4.13, 5.1, 5.2, 5.4, 5.7, 6.5, 6.8**
    - En `monitoreo-software.service.spec.ts`, secuencias de instantes no decrecientes (incluidos `expiraEn` exactos) y resultados por ronda (éxito/fallo de una de tres consultas); verificar número de rondas, 3 `consultar` por ronda, `generadoEn` del instante de la ronda y propagación de error sin respuesta parcial.

  - [x]* 6.6 Escribir prueba de propiedad: solicitudes simultáneas comparten una consulta
    - **Property 10: Solicitudes simultáneas comparten una sola consulta**
    - **Validates: Requirements 5.3, 5.4, 6.7**
    - Para `n ≥ 2` solicitudes antes de terminar la primera ronda: una sola ronda (3 `consultar`), mismo resultado/error, y nueva ronda en la siguiente solicitud tras fallo.

  - [x]* 6.7 Escribir pruebas de ejemplo del servicio de monitoreo
    - Las tres sentencias empiezan por `SELECT`, solo nombran `resumen_diario_uso`/`software_catalogo` y se envían con `[]`, `['ACTIVO']`, `['ACTIVO']`; vistas vacías → listas vacías con `generadoEn`; segunda solicitud vigente reutiliza la respuesta con 3 invocaciones totales.
    - _Requirements: 4.8, 4.9, 4.15, 6.5_

- [x] 7. Cablear los módulos y los hooks de apagado
  - [x] 7.1 Registrar los módulos en `app.module.ts`
    - Importar `SoftrackerDbModule` y `MonitoreoSoftwareModule` al final de `imports`, sin modificar `reportes.controller.ts`.
    - _Requirements: 4.14_

  - [x] 7.2 Habilitar `enableShutdownHooks` en `main.ts`
    - Agregar `app.enableShutdownHooks();` en `bootstrap()` tras `configureApp(app)` para que `onModuleDestroy` cierre el pool con `SIGTERM`/`SIGINT`.
    - _Requirements: 1.10_

- [x] 8. Registrar el módulo y los permisos en Gestión de Aulas
  - [x] 8.1 Agregar `MONITOREO_SOFTWARE` a `MODULOS`
    - En `src/auth/auth.constants.ts`, agregar `MONITOREO_SOFTWARE: 'MONITOREO_SOFTWARE'` al final de `MODULOS` sin tocar las demás entradas ni `MODULOS_CON_LECTURA_AUXILIAR`.
    - _Requirements: 3.1_

  - [x]* 8.2 Escribir prueba del valor de la constante
    - Verificar `MODULOS.MONITOREO_SOFTWARE === 'MONITOREO_SOFTWARE'` en `src/auth/auth.constants.spec.ts` o en una prueba existente.
    - _Requirements: 3.1_

  - [x] 8.3 Actualizar el seed con el módulo y las acciones
    - En `prisma/seed.ts`, agregar `['MONITOREO_SOFTWARE', 'Monitoreo de software']` a `modulos` y `MONITOREO_SOFTWARE: ['LEER', 'EXPORTAR']` a `accionesPorModulo`.
    - _Requirements: 3.2, 3.3_

  - [x] 8.4 Crear la migración idempotente de permisos
    - Crear `prisma/migrations/20261007120000_monitoreo_software_permissions/migration.sql` con los `INSERT … ON CONFLICT` del diseño: módulo (actualiza nombre/activo), dos permisos (actualiza descripción/moduloId) y asignación al rol `ADMINISTRADOR` usando `IN (…)` y `ON CONFLICT DO NOTHING`.
    - _Requirements: 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

- [x] 9. Configurar y validar `SOFTRACKER_DATABASE_URL`
  - [x] 9.1 Documentar la variable en `.env.example` y `docker-compose.yml`
    - Agregar en `backend/.env.example` una línea `SOFTRACKER_DATABASE_URL=postgresql://softracker_readonly:CHANGE_ME@<host>:<puerto>/<base>` y en `docker-compose.yml` la entrada `SOFTRACKER_DATABASE_URL: ${SOFTRACKER_DATABASE_URL}` en el `environment` del servicio `backend`, sin credenciales literales.
    - _Requirements: 2.1, 2.2_

  - [x] 9.2 Exigir la variable en producción en `environment.ts`
    - Agregar `requiredInProduction('SOFTRACKER_DATABASE_URL');` dentro de `validate()`, reutilizando el mensaje existente. (Decisión confirmada: la variable se mantiene obligatoria en producción.)
    - _Requirements: 2.3, 2.4_

  - [x]* 9.3 Agregar los casos de `environment.spec.ts`
    - Agregar `SOFTRACKER_DATABASE_URL` al entorno base y los casos (a) ausente, (b) vacía, (c) válida sin error en producción, (d) `NODE_ENV` distinto de producción sin la variable, más solo espacios en producción.
    - _Requirements: 2.5_

  - [x] 9.4 Extender el preflight con `validarSoftrackerUrl`
    - En `scripts/validate-docker-env.cjs`, agregar `SOFTRACKER_DATABASE_URL` a `required` (mensaje de valor real para ausente/vacía/espacios/`CHANGE_ME` sin distinguir mayúsculas) y una función exportable `validarSoftrackerUrl(valor)` que valide el formato (`new URL`, protocolo `postgresql:`/`postgres:`), acumulando errores; ejecutar la validación solo bajo `require.main === module`.
    - _Requirements: 2.6, 2.7, 2.8, 2.9_

  - [x]* 9.5 Escribir prueba de propiedad del preflight
    - **Property 6: Validación del preflight para `SOFTRACKER_DATABASE_URL`**
    - **Validates: Requirements 2.6, 2.7, 2.8**
    - En `src/config/validate-docker-env.spec.ts` (importando `../../scripts/validate-docker-env.cjs`), generar variantes de `CHANGE_ME` con capitalización aleatoria, cadenas de espacios, protocolos aleatorios, no-URL y URLs `postgres(ql)://` válidas; verificar los arreglos de mensajes exactos.

- [x] 10. Checkpoint — Asegurar que las pruebas pasan
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Pruebas E2E del endpoint de filtros
  - [x]* 11.1 Escribir `backend/test/monitoreo-software.e2e-spec.ts`
    - Montar con `AuthModule`, el controller y el servicio reales, `SoftrackerDbService` simulado y `RELOJ_MONITOREO` fijo; `AUTH_REQUIRED=true`, `PERMISSIONS_MODE=strict`, tokens firmados y `configureApp(app)`; aislar la caché por caso.
    - Cubrir todos los casos de la tabla: autorizado (200 con `aulas`/`software`/`categorias`/`generadoEn`), sin token (401, 0 `consultar`), sin módulo (403, 0 `consultar`), módulo sin `LEER` (403, 0 `consultar`), rechazo seguido de autorizado (3 consultas), Softracker caído (503 con formato de `HttpExceptionFilter`, sin SQL/host).
    - _Requirements: 4.3, 4.10, 4.11, 4.12, 4.13, 5.6, 6.1, 6.2, 6.3, 6.9_

- [x] 12. Actualizar la documentación técnica
  - [x] 12.1 Actualizar `src/MODULES.md`
    - Agregar la fila `monitoreo-software` (ruta `/monitoreo-software`, módulo `MONITOREO_SOFTWARE`, permiso `MONITOREO_SOFTWARE_LEER`, dependencia de Softracker_DB en solo lectura) y la fila `softracker-db` en "Módulos transversales"; agregar la regla arquitectónica de acceso de solo lectura mediante `softracker_readonly`.
    - _Requirements: 6.6_

- [x] 13. Verificación automatizada final
  - [x] 13.1 Ejecutar build, lint y pruebas
    - Ejecutar `npm run build`, `npm run lint`, `npm test` y `npm run test:e2e` en `backend/` y corregir los errores que aparezcan.
    - _Requirements: 2.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.7, 6.8, 6.9_

- [ ] 14. Verificación manual dependiente de infraestructura externa (opcional)
  - [ ]* 14.1 Verificar la migración en una base de prueba
    - Aplicar `prisma migrate deploy` y comprobar con SQL el módulo activo, los dos permisos y las asignaciones al administrador; repetir el SQL para idempotencia, con módulo inactivo/nombre distinto y sin rol `ADMINISTRADOR`.
    - _Requirements: 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

  - [ ]* 14.2 Verificar la conexión real con Softracker
    - Con Softracker disponible, `GET /monitoreo-software/filtros` devuelve datos reales y una sentencia de escritura emitida por `consultar` es rechazada con `25006`; con `NODE_ENV=development` sin la variable, el backend arranca y otra ruta responde normalmente.
    - _Requirements: 1.5, 1.11_

## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido; incluyen pruebas unitarias, de propiedad, E2E y la verificación manual que depende de infraestructura externa (Softracker real y base de prueba de migración).
- Cada tarea referencia los requisitos que cubre para trazabilidad; las pruebas de propiedad referencian además la propiedad del diseño que validan.
- Los checkpoints aseguran validación incremental antes de avanzar a la siguiente fase.
- Las pruebas de propiedad usan `fast-check` con al menos `numRuns: 100` y un comentario `// Feature: monitoreo-software-conexion-permisos, Property {n}: {texto}`.
- Decisión confirmada por el usuario: `SOFTRACKER_DATABASE_URL` se mantiene obligatoria en producción (Req. 2.3 se conserva).

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2.1", "8.1", "9.1"] },
    { "id": 1, "tasks": ["2.2", "3.1", "8.2", "8.3", "8.4", "9.2", "9.4"] },
    { "id": 2, "tasks": ["2.3", "3.2", "5.1", "6.1", "9.3", "9.5"] },
    { "id": 3, "tasks": ["3.3", "3.4", "3.5", "3.6", "3.7", "3.8", "5.2", "5.3", "6.2"] },
    { "id": 4, "tasks": ["6.3", "6.4", "6.5", "6.6", "6.7"] },
    { "id": 5, "tasks": ["7.1", "7.2"] },
    { "id": 6, "tasks": ["11.1", "12.1"] },
    { "id": 7, "tasks": ["13.1"] },
    { "id": 8, "tasks": ["14.1", "14.2"] }
  ]
}
```
