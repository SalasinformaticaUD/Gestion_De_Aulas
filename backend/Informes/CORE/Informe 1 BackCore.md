# Informe 1 - BackCore

FECHA: 20/08/2026  
TURNO: 10:00 a. m. - 14:00 p. m.  
MONITOR: Pablo Garzon Gomez

## AVANCES

* Se revisaron todas las ramas locales, ramas remotas y el historial Git disponible para `backend/src/aulas` y `backend/src/horario`.
* Se confirmó que el CRUD real de aulas y la implementación de períodos académicos y clases programadas no estaban en ninguna de las ramas disponibles.
* Se completó únicamente el primer paso del orden de entrega definido en `backend/docs/01-plan-core-operativo.md`: la administración de aulas.
* Se creó un `PrismaModule` global y un `PrismaService` compartido, conectado mediante `DATABASE_URL`, para que el Core acceda a la base de datos sin servicios Prisma privados por módulo.
* Se implementaron y validaron los campos `codigo`, `ubicacion`, `capacidad`, `caracteristicas`, `estado` y `proyectoCurricularId` en `CreateAulaDto`.
* Se mantuvo `UpdateAulaDto` mediante `PartialType` y se agregó un DTO para filtros de estado, ubicación y proyecto curricular.
* Se implementó el CRUD persistente de aulas con Prisma:
  * `POST /aulas`;
  * `GET /aulas`;
  * `GET /aulas/:id`;
  * `PATCH /aulas/:id`;
  * `DELETE /aulas/:id`.
* Se agregó validación UUID para los parámetros de ruta y validación estricta de DTOs mediante `ValidationPipe` en `AulasController`.
* Se agregó control de códigos de aula duplicados mediante `ConflictException`.
* Se agregó respuesta `NotFoundException` para aulas o proyectos curriculares inexistentes.
* El listado permite filtrar por estado, coincidencia parcial de ubicación y proyecto curricular, e incluye el proyecto y el software instalado.
* La consulta individual incluye el proyecto curricular y el software instalado del aula.
* Se adoptó la opción MVP del plan para la eliminación: un aula sin historial operativo se puede eliminar; si tiene clases, prácticas, préstamos, observaciones o tareas asociadas, la eliminación se bloquea y se indica cambiarla a `FUERA_DE_SERVICIO`.
* Se agregaron siete pruebas unitarias para creación, normalización, duplicados, filtros, inexistencia, actualización y eliminación protegida.
* Se agregaron pruebas E2E para crear, listar, consultar, actualizar, validar un UUID inexistente y rechazar datos inválidos, usando Prisma simulado para no modificar la base local.
* Se corrigió la resolución de imports NodeNext terminados en `.js` dentro de Jest para poder probar el cliente Prisma generado.

## FUNCIONA

* El CRUD de aulas usa persistencia Prisma y ya no devuelve textos de scaffolding.
* La creación y actualización validan los datos admitidos y rechazan campos no definidos.
* El código del aula se normaliza y se controla como valor único.
* Las consultas por identificador retornan 404 cuando el aula no existe.
* El listado de aulas acepta filtros por estado, ubicación y proyecto curricular.
* Las respuestas de consulta incluyen la información de software requerida por la vista de aulas.
* La eliminación protege la trazabilidad cuando existen relaciones operativas.
* Las 4 suites unitarias finalizan correctamente: 14 pruebas aprobadas.
* Las 2 suites E2E finalizan correctamente: 4 pruebas aprobadas.
* `npx tsc --noEmit --incremental false`, ESLint y `npm run build` finalizan sin errores.

## NO FUNCIONA

* No se realizó una prueba manual del CRUD contra la instancia PostgreSQL configurada; las pruebas automatizadas nuevas usan Prisma simulado para no alterar datos locales.
* La administración de períodos académicos y clases programadas todavía conserva el scaffolding inicial de NestJS.
* No existen aún las rutas `/horario/periodos` y `/horario/clases` definidas por el plan.
* No está implementada la validación de cruces de clases por aula, día, período y rango horario.
* La asistencia docente, disponibilidad calculada, prácticas libres, préstamos docentes, observaciones restrictivas y panel operativo siguen pendientes.
* La autenticación, el usuario actual y los permisos todavía no están integrados en las operaciones del Core.
* El `ValidationPipe` aún no es global para todo el backend; en esta fase quedó aplicado directamente al controlador de aulas.

## NO MODIFICAR

* No crear una tabla permanente para disponibilidad; debe calcularse desde las fuentes operativas.
* No conectar directamente con la base de Gestión de Monitores.
* No retirar las validaciones de los DTOs ni el `ParseUUIDPipe` de las rutas de aulas.
* No permitir la eliminación física de aulas con historial operativo; en esos casos debe utilizarse el estado `FUERA_DE_SERVICIO`.
* No eliminar el control de duplicados, los errores 404 ni la verificación del proyecto curricular.
* No reemplazar `PrismaService` con servicios Prisma nuevos y privados en los siguientes módulos del Core.
* No avanzar al motor de disponibilidad antes de completar períodos y clases programadas.
* No modificar las relaciones o enums del Core en Prisma sin revisar las migraciones y el impacto sobre los demás frentes.

## SIGUIENTE PASO

* Continuar con el segundo paso del plan: implementar la base real de períodos académicos y clases programadas dentro del módulo `horario`.
* Crear los DTOs específicos `CreatePeriodoAcademicoDto`, `CreateClaseProgramadaDto` y `UpdateClaseProgramadaDto` con validación de UUID, fechas, día de semana y rangos de hora.
* Implementar las rutas `/horario/periodos` y `/horario/clases` sin conservar el CRUD genérico actual como contrato definitivo.
* Validar que solo exista un período activo cuando se active uno nuevo.
* Validar que `horaInicio` sea menor que `horaFin` y bloquear clases solapadas en la misma aula, día y período.
* Agregar pruebas unitarias de cruces y pruebas E2E de creación de período, creación de clase y conflicto por solapamiento.
* No iniciar asistencia docente ni disponibilidad hasta cerrar y verificar este segundo paso.