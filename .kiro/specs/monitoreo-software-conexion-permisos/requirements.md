# Requirements Document
## Introduction
Este documento cubre el **Incremento 1 — Conexión y permisos** del plan `PLAN_MODULO_MONITOREO_SOFTWARE.md`. El objetivo es que el backend NestJS de Gestión de Aulas pueda leer, en solo lectura, la base de datos de Softracker, registrar el módulo `MONITOREO_SOFTWARE` con sus permisos y exponer el endpoint `GET /monitoreo-software/filtros`, que devuelve las aulas, el software y las categorías disponibles para filtrar.

Quedan fuera de este incremento: `/consulta`, `/sesiones`, la exportación CSV y Excel, el servicio de caché completo (`MonitoreoSoftwareCacheService`) y el frontend. Para `/filtros` se incluye solo una caché en memoria mínima con TTL de 1 hora, siguiendo el patrón de `panel-operativo.service.ts`; el servicio de caché general se construirá en el Incremento 2.

Las vistas de Softracker consultadas son las definidas en `Softracker/PLAN_FILTRO_SOFTWARE_ACADEMICO.md`:

- `software_catalogo (id, nombre, categoria, estado, version_catalogo, actualizado_en)`;
- `resumen_diario_uso (fecha, sala_codigo, software_id, nombre, categoria, sesiones, minutos, equipos_distintos)`;
- `vista_uso_software (id, sala_codigo, hostname, software_id, software, categoria, inicio, fin, minutos, capturas, memoria_promedio_mb)`.

## Glossary
- **Backend**: aplicación NestJS de Gestión de Aulas ubicada en `backend/`.
- **Softracker_DB**: base de datos PostgreSQL de Softracker, accedida exclusivamente con el rol `softracker_readonly`.
- **Softracker_Db_Module**: módulo NestJS global ubicado en `backend/src/softracker-db/` que provee el Softracker_Db_Service.
- **Softracker_Db_Service**: servicio que administra el pool de conexiones `pg.Pool` hacia Softracker_DB y expone el método `consultar<T>(sql, params)`.
- **Pool**: instancia de `pg.Pool` creada por el Softracker_Db_Service.
- **Error_De_Disponibilidad**: error de conexión rechazada, host inalcanzable, autenticación fallida, tiempo de conexión agotado, tiempo agotado al esperar una conexión libre del Pool o cancelación por `statement_timeout` al consultar Softracker_DB.
- **Monitoreo_Controller**: controlador `MonitoreoSoftwareController` con prefijo de ruta `/monitoreo-software`, independiente de `reportes.controller.ts`.
- **Monitoreo_Service**: servicio `MonitoreoSoftwareService` que construye las consultas del módulo.
- **Endpoint_Filtros**: ruta `GET /monitoreo-software/filtros`.
- **Respuesta_Filtros**: objeto JSON con las listas `aulas`, `software` y `categorias`, y el campo `generadoEn`.
- **Cache_Filtros**: caché en memoria del Monitoreo_Service para la Respuesta_Filtros, con TTL de 1 hora.
- **Environment**: objeto `environment` de `backend/src/config/environment.ts`, cuyo método `validate()` verifica la configuración al arranque.
- **Preflight**: script `backend/scripts/validate-docker-env.cjs`, ejecutado por `npm run deploy:preflight`.
- **Seed**: script `backend/prisma/seed.ts`.
- **Migracion_Permisos**: migración Prisma de datos que registra el módulo y sus permisos en la base de Gestión de Aulas.
- **Guards_Globales**: guards de autenticación, módulo y permisos registrados globalmente en el Backend y activados con `@RequireModule` y `@RequirePermissions`.
- **Usuario_Autorizado**: usuario autenticado con acceso al módulo `MONITOREO_SOFTWARE` y el permiso `MONITOREO_SOFTWARE_LEER`.

## Requirements
### Requirement 1: Conexión de solo lectura con Softracker

**User Story:** Como desarrollador del Backend, quiero una conexión independiente y de solo lectura con Softracker_DB, para consultar el uso de software sin afectar la base de Gestión de Aulas.

#### Acceptance Criteria
1. THE Softracker_Db_Module SHALL registrarse como módulo global y exportar el Softracker_Db_Service, de modo que cualquier módulo del Backend pueda inyectar el Softracker_Db_Service sin importar explícitamente el Softracker_Db_Module.
2. THE Softracker_Db_Service SHALL crear el Pool con la cadena de conexión de la variable `SOFTRACKER_DATABASE_URL`, `max: 5`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 5000`, `statement_timeout: 10000` y `application_name: 'gestion-aulas'`.
3. THE Softracker_Db_Service SHALL usar un Pool distinto del `PrismaService`, de modo que ninguna consulta emitida mediante `consultar` se ejecute sobre la base de Gestión de Aulas y ningún fallo de Softracker_DB altere el estado de las conexiones del `PrismaService`.
4. WHEN el Backend arranca, THE Softracker_Db_Service SHALL completar la inicialización con 0 conexiones abiertas hacia Softracker_DB y abrir la primera conexión únicamente al procesar la primera invocación de `consultar`.
5. IF Softracker_DB no está disponible o la variable `SOFTRACKER_DATABASE_URL` está vacía o ausente durante el arranque, THEN THE Backend SHALL completar el arranque sin lanzar excepciones y atender las rutas de los demás módulos con el mismo comportamiento que cuando Softracker_DB está disponible.
6. WHEN se invoca `consultar<T>(sql, params)`, THE Softracker_Db_Service SHALL enviar a Softracker_DB la sentencia `sql` con los valores de `params` como parámetros posicionales (`$1`, `$2`, …, sin interpolarlos en el texto de `sql`) y devolver las filas como `T[]`, devolviendo un arreglo vacío cuando la consulta no retorna filas y tratando `params` omitido como una lista vacía.
7. IF una consulta produce un Error_De_Disponibilidad, THEN THE Softracker_Db_Service SHALL registrar el error en el log sin incluir la cadena de conexión y lanzar `ServiceUnavailableException` con el mensaje "El servicio de monitoreo de software no está disponible en este momento."
8. IF una consulta produce un error distinto de un Error_De_Disponibilidad, THEN THE Softracker_Db_Service SHALL registrar el error en el log sin incluir la cadena de conexión y relanzar el error como `InternalServerErrorException` con un mensaje que no contenga la cadena de conexión, el texto de `sql` ni los valores de `params`.
9. IF la variable `SOFTRACKER_DATABASE_URL` está ausente, vacía o compuesta solo por espacios en blanco al invocar `consultar`, THEN THE Softracker_Db_Service SHALL lanzar `ServiceUnavailableException` con el mensaje "El servicio de monitoreo de software no está disponible en este momento." sin intentar abrir conexiones hacia Softracker_DB.
10. WHEN el Backend se detiene, THE Softracker_Db_Service SHALL cerrar el Pool en `onModuleDestroy`, esperar a que finalice el cierre de todas las conexiones abiertas y, si el cierre falla, registrar el error en el log sin incluir la cadena de conexión y sin interrumpir el apagado del Backend.
11. THE Softracker_Db_Service SHALL abrir las conexiones del Pool con `default_transaction_read_only=on` (opción de sesión), de modo que cualquier sentencia de escritura sea rechazada por Softracker_DB además de la restricción del rol `softracker_readonly`; el rechazo de una sentencia de escritura se trata como un error distinto de un Error_De_Disponibilidad y se relanza como `InternalServerErrorException` según el criterio 8.
12. IF las 5 conexiones del Pool están en uso y una nueva invocación de `consultar` no obtiene una conexión libre en 5000 ms, THEN THE Softracker_Db_Service SHALL tratar la situación como un Error_De_Disponibilidad y lanzar `ServiceUnavailableException` con el mensaje "El servicio de monitoreo de software no está disponible en este momento."

### Requirement 2: Configuración de `SOFTRACKER_DATABASE_URL`

**User Story:** Como responsable del despliegue, quiero que la variable de conexión a Softracker esté documentada y validada, para detectar configuraciones incompletas antes de publicar.

#### Acceptance Criteria
1. THE archivo `backend/.env.example` SHALL incluir exactamente una línea `SOFTRACKER_DATABASE_URL` cuyo valor siga el formato `postgresql://softracker_readonly:<clave>@<host>:<puerto>/<base>`, donde `<clave>` sea el marcador `CHANGE_ME` y no aparezca ninguna contraseña, host o nombre de base reales.
2. THE archivo `backend/docker-compose.yml` SHALL declarar `SOFTRACKER_DATABASE_URL` en el bloque `environment` del servicio `backend`, tomando el valor de la variable del archivo de entorno con el mismo nombre (interpolación `${SOFTRACKER_DATABASE_URL}`) y sin valor literal con credenciales.
3. WHILE `NODE_ENV` es `production`, WHEN se invoca `validate()` con `SOFTRACKER_DATABASE_URL` ausente, vacía o compuesta solo por espacios en blanco, THE Environment SHALL lanzar un error cuyo mensaje mencione `SOFTRACKER_DATABASE_URL` e indique que debe configurarse en producción, con el mismo comportamiento que las demás variables validadas por `requiredInProduction`.
4. WHILE `NODE_ENV` es distinto de `production` o no está definido, WHEN se invoca `validate()` con `SOFTRACKER_DATABASE_URL` ausente, vacía o compuesta solo por espacios en blanco, THE Environment SHALL completar `validate()` sin lanzar ningún error atribuible a `SOFTRACKER_DATABASE_URL`.
5. THE prueba `environment.spec.ts` SHALL incluir al menos un caso por cada combinación: (a) `NODE_ENV=production` con la variable ausente, (b) `NODE_ENV=production` con la variable vacía, (c) `NODE_ENV=production` con un valor PostgreSQL válido y sin error, y (d) `NODE_ENV` distinto de `production` con la variable ausente y sin error. Todos los casos deben pasar al ejecutar la suite de pruebas del backend.
6. WHEN el Preflight se ejecuta y `SOFTRACKER_DATABASE_URL` en el archivo de entorno indicado está ausente, vacía, compuesta solo por espacios en blanco o contiene `CHANGE_ME` (sin distinguir mayúsculas y minúsculas), THE Preflight SHALL incluir el error "SOFTRACKER_DATABASE_URL debe configurarse con un valor real." en la lista de errores y terminar con código de salida 1.
7. IF `SOFTRACKER_DATABASE_URL` tiene un valor real (no vacío y sin `CHANGE_ME`) que no se puede interpretar como URL, o cuyo protocolo no es `postgresql:` ni `postgres:`, THEN THE Preflight SHALL incluir en la lista de errores un mensaje que indique que `SOFTRACKER_DATABASE_URL` debe ser una URL PostgreSQL válida y terminar con código de salida 1.
8. IF `SOFTRACKER_DATABASE_URL` es una URL válida con protocolo `postgresql:` o `postgres:` y no contiene `CHANGE_ME`, THEN THE Preflight SHALL no reportar ningún error relacionado con `SOFTRACKER_DATABASE_URL`. Si no hay otros errores, el Preflight termina con código de salida 0.
9. IF el Preflight detecta errores de `SOFTRACKER_DATABASE_URL` junto con errores de otras variables, THEN THE Preflight SHALL reportar todos los errores en una única ejecución antes de terminar, sin detenerse en el primero.

### Requirement 3: Registro del módulo y permisos

**User Story:** Como administrador del sistema, quiero que el módulo Monitoreo de software tenga sus propios permisos, para controlar quién consulta y quién exporta el uso de software.

#### Acceptance Criteria
1. THE constante `MODULOS` de `src/auth/auth.constants.ts` SHALL incluir la entrada `MONITOREO_SOFTWARE: 'MONITOREO_SOFTWARE'`, sin modificar ni eliminar las entradas existentes.
2. THE lista `modulos` del Seed SHALL incluir exactamente una entrada `['MONITOREO_SOFTWARE', 'Monitoreo de software']`, conservando sin cambios las entradas existentes.
3. THE objeto `accionesPorModulo` del Seed SHALL asignar al módulo `MONITOREO_SOFTWARE` exactamente las acciones `['LEER', 'EXPORTAR']`, de modo que al ejecutar el Seed existan únicamente los permisos `MONITOREO_SOFTWARE_LEER` y `MONITOREO_SOFTWARE_EXPORTAR` con prefijo `MONITOREO_SOFTWARE_`.
4. WHEN la Migracion_Permisos se ejecuta, THE Migracion_Permisos SHALL dejar exactamente un registro de módulo con código `MONITOREO_SOFTWARE`, nombre "Monitoreo de software" y estado activo igual a verdadero.
5. WHEN la Migracion_Permisos se ejecuta, THE Migracion_Permisos SHALL dejar exactamente dos permisos con prefijo `MONITOREO_SOFTWARE_`, `MONITOREO_SOFTWARE_LEER` y `MONITOREO_SOFTWARE_EXPORTAR`, ambos asociados al módulo `MONITOREO_SOFTWARE` y con la misma descripción que genera el Seed para esa acción y módulo (formato "<ACCION> en Monitoreo de software").
6. WHEN la Migracion_Permisos se ejecuta y existe el rol `ADMINISTRADOR`, THE Migracion_Permisos SHALL asignar a ese rol los 2 permisos con prefijo `MONITOREO_SOFTWARE_`, sin quitar ninguna asignación de permisos que el rol ya tenga.
7. WHEN la Migracion_Permisos se ejecuta sobre una base donde el módulo, los permisos o las asignaciones al rol `ADMINISTRADOR` ya existen, THE Migracion_Permisos SHALL completar sin error y sin duplicar registros, usando `ON CONFLICT` como en `20261006170000_installation_permissions_and_dashboard_dismissals`: en el módulo actualiza nombre y estado activo, en los permisos actualiza descripción y módulo asociado, y en las asignaciones al rol no hace nada.
8. IF el módulo `MONITOREO_SOFTWARE` ya existe con estado inactivo o con un nombre distinto, THEN THE Migracion_Permisos SHALL dejarlo con nombre "Monitoreo de software" y estado activo igual a verdadero.
9. IF el rol `ADMINISTRADOR` no existe cuando se ejecuta la Migracion_Permisos, THEN THE Migracion_Permisos SHALL completar sin error, dejar insertados el módulo y los 2 permisos y no crear ninguna asignación de rol.

### Requirement 4: Endpoint de filtros disponibles

**User Story:** Como usuario del módulo de monitoreo, quiero obtener las aulas, el software y las categorías disponibles, para construir los filtros de la consulta de uso.

#### Acceptance Criteria
1. THE Monitoreo_Controller SHALL declararse en `backend/src/monitoreo-software/` con el prefijo `/monitoreo-software` y `@RequireModule(MODULOS.MONITOREO_SOFTWARE)`.
2. THE Endpoint_Filtros SHALL exigir el permiso `MONITOREO_SOFTWARE_LEER` mediante `@RequirePermissions`.
3. WHEN un Usuario_Autorizado envía una solicitud GET al Endpoint_Filtros, THE Backend SHALL responder 200 con una Respuesta_Filtros que contenga exactamente las propiedades `aulas`, `software`, `categorias` y `generadoEn`.
4. THE Respuesta_Filtros SHALL contener `aulas` como la lista de valores distintos de `sala_codigo` en `resumen_diario_uso`, excluyendo valores nulos y cadenas vacías, sin duplicados y ordenada de forma ascendente.
5. THE Respuesta_Filtros SHALL contener `software` como la lista de objetos `{ id, nombre, categoria }` de `software_catalogo` con `estado = 'ACTIVO'`, sin registros con `id` repetido, ordenada por `nombre` de forma ascendente y, ante nombres iguales, por `id` de forma ascendente.
6. THE Respuesta_Filtros SHALL contener `categorias` como la lista de valores distintos de `categoria` de `software_catalogo` con `estado = 'ACTIVO'`, excluyendo valores nulos y cadenas vacías, sin duplicados y ordenada de forma ascendente.
7. THE Respuesta_Filtros SHALL contener `generadoEn` como una cadena de fecha y hora ISO 8601 en UTC correspondiente al momento en que se consultó Softracker_DB durante esa solicitud.
8. THE Monitoreo_Service SHALL leer únicamente las vistas `vista_uso_software`, `resumen_diario_uso` y `software_catalogo`, sin ejecutar operaciones de inserción, actualización o eliminación sobre Softracker_DB.
9. THE Monitoreo_Service SHALL construir las consultas a Softracker_DB con SQL parametrizado, sin concatenar valores provenientes de la petición.
10. IF el usuario no está autenticado, THEN THE Guards_Globales SHALL responder 401 sin ejecutar consultas a Softracker_DB.
11. IF el usuario autenticado no tiene acceso al módulo `MONITOREO_SOFTWARE`, THEN THE Guards_Globales SHALL responder 403 sin ejecutar consultas a Softracker_DB.
12. IF el usuario autenticado tiene acceso al módulo pero no tiene el permiso `MONITOREO_SOFTWARE_LEER`, THEN THE Guards_Globales SHALL responder 403 sin ejecutar consultas a Softracker_DB.
13. IF Softracker_DB produce un Error_De_Disponibilidad durante la solicitud, THEN THE Backend SHALL responder 503 con el formato de error de `HttpExceptionFilter`, con un mensaje que indique que la fuente de monitoreo no está disponible y sin incluir texto SQL, nombres de host, credenciales ni trazas de pila, y sin devolver una Respuesta_Filtros parcial.
14. THE Backend SHALL registrar el módulo `MonitoreoSoftwareModule` en `app.module.ts` sin modificar `reportes.controller.ts`.
15. IF las vistas consultadas no contienen registros que cumplan los criterios 4, 5 o 6, THEN THE Backend SHALL responder 200 con la lista correspondiente (`aulas`, `software` o `categorias`) como arreglo vacío y `generadoEn` presente.

### Requirement 5: Caché mínima de filtros

**User Story:** Como responsable de la operación, quiero que los filtros se reutilicen durante una hora, para no consultar Softracker_DB en cada visita, ya que los datos se cargan una vez al día.

#### Acceptance Criteria
1. WHEN el Endpoint_Filtros se solicita y la Cache_Filtros tiene una entrada vigente (una entrada cuyo instante de expiración es estrictamente posterior al instante de la solicitud), THE Monitoreo_Service SHALL devolver la Respuesta_Filtros almacenada en esa entrada sin ejecutar ninguna consulta a Softracker_DB.
2. WHEN el Endpoint_Filtros se solicita y la Cache_Filtros no tiene una entrada vigente (no existe entrada, o su instante de expiración es igual o anterior al instante de la solicitud), THE Monitoreo_Service SHALL ejecutar exactamente una consulta a Softracker_DB y guardar en la Cache_Filtros una única entrada con instante de expiración igual al instante de la solicitud más 3 600 000 ms.
3. WHILE una consulta de filtros a Softracker_DB está en curso, THE Monitoreo_Service SHALL atender todas las solicitudes simultáneas del Endpoint_Filtros con la misma Promise almacenada en la Cache_Filtros, de modo que se ejecute una sola consulta a Softracker_DB y todas esas solicitudes reciban el mismo resultado o el mismo error.
4. IF la consulta de filtros a Softracker_DB falla, THEN THE Monitoreo_Service SHALL eliminar la entrada de la Cache_Filtros, propagar el error a todas las solicitudes que esperaban esa Promise sin devolver una Respuesta_Filtros parcial, y ejecutar una nueva consulta a Softracker_DB en la siguiente solicitud del Endpoint_Filtros.
5. THE Guards_Globales SHALL validar el módulo y los permisos antes de que el Monitoreo_Service lea la Cache_Filtros.
6. IF los Guards_Globales rechazan una solicitud del Endpoint_Filtros, THEN THE Monitoreo_Service SHALL no leer, crear ni modificar la Cache_Filtros y SHALL no consultar Softracker_DB para esa solicitud.
7. THE Monitoreo_Service SHALL mantener una única entrada de Cache_Filtros compartida por todos los usuarios autorizados, sin parámetro de forzado de actualización para el Endpoint_Filtros (el forzado pertenece al Incremento 2).

### Requirement 6: Pruebas y documentación del incremento

**User Story:** Como desarrollador, quiero pruebas automáticas y documentación del incremento, para verificar el comportamiento y mantener actualizado el mapa técnico.

#### Acceptance Criteria
1. WHEN un Usuario_Autorizado solicita el Endpoint_Filtros en la prueba E2E `backend/test/monitoreo-software.e2e-spec.ts`, THE prueba E2E SHALL verificar que la respuesta tiene estado 200 y un cuerpo con la estructura de la Respuesta_Filtros (listas `aulas`, `software` y `categorias`, y campo `generadoEn`), usando un Softracker_Db_Service simulado que no abre conexiones con Softracker_DB.
2. WHEN un usuario autenticado sin acceso al módulo `MONITOREO_SOFTWARE` solicita el Endpoint_Filtros, THE prueba E2E SHALL verificar que la respuesta tiene estado 403 y que el Softracker_Db_Service simulado recibió 0 invocaciones de `consultar`.
3. IF el Softracker_Db_Service simulado lanza `ServiceUnavailableException` durante la solicitud al Endpoint_Filtros, THEN THE prueba E2E SHALL verificar que la respuesta tiene estado 503 y un cuerpo con el formato de error de `HttpExceptionFilter`.
4. IF el Pool simulado produce un Error_De_Disponibilidad o un error distinto de un Error_De_Disponibilidad al invocar `consultar`, THEN THE prueba unitaria del Softracker_Db_Service SHALL verificar que el primer caso se traduce a `ServiceUnavailableException` y el segundo a `InternalServerErrorException`, sin abrir conexiones reales con Softracker_DB.
5. WHEN el Monitoreo_Service recibe una segunda solicitud de filtros mientras la Cache_Filtros tiene una entrada vigente, THE prueba unitaria del Monitoreo_Service SHALL verificar que se devuelve la misma Respuesta_Filtros y que `consultar` del Softracker_Db_Service simulado recibió exactamente las invocaciones de la primera solicitud, sin invocaciones adicionales.
6. WHEN se actualiza el archivo `backend/src/MODULES.md`, THE archivo SHALL describir el `SoftrackerDbModule` y el `MonitoreoSoftwareModule` indicando para cada uno su ruta (prefijo `/monitoreo-software` en el caso del `MonitoreoSoftwareModule`), el módulo `MONITOREO_SOFTWARE` y el permiso `MONITOREO_SOFTWARE_LEER` requeridos, y su dependencia de Softracker_DB.
7. WHEN el Monitoreo_Service recibe 2 o más solicitudes de filtros simultáneas sin entrada vigente en la Cache_Filtros, THE prueba unitaria del Monitoreo_Service SHALL verificar que todas las solicitudes resuelven con la misma Respuesta_Filtros y que la consulta de filtros se ejecuta una sola vez en el Softracker_Db_Service simulado.
8. IF la consulta de filtros del Softracker_Db_Service simulado falla, THEN THE prueba unitaria del Monitoreo_Service SHALL verificar que la solicitud se rechaza con el error lanzado y que la siguiente solicitud de filtros vuelve a invocar `consultar` en lugar de devolver una entrada de la Cache_Filtros.
9. IF un usuario autenticado con acceso al módulo `MONITOREO_SOFTWARE` pero sin el permiso `MONITOREO_SOFTWARE_LEER` solicita el Endpoint_Filtros, THEN THE prueba E2E SHALL verificar que la respuesta tiene estado 403 y que el Softracker_Db_Service simulado recibió 0 invocaciones de `consultar`.
