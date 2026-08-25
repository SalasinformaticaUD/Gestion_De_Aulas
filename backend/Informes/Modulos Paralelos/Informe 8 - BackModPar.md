Informe 8 - Backend

FECHA: 24/08/2026

TURNO: 4:00 p. m. - 10:00 p. m.

MONITOR: Julian Dario Romero Buitrago

## AVANCES:

* Se continuó con el desarrollo del módulo **06. Gestión de Préstamos de Equipos Audiovisuales**, avanzando desde la etapa de estructura y diagnóstico hacia una implementación funcional del backend.

* Se reemplazó el servicio scaffold de `prestamos-audiovisuales` por una implementación real utilizando `PrismaService`.

* Se implementó la gestión real del inventario de equipos audiovisuales mediante Prisma.

* Se implementó la creación de equipos audiovisuales.

* Se implementó la consulta y listado de equipos con filtros y paginación.

* Se implementó la actualización de equipos audiovisuales.

* Se implementó la creación de préstamos con múltiples equipos mediante `DetallePrestamoAudiovisual`.

* Se agregaron validaciones para docentes, aulas, usuarios responsables, equipos existentes, disponibilidad de equipos y fechas.

* Se implementaron transacciones Prisma para las operaciones de creación de préstamos, devolución y cancelación.

* Se implementó la validación para impedir el préstamo de equipos que no se encuentren en estado `DISPONIBLE`.

* Se implementó el cambio automático de estado de los equipos de `DISPONIBLE` a `PRESTADO` al registrar un préstamo.

* Se implementó el proceso de devolución de equipos.

* Se implementó el cambio condicional de estado de los equipos a `DISPONIBLE` o `MANTENIMIENTO` dependiendo del estado registrado durante la devolución.

* Se implementó la cancelación lógica de préstamos, manteniendo el historial y liberando los equipos asociados.

* Se implementaron consultas de préstamos con filtros por estado, aula, docente, equipo, préstamos activos y préstamos vencidos.

* Se implementaron filtros por rango de fechas mediante `fechaInicio` y `fechaFin`.

* Se integraron los permisos correspondientes al módulo `AUDIOVISUALES`.

* Se integró la auditoría para las operaciones principales relacionadas con equipos y préstamos.

* Se agregó trazabilidad relacionada con la cancelación de préstamos y las observaciones de los equipos.

* Se realizaron modificaciones en Prisma relacionadas con la trazabilidad necesaria para el módulo y se generó la migración correspondiente.

* Se actualizó `03-plan-modulos-paralelos.md`, marcando como implementados los apartados correspondientes al alcance, contratos, reglas de negocio e implementación de P06.

* Se verificó la construcción general del backend y las herramientas de Prisma para confirmar la coherencia de la implementación actual.

## FUNCIONA:

* El módulo `prestamos-audiovisuales` cuenta actualmente con una implementación funcional basada en NestJS y Prisma.

* La gestión de equipos audiovisuales utiliza persistencia real mediante PostgreSQL/Prisma.

* Es posible crear, consultar, listar y actualizar equipos audiovisuales.

* Los equipos cuentan con control de estado para gestionar su disponibilidad.

* Es posible registrar préstamos con múltiples equipos mediante `DetallePrestamoAudiovisual`.

* Los préstamos validan la existencia y disponibilidad de los equipos antes de registrarlos.

* Los equipos pasan correctamente de `DISPONIBLE` a `PRESTADO` al realizar un préstamo.

* Las operaciones principales de préstamo, devolución y cancelación utilizan transacciones Prisma.

* Es posible registrar la devolución de equipos.

* Los equipos pueden regresar a `DISPONIBLE` o pasar a `MANTENIMIENTO` según las condiciones de devolución.

* La cancelación de préstamos libera los equipos asociados y conserva el historial.

* Se mantiene el detalle de los equipos asociados a cada préstamo.

* Se pueden consultar préstamos mediante diferentes filtros.

* Se pueden realizar consultas por estado, aula, docente, equipo, préstamos activos y vencidos.

* Se implementaron consultas mediante rango de fechas utilizando `fechaInicio` y `fechaFin`.

* Se implementaron validaciones relacionadas con docentes, aulas, usuarios responsables, equipos y fechas.

* Se integraron los permisos del módulo `AUDIOVISUALES`.

* Se integró auditoría para las operaciones principales del módulo.

* Se verificó correctamente la generación y validación de Prisma.

* El proceso de build del backend finalizó correctamente.

* La validación de TypeScript finalizó correctamente.

* Las pruebas existentes del backend finalizaron correctamente.

* El módulo cuenta actualmente con una implementación funcional avanzada y se encuentra en etapa de cierre mediante pruebas específicas.

## NO FUNCIONA:

* Todavía no existen pruebas unitarias específicas para el módulo `prestamos-audiovisuales`.

* Todavía no existen pruebas unitarias específicas para la creación y actualización de equipos.

* Todavía no existen pruebas unitarias específicas para la creación de préstamos con múltiples equipos.

* Todavía no existen pruebas unitarias específicas para devolución y cancelación.

* Todavía no existen pruebas unitarias específicas para validar la auditoría del módulo.

* Todavía no existe una suite E2E específica para los endpoints de préstamos audiovisuales.

* Todavía no se han validado mediante E2E los permisos específicos del módulo `AUDIOVISUALES`.

* Todavía no se ha ejecutado una prueba de concurrencia utilizando PostgreSQL real para comprobar que dos solicitudes simultáneas no puedan prestar el mismo equipo disponible.

* Todavía no se ha realizado la validación específica de concurrencia sobre las transacciones de préstamos.

* Durante esta jornada no se ejecutó el lint específico del módulo `prestamos-audiovisuales`.

* Aunque el build, TypeScript, Prisma y las pruebas existentes del backend funcionan correctamente, todavía falta generar evidencia automatizada específica de P06.

* El módulo no debe considerarse completamente cerrado hasta finalizar las pruebas unitarias, E2E, concurrencia y lint específico.

## NO MODIFICAR:

* No modificar el frontend durante el cierre de P06.

* No modificar los módulos paralelos 10, 11, 12 y 13.

* No realizar refactorizaciones generales del backend que no sean necesarias para P06.

* No reemplazar la implementación actual de Prisma por mocks en las funcionalidades reales.

* No eliminar las transacciones Prisma implementadas para préstamos, devolución y cancelación.

* No eliminar las validaciones existentes de disponibilidad, docentes, aulas, usuarios o fechas.

* No eliminar los permisos del módulo `AUDIOVISUALES`.

* No eliminar la auditoría implementada.

* No eliminar el uso de `DetallePrestamoAudiovisual` para asociar múltiples equipos a un préstamo.

* No convertir nuevamente el servicio en un scaffold.

* No crear implementaciones duplicadas de servicios, DTOs, entidades o controladores.

* No modificar `schema.prisma` sin una necesidad técnica directamente relacionada con P06.

* No eliminar la conservación del historial de préstamos.

* No implementar funcionalidades correspondientes a otros módulos paralelos.

* No marcar como completados en `03-plan-modulos-paralelos.md` aquellos puntos que todavía no hayan sido verificados mediante pruebas.

* No considerar el módulo completamente cerrado únicamente porque el build sea exitoso; deben completarse las pruebas específicas y la validación de concurrencia.

## SIGUIENTE PASO:

* Crear pruebas unitarias específicas para `PrestamosAudiovisualesService`.

* Crear pruebas unitarias para la creación, consulta y actualización de equipos audiovisuales.

* Crear pruebas unitarias para préstamos con múltiples equipos.

* Crear pruebas unitarias para validar que no sea posible prestar equipos que no estén en estado `DISPONIBLE`.

* Crear pruebas unitarias para devolución y cambio de estado a `DISPONIBLE` o `MANTENIMIENTO`.

* Crear pruebas unitarias para cancelación y liberación de equipos.

* Crear pruebas unitarias para las operaciones de auditoría, verificando especialmente que la entidad registrada para equipos corresponda a `EquipoAudiovisual`.

* Crear pruebas E2E específicas para los endpoints de equipos.

* Crear pruebas E2E para creación, consulta, devolución y cancelación de préstamos.

* Crear pruebas E2E para los filtros por estado y rango `fechaInicio` / `fechaFin`.

* Crear pruebas E2E para validar autenticación y permisos del módulo `AUDIOVISUALES`.

* Configurar o utilizar la infraestructura existente de PostgreSQL para ejecutar una prueba de concurrencia real.

* Validar que dos solicitudes simultáneas no puedan registrar correctamente el mismo equipo como prestado.

* Ejecutar lint específico sobre `backend/src/prestamos-audiovisuales` y las pruebas creadas.

* Corregir cualquier error encontrado durante las pruebas, lint o validaciones.

* Ejecutar nuevamente build, TypeScript, pruebas unitarias, E2E, Prisma y lint después de las correcciones.

* Una vez finalizadas y aprobadas todas las verificaciones, actualizar definitivamente `03-plan-modulos-paralelos.md` y marcar con `[X]` los puntos de P06 que hayan quedado completamente implementados y comprobados.

Estado: Implementación funcional avanzada; pendientes de cierre concentrados en pruebas unitarias específicas, pruebas E2E, validación de concurrencia con PostgreSQL real y ejecución de lint específico.