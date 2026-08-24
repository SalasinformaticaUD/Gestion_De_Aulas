# Informe 4 - Cierre parcial de Plataforma e Integración

FECHA: 24/08/2026  
AUTORES: Esteban Bautista

## OBJETIVO DE LA JORNADA

Consolidar en la rama de Plataforma e Integración los avances transversales del
backend de Gestión de Aulas, integrar esos cambios en `main` y dejar identificado con
claridad qué queda pendiente antes de declarar el plan completamente cerrado.

## AVANCES REALIZADOS

### Plataforma base y seguridad

* Se dejó configurada la API con variables de entorno, CORS limitado por
  `FRONTEND_URL`, validación global de DTO, filtro uniforme de errores y endpoint
  `GET /health`.
* Se centralizó el acceso a datos con `PrismaModule` y `PrismaService`.
* Se completó la administración básica de dependencias, usuarios, roles, módulos y
  permisos. El seed crea las dependencias iniciales, permisos por acción, rol
  `ADMINISTRADOR` y el usuario `admin` usando `ADMIN_INITIAL_PASSWORD`.
* La autenticación emite JWT HS256 con identidad, roles y permisos. Las contraseñas
  nuevas se guardan con `bcrypt`; el hash nunca se devuelve en las respuestas.
* Se mantuvo el modo de permisos configurable para la transición y se añadieron
  decoradores y guards para módulo y permiso.

### Integración con Gestión de Monitores

* Se conserva la integración por HTTP y sin compartir bases de datos.
* El módulo `integraciones` consulta el estado y el usuario vinculado de Monitores
  mediante `MONITORES_API_URL`, timeout y DTOs tipados.
* El aprovisionamiento de identidad central se mantiene en
  `POST /integraciones/monitores/usuarios`, protegido por el encabezado interno
  `X-Monitores-Service-Token`.
* Se documentaron las variables requeridas, el contrato mínimo y el uso del secreto
  JWT compatible con el backend de Monitores.

### Auditoría transversal

* Se completó `AuditoriaService` para registrar `usuarioId`, entidad, identificador,
  acción, datos previos y nuevos.
* Los campos sensibles como contraseñas, secretos, tokens y autorizaciones se
  redactan antes de persistir un evento de auditoría.
* Se integró auditoría en administración de usuarios, roles, permisos, dependencias,
  aulas, préstamos docentes, horarios y multas.
* Se habilitó la consulta administrativa `GET /auditoria` con filtros por entidad,
  identificador, usuario y rango de fechas.

### Horarios y multas

* Las operaciones de períodos y clases de horario registran creación, actualización,
  activación y eliminación, asociadas al usuario autenticado.
* Las rutas de horarios ahora exigen los permisos `HORARIOS_LEER`,
  `HORARIOS_CREAR`, `HORARIOS_ACTUALIZAR` o `HORARIOS_ELIMINAR`, según corresponda.
* Se incorporó el DTO para importación oficial de Excel y se conservó la importación
  de horarios en el traspaso de ramas.
* Se terminó el servicio de multas: creación, consulta por estado o estudiante,
  consulta y creación de motivos, cumplimiento y anulación.
* El cumplimiento conserva fecha, responsable y elementos entregados; la anulación
  conserva fecha, responsable y motivo. Ambas acciones son trazables en auditoría.
* Las rutas de multas quedaron protegidas por módulo y permisos `MULTAS_*`.

### Documentación, control de ramas y entrega

* Se actualizó el README con autenticación JWT, variables y contrato de integración.
* Se agregó `docs/operacion-backend.md` con instalación desde cero, migraciones,
  seed y uso del administrador inicial.
* Se actualizaron los checks comprobados en
  `docs/02-plan-plataforma-integracion.md`.
* Los cambios se trasladaron de la rama `core` a `BackPlateInt`, se actualizó esa
  rama con `main` y se integraron nuevamente en `main`.
* Commits de entrega:
  * `c3f29c3 feat(plataforma): completar auditoria e integracion`.
  * `fa98c8d merge: integrar plataforma e integracion`.

## VALIDACIONES EJECUTADAS

En el backend de Gestión de Aulas se ejecutaron satisfactoriamente:

* `npm test -- --runInBand`: **81 pruebas aprobadas**.
* `npm run test:e2e`: **40 pruebas aprobadas**.
* `npx tsc --noEmit --incremental false`: compilación de tipos aprobada.

Las pruebas incluyen autenticación, administración, auditoría, aulas, horarios,
integraciones, disponibilidad, observaciones, prácticas libres y préstamos docentes.

## PENDIENTES PARA CERRAR EL PLAN AL 100%

### Pendientes de Plataforma e Integración

1. Ejecutar el smoke test real entre Aulas y Monitores con ambos servicios activos,
   URL reales y secretos de cada entorno. Debe validar login, `/health`, consulta de
   usuario vinculado, aprovisionamiento idempotente y rechazos por token inválido.
2. Aplicar migraciones y seed en una base vacía de prueba para confirmar el flujo
   completo de instalación fuera de los mocks automatizados.
3. Configurar en cada entorno los secretos y URLs reales sin versionarlos:
   `JWT_SECRET`, `MONITORES_SERVICE_TOKEN`, `MONITORES_API_URL`,
   `PLATFORM_API_URL`, `PLATFORM_JWT_SECRET` y los orígenes CORS.
4. Activar y asignar roles/permisos a las identidades centrales creadas desde
   Monitores, según la política institucional.
5. Definir el proceso institucional de cambio de correo, desactivación y conservación
   del vínculo entre Usuario central y Monitor local.

### Pendientes de otros módulos funcionales

Estos puntos no deben marcarse como terminados desde este frente porque requieren
reglas de negocio y pruebas propias:

* `Credenciales`: falta implementar el módulo y definir una llave administrada y
  cifrado seguro para `secretoCifrado`; no se deben almacenar secretos en texto plano.
* `Limpieza`, `Tareas operativas`, `Préstamos audiovisuales`, `Panel operativo` y
  `Reportes`: aún contienen servicios o DTOs de plantilla y requieren su implementación
  por los frentes responsables.
* Auditoría de Credenciales no puede completarse hasta que dicho módulo exista de forma
  segura. Por ello los dos checks globales de auditoría del plan permanecen abiertos.
* Falta el recorrido manual integral del checklist 8: login, aula, horario,
  disponibilidad, préstamo y panel.

## ESTADO ACTUAL

La base transversal de Plataforma e Integración está integrada en `main`, compilada y
probada. La autenticación central, autorización, auditoría de los dominios intervenidos
e integración por API con Monitores están listas para continuar con la prueba piloto.
El plan completo no se declara cerrado todavía: depende del smoke test en vivo y de la
implementación segura de los módulos funcionales pendientes.
