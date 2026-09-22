# Informe Plan de Integración 36 - Consolidación documental y centralización de Registros

FECHA: 21/09/2026  
AUTOR: Juan Esteban Cañon y Julian Romero

## OBJETIVO DE LA JORNADA

Dar continuidad a los Informes 34 y 35 mediante la consolidación de los módulos documentales y de asistencia de Gestión de Monitores. La jornada se enfocó en mejorar Memorandos y Actas, unificar Históricos e Importar Registros dentro de un único módulo de Registros, reforzar la consulta de información por monitor y ajustar la presentación visual de las tablas y filtros.

## ALCANCE Y REGLA DE TRABAJO

* Todos los cambios se realizaron únicamente en ambiente local de desarrollo.
* No se modificó el despliegue institucional, la infraestructura remota ni los datos productivos.
* Las pruebas automatizadas se ejecutaron sobre una base de datos temporal y aislada, creada y eliminada automáticamente por el framework de pruebas.

## TRABAJO REALIZADO

### Memorandos

* Se ajustó la franja superior de indicadores para que los bloques **Generados**, **Enviados** y **Pendientes** utilicen de forma equilibrada todo el ancho disponible.
* Se redujo el ancho del botón **Filtrar**, evitando que ocupe espacio innecesario dentro de la barra de herramientas.
* Se mantuvo la separación visual entre los indicadores superiores y los filtros de estado del módulo.

### Actas de compromiso

* Se reemplazó el botón **Restablecer** por **Filtrar**. El nuevo botón aplica los criterios de búsqueda, estado y dependencia seleccionados, en lugar de borrar los valores ingresados.
* Se eliminó el contador numérico de la pestaña **Historial** de Actas.
* Se implementó una vista personal para monitores dentro de Actas, con recordatorio para descargar, firmar y cargar el documento correspondiente al periodo académico vigente.
* La carga personal se limita a archivos PDF de máximo 10 MB.
* Una vez cargada el acta, se deshabilitan el selector de archivo y el botón de carga para prevenir envíos duplicados.
* Se agregó una validación en la API para rechazar cargas duplicadas incluso si se intenta enviar la solicitud directamente.
* Al aprobar o rechazar un acta, se crea una notificación dirigida específicamente al monitor. En los rechazos se conserva y muestra el motivo registrado por el administrador o líder.
* Se añadió la migración correspondiente para el nuevo tipo de notificación de revisión de actas.

### Registros, Históricos y detalle por monitor

* Se consolidó el módulo bajo el nombre **Registros**, estableciéndolo como punto único para la gestión de asistencia y consulta de información relacionada.
* Se creó la ruta principal `/gestion-monitores/registros` y se actualizaron las rutas anteriores de Importar Registros e Históricos para redirigir a este módulo, evitando enlaces rotos y duplicidad funcional.
* La vista inicial muestra únicamente monitores activos del periodo académico vigente.
* Se reemplazó la tabla agrupada y desplegable por dependencia por una tabla plana, paginada y más limpia, con información de horas normales, extras aprobadas, extras pendientes, anotaciones, total, horas restantes y acceso al detalle individual.
* Se incorporó el **Historial reciente de registros** que estaba disponible en el Dashboard, conservando estados, paginación y exportación.
* Se mantuvo la consulta de **Periodos anteriores**, con filtros por monitor, semestre y dependencia para administradores.
* Se corrigió el endpoint histórico: anteriormente consultaba monitores inactivos dentro del semestre activo, lo que podía devolver resultados vacíos. Ahora devuelve los monitores de todos los periodos académicos cerrados visibles para el usuario.
* Se añadió el botón **Ver registros** también para monitores históricos.
* Se implementó un endpoint de detalle integral que respeta el alcance de permisos y permite consultar monitores actuales e históricos. Devuelve sesiones, horarios, anotaciones e inconsistencias asociadas al monitor seleccionado.
* La página individual del monitor ahora reúne marcaciones, horarios, resumen de horas, horas extra, retrasos, inconsistencias y anotaciones relacionadas. El botón de retorno vuelve al módulo Registros.
* Se retiró la tabla operativa de horas del Dashboard para evitar duplicidad; el Dashboard conserva su función de resumen operativo, horario y notificaciones.

### Conciliación de asistencia

* Se transformó el bloque de historial de conciliaciones en una pestaña seleccionable dentro del mismo módulo.
* Las vistas quedaron separadas como **Pendientes** e **Historial**, siguiendo el patrón de navegación usado en otros módulos.
* El encabezado del bloque histórico se simplificó a **Historial**.
* Se conservaron estados, paginación y visualización de monitor asociado dentro de la consulta histórica.

### Consistencia visual

* Se ajustaron tipografías, tamaños de encabezados, columnas, botones y alineación de tablas en Registros para mantener coherencia con el diseño general de Gestión de Monitores.
* Se mantuvieron los encabezados oscuros de tablas, estados mediante etiquetas y botones de acción compactos.
* Se revisó la compatibilidad de los estilos agregados con las variables de color existentes, incluido el modo oscuro.

## VALIDACIÓN TÉCNICA Y DE CALIDAD

* Se ejecutó la compilación de producción del frontend mediante `npm run build`.
* La compilación finalizó correctamente, generando **38 rutas** sin errores de TypeScript.
* Se ejecutaron pruebas automatizadas de la API de reportes y actas mediante `manage.py test apps.reports.tests`.
* Resultado final: **7 pruebas aprobadas y 0 fallos**.
* Las pruebas cubrieron aceptación y rechazo de actas, notificaciones asociadas, prevención de carga duplicada, consulta de históricos de múltiples semestres y consulta de detalle para monitores históricos.
* Se ejecutó `git diff --check` en ambos proyectos, sin errores de espacios o formato. Los avisos observados corresponden únicamente a normalización futura de finales de línea entre Windows y Git.

## PRÓXIMOS PASOS

1. Levantar los contenedores locales y ejecutar la migración pendiente de notificaciones antes de probar Actas en Docker.
2. Validar manualmente con una cuenta de monitor el recordatorio, la carga del acta, el bloqueo posterior de carga y la recepción de notificación tras aprobación o rechazo.
3. Verificar visualmente Registros en resoluciones de escritorio y móvil, especialmente las tablas de periodo actual y periodos anteriores.
4. Probar con datos reales o de prueba de semestres cerrados el botón **Ver registros** para confirmar que se muestren sesiones, horarios, anotaciones e inconsistencias históricas.
5. Validar que los líderes solo puedan consultar registros e históricos correspondientes a su dependencia y que el filtro de dependencia permanezca exclusivo para administradores.
6. Mantener los cambios en ambiente local hasta obtener validación funcional completa y autorización explícita antes de cualquier despliegue.

## ESTADO FINAL

Se consolidó la gestión de asistencia dentro de un único módulo de Registros, eliminando la duplicidad operativa entre Importar Registros, Históricos y la tabla del Dashboard. También se reforzó el ciclo documental de Actas con recordatorios, prevención de cargas duplicadas y notificaciones de revisión. Las modificaciones fueron compiladas y probadas satisfactoriamente en ambiente local; quedan pendientes las validaciones visuales y funcionales finales en Docker con usuarios y datos representativos.
