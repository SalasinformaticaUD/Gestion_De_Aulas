# Informe 14 - Plataforma e Integración

FECHA: 04/09/2026  
TURNO: 6:00 a. m. - 8:00 a. m.  
AUTOR: Edwin Alejandro Orjuela Olarte  

## OBJETIVO DE LA JORNADA

Completar las funcionalidades pendientes del módulo de **Tareas Operativas**,
de acuerdo con el documento de requerimientos, para controlar la aceptación de
tareas, conservar el responsable original, registrar la trazabilidad de las
decisiones, almacenar informes de seguimiento y mejorar la consulta y el
control de disponibilidad de las aulas.

## AVANCES REALIZADOS

### Módulo de Tareas Operativas

* Se incorporaron los estados **Rechazada** y **Suspendida** al ciclo de vida
  de las tareas, junto con los estados existentes Pendiente, En proceso,
  Completada y Cancelada.
* Se añadió el flujo de decisión para que el responsable asignado pueda
  **Aceptar** o **Rechazar** una tarea pendiente desde el tablero.
* Al aceptar una tarea, esta pasa a En proceso y registra automáticamente el
  inicio cuando aún no se ha definido una fecha de ejecución.
* Al rechazarla, la tarea conserva el responsable que tenía inicialmente. No
  se elimina ni se reasigna de forma automática.
* Se implementó el registro inalterable de decisiones: cada aceptación o
  rechazo almacena la decisión, el usuario que la tomó y la fecha y hora
  exactas. También se registra en la auditoría general del sistema.
* Para tareas En proceso se incorporó el modal de **Informe de seguimiento**.
  Este exige registrar las secciones Actividades realizadas y Acciones
  pendientes antes de guardar.
* Los informes se guardan como registros independientes para conservar el
  historial de seguimiento y no sobrescribir la información anterior.
* Se añadió la consulta de historial detallado por tarea, incluyendo decisiones
  e informes asociados.
* Se implementaron filtros combinables de estado, responsable, aula y rango de
  fechas en la interfaz; el backend también recibe estos filtros para consultas
  directas a la API.
* El formulario de creación y edición permite asignar un responsable activo.
* Se agregaron campos de tipo, prioridad (Crítica, Alta, Media o Baja) y
  observaciones para cumplir la clasificación, priorización y registro de
  ejecución definidos en los requerimientos.
* Se añadió un resumen de indicadores en backend para tareas pendientes, en
  proceso, finalizadas, productividad y tiempo promedio de ejecución.
* Se validan cruces al programar tareas que afectan disponibilidad: el sistema
  impide coincidir con clases programadas, préstamos docentes, prácticas libres
  activas u otras tareas operativas que bloqueen la misma aula.
* La disponibilidad del aula ahora solo se bloquea cuando una tarea que afecta
  disponibilidad está realmente En proceso; una tarea pendiente, suspendida o
  rechazada no bloquea el aula.

### Persistencia y estructura de datos

* Se aplicó la migración `20260904160000_tareas_operativas_seguimiento`.
* La migración agrega estados, prioridad, tipo, observaciones, fechas de
  creación/actualización, decisiones operativas e informes de seguimiento sin
  eliminar tareas ni registros existentes.

## RESTRICCIONES Y REGLAS CONSERVADAS

* Solo el responsable asignado puede registrar la aceptación o el rechazo de
  una tarea; el administrador conserva capacidad de gestión.
* Una tarea pendiente no puede pasar directamente a En proceso ni a Rechazada
  mediante el cambio general de estado: debe utilizar el registro de decisión.
* Los informes de seguimiento solo se permiten mientras la tarea esté En
  proceso y requieren obligatoriamente las dos secciones solicitadas.
* Las decisiones e informes no tienen operaciones de edición o eliminación,
  preservando la trazabilidad.
* Una tarea que bloquea disponibilidad exige aula, fecha/hora de inicio y
  fecha/hora de fin válidas.
* No se modificaron localhost, puertos, URLs locales ni configuraciones de
  conexión del aplicativo.

## VALIDACIONES EJECUTADAS

* Se ejecutó correctamente la migración de Prisma en la base de datos local.
* Se compiló el backend con `npm run build` sin errores.
* Se ejecutaron las pruebas unitarias del servicio de Tareas Operativas con
  resultado de **3 de 3 pruebas aprobadas**.
* Se compiló el frontend con `npm run build` y superó la comprobación de tipos.
* Persisten advertencias preexistentes de otros módulos relacionadas con hooks
  de React y una advertencia CSS de Prácticas Libres, sin errores de compilación
  asociados a este cambio.

## RUTA DE PRUEBAS PARA PRÓXIMOS MONITORES

1. Ingresar a la ruta **Tareas Operativas** desde el menú principal y crear una
   tarea con aula, responsable, rango de fechas y la opción Afecta
   disponibilidad activa.
2. Iniciar sesión con el responsable seleccionado. En la tarjeta pendiente,
   probar **Aceptar** y verificar que pase a En proceso; crear otra y probar
   **Rechazar**, comprobando que se mantenga el mismo responsable.
3. Consultar el historial de cada tarea y verificar usuario, fecha y hora de la
   decisión, además de que no exista una opción para modificarla.
4. Con una tarea En proceso, seleccionar **Informe de seguimiento**. Intentar
   guardar dejando uno de los campos vacío y confirmar que se bloquee; después
   completar ambas secciones y comprobar que el informe permanezca asociado.
5. Combinar los filtros de estado, responsable, aula y fechas para validar que
   la lista se reduzca únicamente a las tareas coincidentes.
6. Intentar crear una tarea que afecte disponibilidad en un horario con clase,
   préstamo docente, práctica libre activa u otra tarea activa en la misma aula.
   El sistema debe rechazar el cruce.
7. Abrir **Disponibilidad de Aulas** y confirmar que solo una tarea En proceso
   con impacto activo bloquea la sala. Las tareas pendientes, suspendidas y
   rechazadas no deben bloquearla.

## PENDIENTES Y SIGUIENTES CAMBIOS PARA PRÓXIMOS MONITORES

1. Realizar las pruebas funcionales de extremo a extremo descritas para Tareas
   Operativas con cuentas de responsable y administrador, verificando permisos
   y datos reales del periodo académico.
2. Validar visualmente el historial y los indicadores de ejecución con un
   conjunto suficiente de tareas finalizadas, suspendidas y rechazadas.
3. **Préstamos Docentes:** continuar pruebas de extremo a extremo para
   documento del docente, otro profesor, software requerido, disponibilidad
   estricta, encargado autenticado y control de bloques.
4. **Módulo de Usuarios:** verificar el acceso exclusivo de administrador y
   completar gestión de cargos disponibles, desactivación/eliminación y la
   asignación automática de Monitor.
5. **Prácticas Libres:** configurar y probar el envío real del correo de
   confirmación mediante `EMAIL_WEBHOOK_URL`.
6. **Multas:** continuar las pruebas manuales de búsqueda masiva con Excel y
   las validaciones vinculadas a prácticas libres activas.

## ESTADO ACTUAL

El módulo de Tareas Operativas ya permite tomar y auditar decisiones de
aceptación o rechazo, conserva el responsable original en los rechazos,
registra informes de seguimiento obligatorios y protege la programación de
tareas frente a cruces operativos. La disponibilidad ahora refleja únicamente
las tareas que están realmente en ejecución y bloquean el uso del aula.
