# Informe 2 - BackCore

FECHA: 20/08/2026  
MONITOR: Pablo Garzon Gomez

## AVANCES

* Se continuó el flujo establecido por el Informe 1 con el tercer paso del plan del Core: asistencia docente asociada a clases programadas.
* Se reemplazó el CRUD genérico de asistencia por los contratos específicos:
  * `GET /asistencia-docente?fecha=&aulaId=&estado=`;
  * `POST /asistencia-docente`;
  * `PATCH /asistencia-docente/:id`;
  * `GET /asistencia-docente/clase/:claseId`.
* Se agregó `fecha` al modelo `AsistenciaDocente` para identificar la ocurrencia diaria de una clase semanal.
* Se creó la migración `20260820140000_add_fecha_asistencia_docente` con una restricción única para `(claseId, fecha)` y un índice para consultas por fecha y estado.
* Los DTOs validan clase, fecha en formato `YYYY-MM-DD`, estado, usuario registrador opcional y observación de hasta 500 caracteres.
* Se verifica que la clase programada exista antes de registrar o consultar asistencias.
* Durante el MVP, si se recibe manualmente `registradoPorId`, se verifica que el usuario exista.
* Se evita más de un registro para la misma clase y fecha tanto desde el servicio como mediante la restricción única de PostgreSQL.
* Los estados permitidos son `PENDIENTE`, `ASISTIO` y `AUSENTE`.
* Los registros pendientes mantienen `registradaEn` en `null`; al confirmar asistencia o ausencia se guarda automáticamente el momento del registro.
* La consulta general permite filtrar por fecha, aula y estado, preparando la consulta de pendientes del día para el panel operativo.
* La consulta por clase devuelve el historial ordenado desde la fecha más reciente.
* El endpoint de actualización no permite cambiar la clase ni la fecha, protegiendo la identidad del bloque operativo.
* Se agregaron pruebas unitarias y E2E para creación, estados, referencias inexistentes, duplicados, filtros, historial, actualización y validación de entrada.
* Se inició el cuarto paso del Core resolviendo la regla arquitectónica de disponibilidad calculada y no persistida.
* Se retiraron del módulo `disponibilidad-aulas` los endpoints y DTOs genéricos de creación, actualización y eliminación.
* La disponibilidad se calcula al consultar las salas mediante bloques obligatorios de dos horas alineados a horas pares.
* Se implementaron los contratos de solo lectura `GET /disponibilidad-aulas` y `GET /disponibilidad-aulas/:aulaId` con fecha, hora inicial y hora final.
* El cálculo consulta el estado del aula, restricciones, clases, asistencia docente, préstamos docentes, prácticas libres y tareas que afectan disponibilidad.
* Se implementó la prioridad: estado físico del aula, restricción, clase, préstamo docente, práctica libre, tarea y disponible.
* La ausencia docente se expone como señal dentro de la fuente de la clase, pero no libera automáticamente el aula.
* Cada respuesta incluye el aula, bloque evaluado, estado calculado, motivo, fuente prioritaria, fuentes consultadas, momento del cálculo y `persistido: false`.
* No se creó ningún modelo, tabla ni migración de disponibilidad.
* Se agregaron pruebas unitarias de bloques, disponibilidad, prioridad de mantenimiento y ausencia docente, además de pruebas E2E que confirman que el módulo no admite escritura.

## FUNCIONA

* La asistencia docente usa persistencia Prisma y ya no devuelve textos de scaffolding.
* Solo se puede registrar asistencia sobre una clase programada existente.
* Una clase admite un único registro por fecha y puede conservar historial en fechas diferentes.
* Las asistencias pueden consultarse por fecha, aula, estado y clase programada.
* Los cambios a `ASISTIO` o `AUSENTE` registran automáticamente el momento de confirmación.
* Los errores de duplicado y referencias inexistentes se convierten en respuestas HTTP claras.
* El esquema Prisma actualizado es válido y el cliente fue regenerado.
* La disponibilidad de todas las salas o de un aula específica puede calcularse para un bloque de dos horas.
* Las consultas no crean, actualizan ni eliminan información de disponibilidad.
* Un bloque sin actividades retorna `disponible` y mantenimiento prevalece sobre una clase programada.
* Las 6 suites unitarias finalizan correctamente: 33 pruebas aprobadas.
* Las 5 suites E2E finalizan correctamente: 13 pruebas aprobadas.
* Prettier, TypeScript, ESLint y `npm run build` finalizan sin errores.

## NO FUNCIONA

* No se ejecutaron pruebas manuales contra la instancia PostgreSQL configurada; las pruebas automatizadas usan Prisma simulado para no modificar datos locales.
* La migración de asistencia está creada, pero todavía no se aplicó sobre la instancia PostgreSQL local.
* `registradoPorId` todavía no se obtiene automáticamente del usuario autenticado porque la infraestructura de autenticación no está integrada con este flujo.
* `GET /disponibilidad-aulas/resumen-dia?fecha=` todavía no está implementado porque falta definir el rango operativo diario que se dividirá en bloques de dos horas.
* `siguienteActividad` permanece en `null`; todavía no se calcula la próxima actividad posterior al bloque consultado.
* Falta la prueba E2E combinada con aula, clase y préstamo docente real o simulado dentro del mismo escenario.
* Las prácticas libres, préstamos docentes, observaciones restrictivas y panel operativo siguen pendientes.
* El `ValidationPipe` todavía no está configurado globalmente para todo el backend; está aplicado directamente en los controladores implementados.

## NO MODIFICAR

* No retirar la fecha operativa ni la restricción única `(claseId, fecha)` de asistencia docente.
* No permitir que `PATCH /asistencia-docente/:id` cambie la clase o la fecha del registro.
* No aceptar estados diferentes a `PENDIENTE`, `ASISTIO` y `AUSENTE`.
* No crear una tabla permanente para disponibilidad; debe calcularse desde las fuentes operativas.
* No volver a exponer `POST`, `PATCH` o `DELETE` para disponibilidad.
* No aceptar bloques con duración diferente de dos horas ni bloques que comiencen en una hora impar.
* No liberar automáticamente un aula por ausencia docente hasta que exista una regla operativa aprobada.
* No conectar directamente con la base de Gestión de Monitores.
* No reemplazar `PrismaService` con servicios Prisma privados en los siguientes módulos del Core.
* No modificar las relaciones o enums del Core sin revisar las migraciones y el impacto sobre los demás frentes.
* No construir el panel operativo duplicando reglas de asistencia o disponibilidad.

## SIGUIENTE PASO

* Continuar recorriendo el plan desde el inicio con el siguiente punto pendiente: configurar un `ValidationPipe` global.
* Registrar en `main.ts` las opciones `transform`, `whitelist` y `forbidNonWhitelisted`.
* Verificar que los controladores ya implementados conserven el mismo comportamiento al centralizar la validación.
* Retirar configuraciones locales duplicadas únicamente después de comprobar que la validación global funciona.
* Agregar o ajustar pruebas E2E para demostrar transformación de query params, rechazo de campos no permitidos y validación uniforme.
* No avanzar al filtro global de excepciones hasta cerrar este punto.
