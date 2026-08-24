# Informe 7 - BackCore

FECHA: 24/08/2026  
TURNO: 06:00 a. m. - 08:00 a. m.  
MONITOR: Pablo Garzon Gomez

## AVANCES

* Se tomó como punto de partida el Informe 6 y se continuó únicamente con las recomendaciones 1 y 2 de su apartado `SIGUIENTE PASO`.
* Se instaló la dependencia `xlsx` para procesar archivos oficiales de Microsoft Excel desde backend.
* Se implementó `POST /horario/importar/excel` mediante `multipart/form-data` con archivo, `periodoId` y bandera opcional `reemplazarAnterior`.
* La importación valida extensión, tamaño, hoja, encabezados, máximo de filas, horarios, grupos, catálogos docentes y asignaturas.
* El formato oficial procesa las columnas académicas requeridas y filtra registros cuyo código no exista en el catálogo de Aulas de Software.
* La respuesta de importación informa procesados, creados, actualizados, rechazados, filtrados, eliminados por reemplazo y el detalle de cada rechazo.
* El reemplazo de una versión anterior solo ocurre con `reemplazarAnterior=true`; sin autorización se conservan las clases anteriores.
* La importación oficial exige que el período sea activo y disponibilidad ahora consulta únicamente clases del período activo.
* Se documentó el formato Excel en `backend/docs/contracts/importacion-horario.md`.
* Se amplió el modelo de Aula con año de adquisición, marca, modelo, renovación tecnológica y pendiente de intervención.
* Se añadió la relación muchos-a-muchos `AulaProyectoCurricular`, manteniendo `proyectoCurricularId` para no romper el contrato ni los registros existentes.
* Se agregaron filtros compatibles por código, capacidad mínima, capacidad máxima y estado pendiente de intervención.
* Se creó la migración `20260824090000_extend_aulas_and_project_relations`; no fue aplicada a la base local.

## FUNCIONA

* `POST /horario/importar/excel` procesa archivos `.xlsx` y `.xls` de hasta 5 MB, con máximo 500 filas y primera hoja como fuente oficial.
* Las filas válidas se crean o actualizan; las aulas externas se excluyen con motivo visible en el resumen.
* La disponibilidad solo considera clases cuyo período académico está activo.
* Las rutas existentes de aulas conservan su contrato y ahora aceptan/exponen los campos técnicos controlados y múltiples proyectos curriculares.
* `GET /aulas` permite filtrar por `codigo`, `capacidadMin`, `capacidadMax` y `pendienteIntervencion`, además de los filtros previos.
* La migración preserva la asociación histórica de proyecto curricular y la copia hacia la nueva tabla de relación.
* Las 17 suites unitarias finalizan correctamente: 82 pruebas aprobadas.
* Las 11 suites E2E finalizan correctamente: 38 pruebas aprobadas.
* Prisma valida el esquema, TypeScript y `npm run build` finalizan sin errores.

## NO FUNCIONA

* La migración nueva y las migraciones previas pendientes no se han aplicado a PostgreSQL local; por tanto, los nuevos campos y relación múltiple requieren ejecutar migraciones antes de usarse contra esa base.
* La importación Excel no incluye todavía un archivo de plantilla descargable ni una previsualización antes de confirmar el reemplazo.
* El filtrado de Aulas de Software se basa en el catálogo `Aula` existente; no hay todavía una clasificación independiente de tipo de aula en el modelo.
* La recomendación 3 del Informe 6 permanece pendiente: filtros, sugerencias e histórico derivado de disponibilidad por software, capacidad y características.
* La regla de liberar aula por ausencia docente continúa pendiente de decisión operativa.
* Las pruebas automatizadas aún usan Prisma simulado y no una base PostgreSQL aislada.

## NO MODIFICAR

* No crear una tabla que persista resultados calculados de disponibilidad.
* No permitir reemplazo de horarios sin la bandera explícita `reemplazarAnterior=true`.
* No importar horarios oficiales en períodos inactivos ni usar clases de períodos inactivos para la operación diaria.
* No retirar `proyectoCurricularId` de Aula hasta completar la migración de consumidores hacia la relación múltiple.
* No aplicar la migración a la base local ni modificar datos existentes sin autorización explícita.
* No cambiar la prioridad del motor de disponibilidad ni liberar aulas por ausencia docente sin decisión aprobada.
* No modificar los Informes 1 a 6 para registrar estos avances.

## SIGUIENTE PASO

* Implementar la recomendación 3 del Informe 6: extender disponibilidad con filtros por software, capacidad y características.
* Incorporar una sugerencia ordenada de aulas a partir del cálculo existente, sin duplicar prioridades ni persistir resultados.
* Diseñar la consulta histórica como derivación de clases, préstamos, prácticas, observaciones y tareas, sin crear tabla de disponibilidad.
* Añadir pruebas unitarias y E2E para filtros, sugerencias e histórico derivado.
* Antes de integrar en PostgreSQL local, revisar y aplicar en orden las migraciones pendientes, incluyendo `20260824090000_extend_aulas_and_project_relations`.
