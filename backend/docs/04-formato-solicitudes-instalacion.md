# Formato de importación de solicitudes de instalación

## Endpoint

`POST /solicitudes-instalacion/importaciones`

El cuerpo usa `multipart/form-data` con el campo `archivo`. Se admiten archivos `.xlsx` y `.xls` de hasta 20 MB. El permiso requerido es `SOLICITUDES_INSTALACION_IMPORTAR`. Antes de guardar se puede enviar el mismo archivo a `POST /solicitudes-instalacion/importaciones/previsualizar`; esta operación no modifica la base de datos.

## Estructura admitida

El importador recibe el Excel exportado por el formulario institucional. Valida por posición y nombre los encabezados esenciales:

- `Id`;
- `Hora de inicio`;
- `Hora de finalización`;
- `Nombre completo del docente`;
- `Correo electrónico institucional del docente`;
- `Seleccione el Proyecto curricular`;
- `Indique el nombre del software o los programas y la versión requerida para su instalación`.

La primera solicitud utiliza las columnas de asignatura, aulas y software principales. Los cuatro bloques adicionales se convierten en ítems relacionados, por lo que una respuesta puede contener hasta cinco asignaturas. Los programas separados por saltos de línea, punto y coma, viñetas o comas fuera de paréntesis se guardan como registros independientes.

Cada fila original se conserva en `SolicitudInstalacion.datosOriginales`. La normalización relaciona docentes por correo o nombre, periodos por rango de fecha y aulas por código. Proyecto curricular y asignatura se conservan como texto plano porque no representan una relación única del docente. El software también se conserva como texto solicitado y no necesita existir previamente en el catálogo para aprobar o generar tareas.

La clasificación inicial aplica un corte fijo en el 15 de julio de 2026. Una petición anterior se marca como histórica por fecha. Para peticiones desde el día 15 inclusive, el lector inspecciona el relleno de las celdas de software principal y adicional: si al menos una celda con contenido tiene un relleno verde, la solicitud se marca como histórica; cualquier otro color o la ausencia de relleno la mantiene en peticiones actuales. El color de las celdas de aula no interviene en esta regla. La clasificación se conserva en `historicaAlImportar` y `motivoHistorialInicial` sin falsear el estado operativo como `FINALIZADA`.

El flujo institucional da por aceptado el tratamiento de datos al recibir la respuesta. La importación guarda `consentimientoDatos=true` y no presenta una confirmación manual ni bloquea la aprobación por este concepto.

Las aulas se extraen de los dos campos del formulario buscando secuencias independientes de exactamente tres dígitos. Por ejemplo, `Sala 405, laboratorio 506` produce las aulas `405` y `506`; una secuencia de cuatro o más dígitos no se divide artificialmente. Cada código se compara con el catálogo de aulas y solo las coincidencias válidas pueden seleccionarse para crear tareas.

## Respuesta

La respuesta incluye:

- datos de la importación y su estado `COMPLETA`, `PARCIAL` o `FALLIDA`;
- total de filas encontradas;
- solicitudes creadas;
- filas observadas por información incompleta;
- filas rechazadas y el motivo asociado.

El hash SHA-256 del archivo evita importar dos veces el mismo contenido. Una repetición devuelve HTTP `409` con el identificador de la importación existente.

## Consultas

`GET /solicitudes-instalacion` acepta:

- `vista=actuales|historial|todas`;
- `estado`, `desde`, `hasta` y `periodoId`;
- `docente`, `proyectoCurricular`, `aula`, `asignatura` y `software`;
- los identificadores normalizados equivalentes terminados en `Id`;
- `q`, `pagina`, `limite`, `orden` y `direccion`.

Las consultas son paginadas en el backend. `actuales` incluye solicitudes no marcadas como históricas, con estados abiertos del periodo activo o todavía sin periodo normalizado. `historial` incluye las clasificadas por fecha o color durante la importación, además de estados terminales o periodos inactivos.

## Exportaciones

`GET /solicitudes-instalacion/exportar` genera un CSV UTF-8 compatible con Excel y admite los mismos filtros que el listado, incluida la vista actual o histórica. Una exportación contiene los datos principales de la solicitud, aulas, software, estados de tareas y confirmación de inventario.

`GET /solicitudes-instalacion/importaciones/:id/resultado.csv` exporta el resultado de una carga y agrega las filas rechazadas con su causa. Ambos endpoints requieren `SOLICITUDES_INSTALACION_EXPORTAR` y registran usuario, filtros o importación y cantidad de registros en auditoría.

## Revisión manual y aliases

`GET /solicitudes-instalacion/catalogos/normalizacion` entrega los catálogos necesarios para corregir docente, periodo y aulas. `PATCH /solicitudes-instalacion/:id` permite relacionar docente y periodo; `PATCH /solicitudes-instalacion/:id/items/:itemId` permite corregir las aulas. Proyecto curricular, asignatura y software permanecen como texto original visible en la solicitud.

Las correcciones solo actualizan las relaciones permitidas y los campos normalizados. Los campos terminados en `Original` y `datosOriginales` nunca se sobrescriben. Cuando el usuario marca `guardarAlias` en un aula, la equivalencia se guarda en `AliasAula` y se reutiliza en importaciones posteriores. Cada corrección registra auditoría.

## Aprobación, tareas e inventario

`POST /solicitudes-instalacion/:id/previsualizar-aprobacion` recibe la selección explícita de ítems, software y registros de aula. Devuelve las tareas que se crearían y señala cuáles ya existen. El mismo cuerpo se confirma mediante `POST /solicitudes-instalacion/:id/aprobar`.

La aprobación crea una tarea de tipo `INSTALACION_SOFTWARE` por cada pareja de software solicitado y aula normalizada. El software puede ser nuevo y la tarea utiliza su nombre original. La restricción compuesta de `SolicitudSoftwareTarea` hace que repetir la aprobación sea idempotente. Todos los cambios de estado de la solicitud, tareas, relaciones y auditoría se realizan dentro de la misma transacción.

`POST /solicitudes-instalacion/:id/rechazar` exige un motivo. Una solicitud con tareas ya generadas no puede rechazarse directamente; primero deben gestionarse esas tareas desde el módulo operativo.

`GET /solicitudes-instalacion/:id/tareas` entrega el progreso consolidado. Cuando una tarea pasa a ejecución, la solicitud cambia a `EN_EJECUCION`; cuando todas terminan, cambia a `FINALIZADA`.

Completar una tarea no altera por sí mismo el inventario. Únicamente `POST /solicitudes-instalacion/:id/tareas/:tareaId/confirmar-instalacion` registra `AulaSoftware`, y solo si la tarea está completada y conserva software y aula normalizados. La confirmación es idempotente y registra usuario, fecha y auditoría.
