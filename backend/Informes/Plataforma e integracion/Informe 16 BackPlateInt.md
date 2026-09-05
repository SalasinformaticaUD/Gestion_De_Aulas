# Informe 16 - Plataforma e Integración

FECHA: 04/09/2026  
TURNO: 2:00 p. m. - 9:00 p. m.  
AUTOR: Kevin Rincon - Juan Bustos

## OBJETIVO DE LA JORNADA

Completar y armonizar los flujos operativos de **Tareas Operativas**,
**Observaciones**, **Préstamos Audiovisuales**, **Credenciales**, **Prácticas
Libres**, **Multas**, **Dashboard** y **Limpieza**. La jornada se concentró en
aplicar las reglas funcionales definidas, reforzar la trazabilidad de usuarios
y responsables, evitar préstamos duplicados, mejorar la consulta de
información y dejar el panel principal preparado para una revisión visual
integral.

## AVANCES REALIZADOS

### Módulo de Tareas Operativas

* Se definió el flujo permitido de estados: una tarea Pendiente puede pasar a
  En proceso o Cancelada, pero no puede completarse directamente. Una tarea En
  proceso puede pasar a Completada o Cancelada y no puede regresar a Pendiente.
  Una tarea Completada queda cerrada de forma definitiva.
* Se incorporaron mensajes de confirmación antes de aceptar o completar una
  tarea, evitando cambios accidentales de estado.
* Al aceptar una tarea, el usuario de la sesión queda registrado como primer
  responsable. El sistema permite seleccionar otros responsables que
  participarán simultáneamente en la ejecución.
* La selección de colaboradores no queda bloqueada después de la primera
  aceptación. Mientras la tarea continúe En proceso puede volver a aceptarse
  para registrar al usuario que la retoma y añadir nuevos participantes.
* El informe de seguimiento se organizó en filas con las columnas Responsable,
  Actividades realizadas y Actividades pendientes. Las actividades realizadas
  son obligatorias y las pendientes son opcionales.
* Los campos del formulario de seguimiento se dejaron vacíos al iniciar la
  captura y se corrigió su alineación para evitar el desplazamiento visual que
  presentaban al escribir.
* Cada fila del informe conserva los responsables que participaron en esa etapa
  de la actividad. Si una persona continúa sola en una etapa posterior,
  únicamente esa persona aparece en la nueva fila, preservando la trazabilidad
  real de la ejecución.
* Si el seguimiento no registra actividades pendientes, no se crea una fila
  adicional, pues se entiende que el trabajo reportado quedó terminado.
* Cuando existen actividades pendientes se habilita una nueva etapa de
  seguimiento sin sacar la tarea del estado En proceso. El siguiente usuario
  que la acepta queda registrado como responsable de esa continuación.
* Se impidió completar una tarea mientras conserve acciones pendientes.
* La cancelación mediante arrastre abre un modal que exige explicar el motivo.
  Se conserva el usuario que canceló, la fecha y la justificación.
* Las tareas completadas y canceladas permanecen siete días en Gestión actual y
  después pasan al Historial. El historial separa ambos estados y conserva los
  informes y motivos de cancelación.
* En Completadas se puede consultar el informe completo de la tarea. En
  Canceladas se muestra también la causa registrada, comportamiento que se
  conserva dentro del Historial.
* Se retiraron de Gestión actual los filtros Desde, Hasta y Disponibilidad para
  simplificar la vista principal.
* Se mejoró el texto usado para identificar el cierre definitivo de una tarea,
  reemplazándolo por una presentación más clara y natural.
* Se añadieron notificaciones al creador cuando otra persona cancela una tarea
  Pendiente o En proceso, indicando quién realizó la cancelación y el estado en
  el que se encontraba.

### Módulo de Observaciones

* Se retiró el tipo de observación Semanal.
* Las observaciones de tipo Restricción ahora permiten indicar un rango Desde -
  Hasta.
* El autor de cada observación se obtiene de la sesión activa, evitando que sea
  digitado o atribuido manualmente.

### Módulo de Préstamos Audiovisuales

* Se incorporó la carga masiva de videobeams dentro de Inventario mediante una
  plantilla Excel con las columnas Marca, Número Interno y Modelo. El número
  interno se utiliza como código del equipo.
* Se añadió la descarga de la plantilla con datos de ejemplo y el botón
  Cancelar para cerrar el modal de carga masiva.
* Se mantuvo Préstamos como primera pestaña e Inventario como segunda opción de
  navegación.
* El registro permite buscar al profesor por cédula y localizar equipos por
  código interno, incluyendo el ingreso rápido mediante escáner.
* El aula destino se registra como texto libre y la devolución estimada solicita
  únicamente la hora, porque el préstamo corresponde al mismo día.
* La recomendación prioriza equipos ViewSonic y reserva los Epson para casos
  especiales, solicitudes expresas o cuando no existan otros equipos
  disponibles.
* Se impide prestar un videobeam durante los veinte minutos posteriores a su
  devolución para permitir su enfriamiento.
* Se permite registrar quién entrega el equipo y quién lo recibe al momento de
  la devolución. Ambos datos quedan visibles en el registro del préstamo.
* Se añadieron los accesorios HDMI, Extensión, VGA, HDMI inalámbrico y Otro. Al
  seleccionar Otro se habilita la descripción del elemento entregado.
* Se permite prestar únicamente cables, accesorios o parlantes sin exigir un
  videobeam. Por esta razón también se retiró el aviso que obligaba a escoger
  HDMI, VGA u otro accesorio específico.
* Se incorporaron observaciones al préstamo y observaciones independientes para
  la devolución; ambas se muestran en el detalle y en el registro histórico.
* La devolución presenta todos los elementos que debían regresar y solicita
  confirmar si fueron entregados completamente.
* Cuando faltan equipos o accesorios, el préstamo queda con estado **Devuelto
  incompleto** en lugar de marcarse como una devolución normal.
* En los préstamos finalizados se muestra la hora real de devolución, utilizada
  para calcular el tiempo efectivo de uso y mejorar las recomendaciones.
* Se impide crear un segundo préstamo audiovisual activo para un profesor que
  ya tenga uno vigente.
* En Inventario se habilitó la edición del equipo para cambiar su estado a
  Disponible, En mantenimiento o Fuera de servicio.

### Módulo de Credenciales y control de acceso

* Se añadió una columna de contraseña protegida visualmente. El valor solo se
  revela mientras el usuario mantiene presionado el icono de ojo.
* Se retiró el botón Consultar, ya que la visualización controlada se realiza
  directamente desde la tabla.
* Se habilitó Cambiar contraseña. El proceso solicita primero la contraseña de
  la sesión actual y luego permite registrar la contraseña anterior y la nueva.
* La eliminación de una credencial también exige confirmar la contraseña del
  usuario autenticado.
* Se retiró el botón Desactivar; los cambios de estado se realizan únicamente
  desde Editar.
* Se aplicó la nueva regla de acceso que impide a los usuarios con rol Monitor
  ingresar al módulo de Gestión de Aulas.

### Dashboard y panel operativo

* La sección de horarios muestra únicamente el bloque actual y se actualiza a
  medida que avanza la jornada. La consulta de otros bloques permanece en el
  módulo de Horarios.
* Se añadieron indicadores del bloque para aulas disponibles, clases en curso,
  prácticas libres y audiovisuales prestados.
* Las clases en curso incluyen únicamente aquellas cuya asistencia fue marcada
  como Asistió.
* El Dashboard permite registrar la asistencia con los mismos controles y
  comportamiento del módulo de Horarios.
* La columna Asignatura conserva ese nombre y muestra debajo, en texto pequeño,
  el proyecto curricular correspondiente.
* Se reorganizaron los anchos de Aula, Asignatura, Docente, Grupo y Asistencia
  para que nombres como Sala Especializada 403 se lean correctamente y la tabla
  mantenga una distribución equilibrada.
* Las notificaciones pueden filtrarse por Críticas, Advertencias e Informativas.
  Si no se selecciona un filtro, se ordenan primero las críticas, luego las
  advertencias y finalmente las informativas.
* Las tareas operativas notifican la disponibilidad más cercana del aula para
  realizarlas. Si el bloque recomendado termina sin aceptación, se calcula el
  siguiente espacio disponible.
* El cálculo de disponibilidad se actualiza con novedades reales; por ejemplo,
  una inasistencia docente puede liberar el aula y generar una nueva
  recomendación.
* Se muestran notificaciones cuando un usuario agrega una observación, cuando
  un préstamo audiovisual está próximo a vencer y quince minutos antes del
  cambio de bloque para una práctica libre activa.

### Prácticas Libres

* Prestar un aula para una práctica no la elimina automáticamente de las
  opciones para otros estudiantes. La misma sala puede utilizarse en otro
  horario o en una condición compatible.
* Se impide registrar una segunda práctica libre para un estudiante que ya
  tiene una práctica activa.

### Módulo de Multas

* Se añadió la columna Multa sugerida para diferenciar el valor recomendado por
  el sistema del valor finalmente aplicado.
* Se incorporó la persistencia del valor sugerido en la base de datos y su
  consulta desde la interfaz.

### Módulo de Limpieza y depuración de datos

* Se eliminó definitivamente el aula inexistente `AULA-NUEVA-914` de la base de
  datos y de los archivos temporales de carga usados durante las pruebas.
* También se retiraron dos préstamos docentes de prueba y los registros de
  auditoría que dependían exclusivamente de esa aula, evitando que vuelva a
  aparecer en Limpieza o en consultas relacionadas.

## RESTRICCIÓN DE TRABAJO PARA LAS SIGUIENTES JORNADAS

**No se debe modificar, reemplazar ni reinterpretar la lógica funcional del
software sin que el encargado del software se encuentre presente y apruebe el
cambio.**

Esta restricción incluye reglas de negocio, estados, permisos, validaciones,
cálculos de disponibilidad, ciclos de préstamo, historial, auditoría y
estructura de datos. Si durante una revisión visual se detecta que una mejora
requiere alterar comportamiento funcional, el ajuste debe documentarse y quedar
pendiente hasta contar con el encargado.

Las próximas intervenciones deben limitarse a presentación, estilos,
distribución, accesibilidad visual y comportamiento del menú, sin modificar las
reglas operativas ya implementadas.

## VALIDACIONES Y COMPROBACIONES REALIZADAS

* Se actualizaron pruebas unitarias de autenticación, credenciales, panel
  operativo, prácticas libres y préstamos audiovisuales para cubrir las nuevas
  restricciones.
* Se verificó la integración entre frontend, API y esquema de Prisma para los
  campos y estados incorporados.
* Se comprobaron las reglas de préstamo activo por estudiante y profesor, el
  enfriamiento de videobeams y la información agregada al Dashboard.
* Se confirmó que `AULA-NUEVA-914` ya no existe en la base de datos ni aparece
  referenciada en los archivos del proyecto.
* Los cambios de la jornada quedaron consolidados en el repositorio junto con
  las migraciones de seguimiento de tareas, observaciones, audiovisuales,
  devolución incompleta y multa sugerida.

## PLAN DE TRABAJO - SÁBADO 5 DE SEPTIEMBRE DE 2026

1. Revisar visualmente todos los módulos en modo claro y modo oscuro, sin
   modificar su lógica funcional.
2. Mejorar contraste, tipografía, espaciado, tamaños de controles y consistencia
   de colores en ambos temas.
3. Hacer que las divisiones entre tarjetas, tablas, secciones y formularios sean
   tan claras en modo claro como actualmente se perciben en modo oscuro.
4. Corregir bordes, fondos y separadores que se pierdan por falta de contraste
   en el tema claro.
5. Mejorar el menú hamburguesa para que su apertura, cierre, tamaño y respuesta
   en escritorio y dispositivos móviles sean más claros y fluidos.
6. Impedir el desplazamiento interno del sidebar izquierdo. La navegación debe
   mantenerse fija, ordenada y completamente accesible dentro de la altura
   disponible.
7. Revisar la adaptación responsive de tablas, modales, paneles y formularios,
   prestando atención especial al Dashboard y a las vistas con muchas columnas.
8. Validar estados hover, focus, activo, deshabilitado y seleccionado en modo
   claro y oscuro.
9. Realizar una revisión visual final módulo por módulo con el encargado del
   software presente antes de aprobar cualquier ajuste que pueda afectar el
   comportamiento funcional.

## ESTADO ACTUAL

El aplicativo cuenta con reglas funcionales reforzadas para tareas,
observaciones, préstamos audiovisuales, credenciales, prácticas libres y
multas. El Dashboard concentra la operación del bloque actual, permite registrar
asistencia y organiza las notificaciones por prioridad. La siguiente jornada se
dedicará exclusivamente a mejorar la presentación en los temas claro y oscuro,
las divisiones visuales, el menú hamburguesa y el sidebar izquierdo, respetando
la restricción de no cambiar lógica sin la presencia del encargado del
software.
