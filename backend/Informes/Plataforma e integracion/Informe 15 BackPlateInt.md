# Informe 15 - Plataforma e Integración

FECHA: 04/09/2026  
TURNO: 10:00 am - 2:00 pm
AUTOR: Ivan Felipe Prado Blanco

## OBJETIVO DE LA JORNADA

Mejorar el ciclo de vida, la seguridad y la presentación del módulo de
**Tareas Operativas**, incorporando depuración controlada, historial de tareas
completadas, exportación y controles de cambio de estado. Adicionalmente,
armonizar la descarga del PDF en el módulo de **Limpieza** para obtener un
registro independiente del marco general del aplicativo.

## AVANCES REALIZADOS

### Módulo de Tareas Operativas

* Se implementó un buffer de siete días contado desde la creación de cada
  tarea. Las tareas que no se completan se eliminan automáticamente al vencer
  ese periodo, evitando la acumulación de registros operativos vencidos.
* La depuración se ejecuta al iniciar el backend, cada hora y antes de listar
  las tareas, de modo que el panel no muestre tareas operativas vencidas.
* Las tareas completadas no se eliminan. Permanecen en Gestión actual durante
  sus primeros siete días y, al cumplir ese tiempo desde la creación, pasan a
  la pestaña **Historial**.
* Se creó el Historial permanente de tareas completadas con búsqueda y filtros
  por responsable, aula, fechas, disponibilidad y texto libre.
* Se habilitó **Guardar historial**, que descarga los registros filtrados en
  formato Excel con código, tarea, descripción, aula, responsable, fecha de
  creación, fecha de finalización y estado.
* Se restauró la interacción de arrastrar y soltar para mover una tarea entre
  las columnas visibles del tablero. El backend conserva la auditoría de cada
  cambio de estado.
* Se retiró el filtro desplegable de Estado por ser redundante con las
  columnas visibles del tablero.
* Se ajustó el filtro de disponibilidad para usar las opciones **Bloquea aula**
  y **No bloquea aula**.
* Se añadió la eliminación de tareas desde el modal de edición. El proceso
  requiere dos confirmaciones explícitas, exige el permiso `TAREAS_ELIMINAR`,
  registra auditoría y elimina en cascada las decisiones e informes asociados
  a esa tarea.
* Se incorporó una confirmación de contraseña de sesión para cancelar una
  tarea. Después de validarse, la autorización permite realizar cambios de
  cancelación durante diez minutos sin solicitar de nuevo la contraseña.
* La autorización temporal se conserva en la sesión del navegador y el
  backend también la valida, por lo que no puede omitirse mediante una llamada
  directa a la API.
* También se exige esa autorización al mover una tarea Cancelada a Completada.
* Se simplificó el tablero a los cuatro estados operativos actuales:
  **Pendientes**, **En proceso**, **Completadas** y **Canceladas**. Las cuatro
  columnas ocupan el espacio de forma uniforme.
* Se retiraron las columnas Suspendidas y Rechazadas, así como la posibilidad
  de crear nuevos cambios hacia esos estados. Las tareas históricas que ya
  tenían esos valores se muestran dentro de Canceladas para no perder la
  trazabilidad.
* La acción de rechazo de una tarea pendiente fue sustituida visualmente por
  Cancelar; las decisiones de rechazo que existan por compatibilidad se
  registran como Cancelación de la tarea.
* Se aplicó al botón Guardar historial el mismo lenguaje visual usado para los
  botones de guardado del módulo de Multas, incluido el contraste en modo
  oscuro.

### Módulo de Limpieza

* El botón **Descargar PDF** de la matriz mensual fue trasladado al encabezado
  superior derecho, siguiendo la ubicación utilizada por las acciones
  principales de otros módulos.
* Se aplicó al botón el mismo estilo visual de Guardar multas, con estados de
  interacción coherentes en modo claro y oscuro.
* La vista de impresión para el PDF ahora oculta automáticamente la barra
  lateral, la barra superior y el marco general del aplicativo.
* La matriz se imprime en orientación horizontal y sin el padding del área de
  trabajo, para que el PDF contenga únicamente la información pertinente de
  Limpieza y no parezca una captura de pantalla.

## RESTRICCIONES Y REGLAS CONSERVADAS

* El plazo de siete días se cuenta desde la fecha de creación, no desde el
  último cambio de estado.
* Solo las tareas completadas se conservan permanentemente; las demás tareas
  vencidas son eliminadas como mecanismo de depuración.
* El Historial no vuelve a insertar tareas en el panel operativo y la descarga
  respeta los filtros que estén aplicados en pantalla.
* Cancelar una tarea y reabrir una tarea Cancelada como Completada requieren
  contraseña de sesión; los cambios restantes no tienen esa restricción.
* Los estados Suspendida y Rechazada se mantienen únicamente como compatibilidad
  de datos históricos, sin rutas nuevas de creación ni columnas independientes.
* La eliminación de una tarea se realiza únicamente tras la doble confirmación
  del usuario y no modifica datos de aulas, préstamos, prácticas u otros
  módulos.
* No se modificaron localhost, puertos, URLs locales ni la configuración de
  conexión del aplicativo.

## VALIDACIONES EJECUTADAS

* Se compiló el backend correctamente con `npm run build`.
* Se ejecutaron las pruebas del servicio de Tareas Operativas con resultado de
  **4 de 4 pruebas aprobadas**.
* También se ejecutaron las pruebas de autenticación relacionadas con la
  verificación de contraseña, alcanzando **6 pruebas aprobadas** en esa
  ejecución conjunta.
* Se compiló el frontend con `npm run build` y pasó la comprobación de tipos.
* Persisten advertencias preexistentes de dependencias de `useEffect` en otros
  módulos y una advertencia CSS de Prácticas Libres, sin errores de construcción
  relacionados con los cambios descritos.

## RUTA DE PRUEBAS PARA PRÓXIMOS MONITORES

1. Crear una tarea y dejarla en Pendientes, En proceso o Canceladas. En un
   entorno de pruebas, ajustar su fecha de creación a más de siete días y
   consultar el tablero; verificar que la tarea no completada sea depurada.
2. Crear una tarea, moverla a Completadas y verificar que permanezca en Gestión
   actual antes de cumplir siete días. Después de superar ese plazo, comprobar
   que aparezca únicamente en Historial y pueda exportarse con Guardar historial.
3. Arrastrar tareas entre Pendientes, En proceso, Completadas y Canceladas,
   confirmando que el estado se conserve después de recargar la página.
4. Intentar cancelar una tarea sin autorización temporal: debe abrirse el
   modal de contraseña. Validar la contraseña y repetir cambios de cancelación
   durante los siguientes diez minutos sin una nueva solicitud.
5. Mover una tarea Cancelada a Completadas y verificar que también solicite la
   contraseña. Intentar enviar Suspendida o Rechazada mediante API de prueba y
   comprobar que el backend lo rechace.
6. Abrir una tarea, iniciar Eliminar tarea y comprobar que se requieran los dos
   pasos de confirmación. Verificar que la tarea, sus decisiones e informes ya
   no aparezcan y que exista registro de auditoría.
7. En Limpieza, seleccionar Descargar PDF y revisar la vista previa: no debe
   incluir la barra lateral, la barra superior ni elementos ajenos a la matriz.
   Confirmar orientación horizontal y legibilidad de las columnas mensuales.

## PENDIENTES Y SIGUIENTES CAMBIOS PARA PRÓXIMOS MONITORES

1. Realizar pruebas funcionales de extremo a extremo de Tareas Operativas con
   usuarios responsables y administrador, especialmente en permisos de
   cancelación, eliminación y trazabilidad de auditoría.
2. Validar el ciclo de depuración de siete días en una base de pruebas con
   fechas controladas, verificando que únicamente las completadas lleguen al
   Historial.
3. **Préstamos Docentes:** continuar las pruebas de extremo a extremo para
   documento del docente, otro profesor, software requerido, disponibilidad
   estricta, encargado autenticado y control de bloques.
4. **Módulo de Usuarios:** verificar el acceso exclusivo de administrador y
   completar gestión de cargos disponibles, desactivación/eliminación y la
   asignación automática de Monitor.
5. **Prácticas Libres:** configurar y probar el envío real del correo de
   confirmación mediante `EMAIL_WEBHOOK_URL`.
6. **Multas:** continuar las pruebas manuales de carga y guardado masivo en
   Excel, junto con las validaciones vinculadas a prácticas libres activas.
7. **Limpieza:** realizar una prueba de impresión con los navegadores usados
   por los monitores para validar la escala final de la matriz mensual.

## ESTADO ACTUAL

El módulo de Tareas Operativas dispone de un tablero simplificado y uniforme,
depuración automática de tareas no completadas, historial permanente de
completadas y exportación en Excel. Los cambios de cancelación se encuentran
protegidos por una confirmación temporal de contraseña validada tanto en el
cliente como en el backend. El módulo de Limpieza genera ahora una vista de
impresión independiente, enfocada exclusivamente en la matriz mensual.
