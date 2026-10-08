# Informe Plan de Integración 45 - Permiso de horario de monitores y ajustes operativos previos al despliegue

## Datos generales

- **Fecha:** 08/10/2026
- **Autor:** Juan Esteban Cañon Solorza
- **Tipo de jornada:** Ajustes funcionales, integración entre servicios, control de permisos y preparación de despliegue incremental.
- **Estado:** Cambios implementados y validados localmente. Pendiente despliegue controlado en el servidor.

## Objetivo

Preparar una entrega incremental que mejore la visualización de solicitudes de aulas, flexibilice los flujos de Prácticas Libres y Préstamos Docentes, e incorpore una consulta independiente del horario de Monitores Aulas de Software desde Gestión de Aulas. La consulta debe poder ser autorizada mediante cargos y permisos, sin requerir que el usuario tenga una cuenta ni acceso completo al aplicativo de Gestión de Monitores.

## Alcance de la jornada

El trabajo se realizó sobre los proyectos **Software Monitorias** y **SoftwareHorasMonitores**. Se conservaron las bases de datos separadas y la comunicación entre aplicaciones se mantuvo mediante API e integración interna autenticada; no se implementó acceso directo entre bases de datos.

## Actividades realizadas

### 1. Estado visual de solicitudes en aulas

Se ajustó la representación visual de las aulas disponibles al crear una nueva Práctica Libre o un Préstamo Docente. Cuando ya existe una solicitud pendiente para el mismo contexto de aula y franja, el aula ya no se presenta como completamente libre en color verde. En su lugar, se muestra en color amarillo y presenta la etiqueta **Solicitado** debajo de su bloque.

El cambio es visual y no altera las reglas de aprobación, reserva ni disponibilidad ya existentes. Su propósito es advertir al usuario que puede existir una solicitud en proceso y disminuir la posibilidad de asignaciones cruzadas por falta de contexto visual.

### 2. Proyecto curricular en Prácticas Libres y Préstamos Docentes

Se retiró la condición que impedía continuar los flujos de Prácticas Libres y Préstamos Docentes cuando el docente no estaba vinculado a un proyecto curricular. Los formularios conservan los demás datos y validaciones requeridos, pero el proyecto curricular deja de ser una condición obligatoria para estas solicitudes.

### 3. Permiso para consultar el horario de monitores

Se creó el permiso interno:

```text
DASHBOARD_VER_HORARIO_MONITORES
```

En la administración de cargos se presenta con la etiqueta:

```text
DASHBOARD - VER HORARIO MONITORES
```

El permiso pertenece al módulo Dashboard y puede asignarse desde **Usuarios > Cargos y permisos**. La migración inicial lo asigna al rol `ADMINISTRADOR`, pero el administrador puede concederlo posteriormente a otros cargos, por ejemplo, Análisis de Datos.

La migración asociada es:

```text
20261008170000_dashboard_monitor_schedule_permission
```

Esta migración es aditiva: crea o actualiza el permiso y registra su relación inicial con el rol administrador. No elimina usuarios, roles, permisos ni datos operativos.

### 4. Botón de consulta desde Gestión de Aulas

En el Dashboard de Gestión de Aulas se agregó el botón **Ver horario monitores**. El botón solo aparece cuando la sesión del usuario contiene el permiso `DASHBOARD_VER_HORARIO_MONITORES`.

Para evitar que los cambios de cargos dependan de una sesión antigua, el Dashboard consulta la identidad actual al cargar y actualiza los permisos conservados en la sesión. De esta forma, después de guardar un cargo y actualizar el Dashboard, la visibilidad del botón se ajusta con la información vigente del backend central.

Los usuarios que no tienen el permiso no ven el botón. Si intentan abrir manualmente la ruta independiente, el sistema los devuelve al Dashboard de Gestión de Aulas con la notificación de acceso denegado.

### 5. Previsualización independiente del horario

Inicialmente la consulta se alojaba dentro de las rutas de Gestión de Monitores. Esto ocasionaba que un usuario con permiso en Aulas, pero sin cuenta local de Monitores, fuera enviado al inicio de sesión de ese aplicativo.

Se separó la funcionalidad en la ruta independiente:

```text
/horario-monitores
```

La ruta no hereda el guardia de acceso general de Gestión de Monitores. Conserva una validación específica del permiso de Dashboard y utiliza una presentación aislada que solo expone la consulta autorizada.

La previsualización conserva el filtro por defecto para la dependencia **Monitores Aulas de Software** (`informatics_labs`) y permite las interacciones de consulta del calendario, como seleccionar un monitor, filtrar su horario y revisar el detalle de cada bloque.

### 6. Integración segura de solo lectura con Monitores

Para permitir la consulta sin crear una cuenta local de Monitores, se implementó una integración de solo lectura entre los dos servicios:

1. El frontend solicita la previsualización al backend central de Aulas usando la sesión del usuario.
2. El backend central exige `DASHBOARD_VER_HORARIO_MONITORES` antes de continuar.
3. El backend de Aulas consume la ruta interna de Monitores usando `MONITORES_SERVICE_TOKEN`.
4. La API de Monitores devuelve exclusivamente el calendario y los datos requeridos para construir la previsualización de la dependencia `informatics_labs`.
5. El frontend muestra el resultado sin iniciar sesión ni cambiar de aplicativo.

La nueva ruta interna de Monitores es:

```text
GET /api/v1/platform/aulas-schedule-preview/
```

Esta ruta no es pública: valida el encabezado `X-Monitores-Service-Token`. La autorización del usuario final continúa siendo responsabilidad del backend central de Aulas.

### 7. Simplificación final de la vista independiente

Después de validar la navegación, se retiraron de la previsualización los apartados **Horas extra por aprobar** y **Anotaciones recientes**. La vista independiente ahora muestra exclusivamente el horario semanal de Monitores Aulas de Software, junto con los controles necesarios para consultarlo.

Se conserva el botón **Volver**, que retorna al Dashboard de Gestión de Aulas y preserva el contexto visual de retorno del usuario.

## Componentes intervenidos

### Gestión de Aulas

- Dashboard y control de sesión para la visibilidad del permiso.
- Administración de Usuarios y Cargos para la selección del permiso.
- Prácticas Libres y Préstamos Docentes para la indicación visual `Solicitado` y el ajuste de proyecto curricular.
- Módulo de integración con Monitores para la consulta autorizada de la previsualización.
- Migración Prisma para el nuevo permiso.

### Gestión de Monitores

- Ruta interna de plataforma para entregar la previsualización de horarios.
- Validación del token de servicio para impedir consultas externas no autorizadas.
- Consulta limitada a Monitores Aulas de Software y orientada a lectura.

## Validaciones realizadas

- Compilación del backend central de Aulas: exitosa.
- Compilación del frontend de Aulas: exitosa.
- Validación de ESLint sobre los componentes modificados: exitosa, sin errores en los archivos intervenidos.
- Comprobación de Django mediante `python manage.py check`: exitosa.
- Comprobación de la integración interna de previsualización: exitosa; la ruta devolvió información de Dashboard, horarios y monitores de la dependencia de Aulas de Software.
- Verificación de la nueva ruta de frontend `/horario-monitores`: incluida en la compilación de producción.
- Verificación de que la vista independiente no contiene las tarjetas de horas extra ni anotaciones recientes.

## Consideraciones para el despliegue

- El despliegue debe ser incremental.
- Se deben construir y publicar imágenes nuevas para backend, migraciones, frontend, renderizador PDF y API de Monitores.
- La API de Monitores debe actualizarse antes que el backend central de Aulas, porque Aulas depende de la nueva ruta interna de previsualización.
- Posteriormente se debe ejecutar el contenedor `aulas-migrate` para aplicar `20261008170000_dashboard_monitor_schedule_permission`.
- No se deben restaurar bases de datos, ejecutar seeds, reemplazar directorios `media`, eliminar volúmenes ni usar `docker compose down -v`.
- La variable `MONITORES_SERVICE_TOKEN` debe estar configurada y ser consistente en los servicios que participan en la integración.

## Pruebas de aceptación recomendadas después del despliegue

1. Ingresar como administrador y confirmar que el permiso aparece en la administración de cargos.
2. Asignar el permiso a un cargo no administrativo, por ejemplo Análisis de Datos.
3. Asignar ese cargo a un usuario sin cuenta ni acceso general a Gestión de Monitores.
4. Iniciar sesión con dicho usuario y confirmar que ve el botón **Ver horario monitores** en Gestión de Aulas.
5. Confirmar que al abrirlo se navega a `/horario-monitores`, sin solicitar inicio de sesión de Monitores.
6. Confirmar que solo se muestra el horario de Monitores Aulas de Software y que están ocultas las tarjetas de horas extra y anotaciones.
7. Confirmar que el botón **Volver** regresa al Dashboard de Gestión de Aulas.
8. Verificar que un usuario sin el permiso no vea el botón ni pueda abrir directamente la ruta.
9. Crear solicitudes en Prácticas Libres y Préstamos Docentes para comprobar la marca amarilla `Solicitado` en las aulas que tienen solicitudes pendientes.
10. Comprobar que los flujos de solicitud continúan funcionando cuando el proyecto curricular no está vinculado.

## Conclusión

La entrega prepara una mejora de consulta operativa con control de acceso granular: el horario de Monitores Aulas de Software puede ser visualizado desde Gestión de Aulas por cargos autorizados, sin extender acceso al aplicativo completo de Monitores ni exigir la existencia de una cuenta local en ese servicio. En paralelo, se fortaleció la comunicación visual sobre solicitudes de aulas y se simplificaron condiciones que bloqueaban los flujos de Prácticas Libres y Préstamos Docentes.

Los cambios están validados localmente y documentados para un despliegue incremental. El siguiente paso es ejecutar el procedimiento de publicación, aplicar la migración de permisos y realizar las pruebas de aceptación en el servidor.
