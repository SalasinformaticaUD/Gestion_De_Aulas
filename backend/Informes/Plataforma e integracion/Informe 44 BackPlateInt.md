# Informe Plan de Integración 44 - Mejoras de disponibilidad, permisos y gestión de software

## Datos generales

- **Fecha:** 29/09/2026
- **Autores:** Edwin Alejandro Orjuela y Juan Esteban Cañón
- **Tipo de jornada:** Ajustes de interfaz, flujos de permisos e integración entre módulos operativos.

## Objetivo

Mejorar la claridad de los flujos de gestión operativa, disponibilidad de aulas y software instalado, reduciendo acciones redundantes y facilitando el acceso al detalle de cada aula.

## Actividades realizadas

### 1. Disponibilidad y tareas operativas

Se incorporó la pestaña **Tareas operativas** dentro de Disponibilidad. Las tareas se consultan por bloque, se agrupan por aula en orden ascendente y cuentan con acceso directo a la acción de revisión correspondiente. Se ajustaron los contenedores y su comportamiento en tema oscuro para diferenciar visualmente las tareas de cada aula.

También se retiraron los botones manuales de actualización de las vistas **Por bloque**, **Todo el día** y **Tareas operativas**. La información se actualiza al modificar los filtros y mediante refresco periódico, evitando controles redundantes.

### 2. Préstamos docentes

En el formulario de nueva solicitud se agregó la consulta de aulas liberadas por ausencia del docente asignado. El usuario puede alternar entre aulas completamente libres y aulas liberadas por ausencia, conservando la alternativa de regresar a las aulas completamente libres cuando no existan ausencias aplicables.

### 3. Gestión de cargos y permisos

Se ajustó el flujo de guardado de cargos para mostrar confirmación visual y limpiar el cargo seleccionado luego de aplicar los cambios. Además, una indisponibilidad temporal de la API de Monitores ya no reporta como fallido un cambio de permisos que fue guardado correctamente en la base principal; la sincronización pendiente queda registrada en el backend.

### 4. Préstamo de videobeams

Se eliminó el botón redundante **Agregar** del selector de videobeams. La selección se realiza desde la lista de coincidencias o mediante el escaneo del número interno con la tecla Enter, evitando mensajes erróneos originados por un botón sin una acción útil.

### 5. Catálogo de software instalado

Se retiró el botón **Buscar** del catálogo de software. La búsqueda se ejecuta mientras se escribe y consulta por nombre, versión o descripción.

La columna **Distribución** se simplificó para mostrar un único desplegable uniforme por software, sin cubos por aula. Esto reduce la carga visual cuando un programa está instalado en muchas aulas.

### 6. Instalación de software por aulas

La búsqueda combinada ahora muestra directamente debajo de cada aula compatible los programas seleccionados, junto con su versión, fecha de instalación y acción para retirarlos. Los programas no se muestran cuando no hay filtros seleccionados.

Se agregó la opción **Ver más**, que dirige a la sección **Aulas de Software**, abre el aula correspondiente y activa automáticamente la pestaña **Software instalado**.

## Validaciones realizadas

- Se verificó que los filtros de disponibilidad recargan la información sin requerir botones de actualización.
- Se confirmó que el backend compila después del ajuste de sincronización de cargos con Monitores.
- Se revisó el filtrado progresivo del catálogo de software y la navegación hacia el detalle de aulas.
- La compilación del frontend identificó errores TypeScript preexistentes en `GestionInconsistencias.tsx`, ajenos a los ajustes descritos en este informe.

## Conclusión

Se mejoró la navegación entre Disponibilidad, Software Instalado y Aulas de Software, reduciendo controles redundantes y haciendo más visible la información relevante para cada aula. También se fortaleció la confirmación de cambios de permisos para que una dependencia externa no genere una percepción incorrecta de fallo cuando el cambio principal ya fue persistido.
