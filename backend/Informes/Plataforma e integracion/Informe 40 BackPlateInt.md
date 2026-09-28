# Informe Plan de Integración 40 - Seguridad de sesión, experiencia del monitor y consistencia de información

FECHA: 23/09/2026  
AUTORES: Edwin Alejandro Orjuela Olarte  

## TURNOS DE TRABAJO

* **Edwin Alejandro Orjuela Olarte:** 6:00 a. m. a 10:00 a. m. del 23/09/2026.

## OBJETIVO DE LA JORNADA

Fortalecer la separación de permisos entre sesiones de Gestión de Monitores, recuperar y consolidar la experiencia personal del perfil Monitor, y corregir la visibilidad, navegación y consistencia de sus datos en Dashboard, Registros, Anotaciones, Actas y Notificaciones.

## ALCANCE Y REGLA DE TRABAJO

* Los cambios se realizaron en el frontend de Gestión de Monitores y en la API Django asociada.
* El perfil Monitor solo puede consultar información propia y navegar a módulos que tenga habilitados.
* Se conservaron los flujos administrativos para administradores y líderes, sin mezclar sus datos ni permisos con la sesión del monitor.
* Los ajustes responsive se concentraron en pantallas pequeñas sin cambiar las reglas funcionales de negocio.

## TRABAJO REALIZADO

### Aislamiento de sesiones y permisos

* Se corrigió el cruce de permisos entre una sesión de Monitor y una sesión administrativa abierta en otra pestaña.
* Las solicitudes de Gestión de Monitores usan la identidad enviada por `Authorization` y omiten cookies de otras pestañas.
* Se incorporó y validó el uso de token local para cuentas históricas de Monitor, manteniendo su alcance independiente de la sesión central.
* Se ajustó la protección de rutas para validar la identidad de Monitor sin heredar privilegios administrativos.

### Registros personales del Monitor

* Se mantuvo el acceso de Monitor al módulo Registros mediante una vista personal que expone exclusivamente sus horarios, sesiones, anotaciones, inconsistencias y memorandos.
* Se incorporó el indicador de **Memorandos** como tarjeta de resumen dentro de Registros.
* Se mejoró la línea de tiempo de Registros en móvil: conserva su contenido completo dentro de una navegación horizontal específica, en lugar de comprimir o recortar los niveles.
* Se eliminó el botón **Ocultar** del bloque “Mi horario semanal” en el Dashboard personal.

### Perfil y horario personal

* Se conectaron al perfil del Monitor los campos de código, semestre académico, documento, proyecto curricular, teléfono y dependencia.
* La dependencia se muestra con nombre legible, por ejemplo “Monitores Aulas de Software”, en vez de su código técnico.
* Se agregó la dependencia debajo de la foto y también dentro de la información personal.
* Al seleccionar un bloque del horario semanal se presenta su detalle en tarjetas del diseño actual: día, horario, ubicación, asignatura, grupo, docente y proyecto curricular.

### Actas y notificaciones del Monitor

* Se mantuvo el flujo para que un acta rechazada pueda corregirse mediante un único control funcional de selección y envío de archivo.
* Se ajustó la campana de notificaciones para el perfil Monitor.
* Las notificaciones personales del Monitor se limitan a eventos pertinentes: registro procesado, horas extra revisadas, anotación creada y acta de compromiso revisada.
* Las notificaciones administrativas por dependencia ya no se entregan al Monitor.
* Una notificación de horas extra revisadas redirige a **Registros**, que es un módulo disponible para el Monitor, y no a Horas extra.
* Al abrir una notificación se marca como leída y se desplaza al final de la lista, evitando que reaparezca como novedad prioritaria.

### Anotaciones y consistencia de datos

* Se unificó la consulta de anotaciones usada por **Mis registros** y **Mis anotaciones** mediante el mismo selector de visibilidad.
* Ambas secciones consideran anotaciones propias del Monitor activo y del semestre académico vigente.
* El resumen de horas por anotaciones dentro de Registros usa el mismo conjunto de datos.
* Se detectó y corrigió un filtro visual que ocultaba las anotaciones del Monitor: el filtro de dependencia intentaba consultar una lista administrativa de monitores que, por seguridad, no está disponible para ese rol.
* El filtro de dependencia ahora solo se aplica a administradores y líderes; el Monitor puede ver sus anotaciones existentes y las creadas recientemente desde Administración.

### Estabilidad y ajustes generales

* Se corrigió la advertencia de React por claves duplicadas en etiquetas de Excepciones, utilizando claves únicas para valores repetidos.
* Se corrigió el interruptor de modo claro/oscuro del selector de aplicativos, evitando interacciones duplicadas y mejorando su prioridad visual.
* Se revisó la tasa de solicitudes del endpoint de perfil y se identificó que múltiples consultas simultáneas de sesión pueden provocar el límite `429`; queda registrado para verificación de comportamiento en ambiente real.

## VALIDACIÓN TÉCNICA

* `npm run build` del frontend finalizó correctamente después de los cambios de notificaciones, registros y anotaciones.
* `python manage.py check` finalizó sin errores.
* Se verificó directamente en la base local que las anotaciones creadas para el Monitor activo están asociadas al perfil y semestre vigente correctos.
* Se agregó una prueba de API que compara los identificadores entregados por Mis registros y Mis anotaciones.
* La ejecución funcional de pruebas Django quedó bloqueada por una dependencia faltante en el entorno local: `bcrypt`. El código y las validaciones estáticas no presentaron errores.

## COSAS PENDIENTES

1. Verificar de forma integral la consistencia de datos del aplicativo de Gestión de Monitores, contrastando Dashboard, Registros, Anotaciones, Actas, Notificaciones y los cálculos de horas con datos reales.
2. Probar el diseño responsive de cada sección de Gestión de Monitores, especialmente con cuentas reales en dispositivos móviles.
3. Probar el diseño responsive de Dashboard y Actas con una cuenta real de Monitor, verificando calendario, llegadas tarde, tarjetas, carga y corrección de archivos.
4. Validar con datos reales que el número de llegadas tarde mostrado en Dashboard coincida con Registros para el periodo académico vigente.
5. Confirmar en ambiente central que un Monitor no pueda acceder mediante URL directa a módulos administrativos, además de tenerlos ocultos en el menú.
6. Verificar visualmente el flujo de carga de un PDF rechazado y su posterior corrección en distintos tamaños de pantalla.
7. Probar la renovación de sesión y el cambio entre perfiles para confirmar que la navegación y los permisos se actualicen correctamente.
8. Instalar o habilitar `bcrypt` en el entorno de pruebas para ejecutar la validación funcional de las pruebas Django incorporadas.
9. Revisar el comportamiento de consultas repetidas a `/api/v1/auth/me/` para evitar respuestas `429` durante navegación o apertura simultánea de sesiones.

## ESTADO FINAL

La experiencia del perfil Monitor quedó reforzada: sus sesiones no heredan permisos administrativos, Registros continúa disponible con información personal, las anotaciones se muestran correctamente y de forma consistente entre los módulos, y las notificaciones solo dirigen a secciones que el Monitor puede utilizar. Quedan pendientes la validación integral con datos reales, las pruebas responsive de todas las secciones y las validaciones funcionales bloqueadas por dependencias locales.
