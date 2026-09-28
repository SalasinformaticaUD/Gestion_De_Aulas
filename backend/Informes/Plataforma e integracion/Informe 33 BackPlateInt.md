# Informe Plan de Integración 33 - Consolidación funcional, visual y de integración de Gestión de Monitores

FECHA: 18/09/2026  
AUTOR: Pablo Garzon Gomez
HORARIO: 4:00 p.m. a 10:00 p.m.

## OBJETIVO DE LA JORNADA

Dar continuidad al Informe 32, consolidando los ajustes realizados desde las 6:00 p. m. en Gestión de Monitores: historial conciliado/rechazado, búsqueda global de monitores, unificación visual, perfil compartido, acceso entre aplicativos, excepciones, horas extra, actas e importaciones. También se estabilizó el acceso compartido entre Gestión de Aulas y Gestión de Monitores y se verificó el cumplimiento funcional de los requerimientos documentados.

## ALCANCE Y REGLA DE TRABAJO

* Se trabajó exclusivamente en ambiente local. No se modificó el despliegue ni se realizaron acciones sobre servicios productivos.
* Se conservó la arquitectura establecida en el Informe 32: Gestión de Aulas y Gestión de Monitores mantienen sus servicios y bases de datos separados.
* Las correcciones de la API de Monitores y sus pruebas se realizaron en `SoftwareHorasMonitores`; el frontend compartido y la documentación se conservaron en `Software Monitorias`.
* Las pruebas automatizadas utilizaron una base temporal aislada, por lo que no modificaron los datos locales de pruebas.

## TRABAJO REALIZADO

### Historial de asistencia, conciliación y paginación

* Se ajustó el historial reciente del panel para mostrar el estado funcional de cada registro: **Conciliado** o **Rechazado**.
* Se actualizó la consulta de historial para incluir únicamente registros que ya cuentan con resultado de conciliación, conservando el orden descendente de los registros más recientes.
* Se implementó paginación real desde la API de Monitores, con páginas de ocho registros, conteo total y controles **Anterior** y **Siguiente** en la interfaz.
* Se adecuó la tabla de historial al formato del aplicativo anterior de Gestión de Monitores: nombre crudo, dependencia, fecha en formato legible, estado y monitor responsable.
* Se diferenciaron visualmente los estados conciliados y rechazados para facilitar la revisión de resultados en el dashboard y en el módulo de conciliación.

### Búsqueda global y consulta de monitores

* Se reemplazó la antigua consulta por código, que redirigía al detalle de horas, por un filtro global dentro del panel de monitores.
* La búsqueda ahora filtra automáticamente la lista mientras se escribe, admitiendo coincidencias por código de estudiante o por nombre, sin distinguir mayúsculas, minúsculas ni acentos.
* Se conservó la agrupación por dependencia, se expanden los grupos que contienen coincidencias y se reinicia la paginación al cambiar la búsqueda.
* Se agregó la visualización del código bajo el nombre de cada monitor para facilitar la identificación en el listado.

### Homogeneización visual de indicadores

* Se unificó el estilo de las tarjetas métricas de las vistas de Monitores, Credenciales y Horarios.
* Los indicadores que antes solo mostraban una línea superior ahora incluyen fondos tonales, bordes de color y contraste consistente, siguiendo el diseño de las tarjetas de Monitores, Actas firmadas y Por firmar.
* Se ajustaron los estilos globales y de las vistas específicas para mantener la misma jerarquía visual sin afectar las funcionalidades existentes.

### Acceso entre aplicativos y perfil centralizado

* Se corrigió el cambio de Gestión de Aulas a Gestión de Monitores para conservar la sesión central, sin solicitar un inicio de sesión adicional cuando la cuenta tiene acceso a ambos aplicativos.
* Se identificó que el puente autenticado hacia Monitores era tratado como tráfico anónimo y agotaba el límite de solicitudes. Se excluyeron del límite público las rutas seguras de sincronización y traspaso de sesión, manteniendo la validación de JWT y token de servicio.
* Se evitó repetir el traspaso de sesión en cada navegación interna de Monitores. La sesión local se prepara una vez por sesión central y se reconstruye solamente si se pierde la cookie local.
* Se habilitó el enlace seguro de una cuenta histórica local de Monitores cuando coincide exactamente usuario y correo con la cuenta central, preservando sus registros y evitando duplicados.
* Se verificó que el perfil dentro de Monitores use la ruta propia `/gestion-monitores/perfil`, conservando la foto y contraseña centralizadas para ambas aplicaciones.
* Se agregó una indicación dentro del perfil para comunicar que la información de identidad se administra de forma centralizada.
* Los cambios de foto de perfil y contraseña se realizan sobre el usuario central de Gestión de Aulas; por ello se reflejan para una cuenta vinculada en ambos aplicativos sin importar desde cuál perfil se efectúe el cambio.
* Se eliminaron procesos locales duplicados de frontend y Monitores, dejando una sola instancia activa de cada servicio para evitar comportamientos inconsistentes.

### Cierre de requerimientos de Gestión de Monitores

* Se revisó el documento `docs/Requerimientos Gestion Monitores.md` y se contrastó cada requerimiento con la interfaz, las rutas REST y la lógica de la API de Monitores.
* Se agregó en **Horas extra** el apartado independiente **Asignar horas extra**, con selección de monitor, fecha, cantidad entre 0.01 y 24 horas y motivo. El registro se conserva como ajuste manual de horas virtuales, sin depender de una marcación pendiente.
* Se completó la interfaz de **Excepciones** para seleccionar los usuarios incluidos y los bloques horarios de dichos usuarios.
* Se agregó la opción **Todo el semestre académico**; al activarla se deshabilitan las fechas manuales y la API toma las fechas configuradas del semestre activo.
* Se amplió la tabla de excepciones registradas para mostrar usuarios, bloques, periodo semestral y estado calculado.
* Se corrigió un error de API en Excepciones: los campos opcionales omitidos, como la descripción, ahora reciben valores explícitos y producen validaciones controladas en lugar de un error interno.
* Se mejoró **Actas de compromiso** para actualizar automáticamente la información al volver a la pestaña y cada minuto, además de actualizar de forma inmediata la fila al aceptar o rechazar un acta.

### Importaciones y protección de datos de prueba

* Se verificó el flujo de importación masiva de monitores y horarios con archivos Excel reales generados durante las pruebas.
* Se incorporaron validaciones de encabezados requeridos y opcionales para que los errores de plantilla sean informativos y no generen registros incompletos.
* Las validaciones automatizadas se ejecutaron contra una base aislada para evitar alterar los registros locales utilizados por el equipo durante las pruebas funcionales.

### Validaciones y pruebas automatizadas

* Se agregaron pruebas end-to-end aisladas para importar monitores desde un archivo Excel `.xlsx`, con encabezados requeridos y opcionales.
* Se agregaron pruebas end-to-end aisladas para importar horarios desde un archivo Excel `.xlsx`.
* Se validó la creación de excepciones para todo el semestre, incluyendo usuarios y bloques horarios asociados.
* Se validó que un líder no pueda crear excepciones fuera de su dependencia.
* Se validaron las acciones de Actas: un administrador puede aceptar y rechazar; un líder de otra dependencia y un monitor no pueden revisar actas fuera de su alcance.
* Se validó la asignación manual de horas extra mediante el flujo de anotaciones de horas virtuales.
* Se actualizó el documento de requerimientos para reflejar los elementos implementados y validados automáticamente, sin dejar casillas pendientes.

### Trazabilidad técnica de los ajustes

* Se modificaron las vistas y servicios de asistencia, reportes, horarios, excepciones, anotaciones y sincronización de la API de Monitores.
* Se ajustaron los componentes del panel, conciliación, revisión de horas extra, gestión de excepciones, reportes, perfil, inicio de sesión y controles de acceso del frontend.
* Se actualizaron los contratos y adaptadores del frontend para transportar usuarios, bloques, periodo semestral y estado de excepciones de manera consistente entre interfaz y API.
* Se documentaron y probaron los cambios en el repositorio de Monitores sin realizar modificaciones en el despliegue institucional.

## VALIDACIONES REALIZADAS

* Compilación de producción del frontend completada correctamente mediante `npm run build`.
* Suite de pruebas de Monitores ejecutada con éxito: **14 pruebas aprobadas**, cubriendo asistencia, importaciones, horarios, excepciones, actas, anotaciones y usuarios.
* Validación de Django sin incidencias mediante `manage.py check`.
* Verificación de servicios locales activos:
  * Frontend: `http://localhost:3002`.
  * API de Gestión de Aulas: `http://localhost:3001`.
  * API local de Monitores: `http://localhost:8000`.

## PRÓXIMOS PASOS

1. Realizar aceptación manual con datos institucionales en los módulos de Horas extra, Excepciones, Actas e importaciones masivas.
2. Validar el flujo de cambio entre aplicativos con una cuenta habilitada en Aulas y Monitores, incluyendo actualización de contraseña y foto de perfil desde ambos perfiles.
3. Comprobar que el semestre activo en Monitores tenga fechas de inicio y fin configuradas antes de usar la opción **Todo el semestre académico**.
4. Mantener una sola instancia local de frontend y Monitores durante las pruebas para evitar duplicidad de solicitudes o sesiones.
5. No realizar commit ni despliegue hasta finalizar la aceptación funcional manual con los datos de prueba definidos por el equipo.

## ESTADO FINAL

La jornada dejó consolidada la experiencia de Gestión de Monitores desde las 6:00 p. m.: historial paginado con estados conciliado/rechazado, búsqueda global de monitores, tarjetas visuales unificadas, perfil centralizado, navegación autenticada entre aplicativos, horas extra manuales, excepciones completas, actualización de actas e importaciones validadas. Además, se eliminó el bloqueo por regulación de solicitudes del puente de sesión y se completaron los requerimientos documentados. Queda pendiente únicamente la aceptación manual con datos institucionales antes de cualquier despliegue.
