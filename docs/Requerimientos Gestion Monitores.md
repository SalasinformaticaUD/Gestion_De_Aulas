# Gestión Monitores — Requerimientos y estado de implementación

Este documento incorpora los requerimientos entregados para Gestión de Monitores. Las casillas se marcaron únicamente cuando la funcionalidad está implementada en el proyecto actual; las que permanecen sin marcar requieren desarrollo, validación funcional o integración adicional.

> **Nota importante:** no se deben iniciar nuevos cambios ni mejoras visuales en un módulo hasta que sus funcionalidades requeridas estén completamente implementadas, integradas con la API y comprobadas mediante pruebas funcionales. La prioridad es terminar y validar cada módulo antes de ampliar su diseño.

## Gestión Monitores general

- [x] Corregir el menú hamburguesa.
- [ ] Agregar un apartado para asignar horas extra, independiente de la revisión de horas extra pendientes.

## Módulo Monitores

- [x] Cambiar “Registrar monitor” por **Crear y enviar activación**.
- [x] Agregar los botones **Cargar Excel**, **Iniciar semestre nuevo** y **Nuevo monitor** en el dashboard.
- [x] Agregar la acción **Eliminar monitor** con confirmación mediante contraseña.
- [x] Agregar la acción **Editar**.
- [x] Agregar la acción **Reenviar correo**.
- [x] Mostrar el apartado de carga masiva y las instrucciones de encabezados en inglés o español.
- [x] Mostrar los campos requeridos: email/correo, full_name/nombre completo, codigo_estudiante/código estudiante y department/dependencia.
- [x] Mostrar los campos opcionales documentados: numero_documento, proyecto_curricular y telefono/phone.
- [x] Mostrar la confirmación de monitores que repetirán monitorias y el control de archivo Excel `.xlsx`.
- [ ] Ejecutar y validar de extremo a extremo el procesamiento de carga masiva de monitores con un archivo Excel real.

## Módulo Horarios

- [x] Agregar los accesos **Calendario** y **Nuevo horario** en la parte superior.
- [x] Incluir Asignatura, Grupo, Docente y Proyecto curricular al asignar horario.
- [x] Conservar Grupo y Docente como campos opcionales.
- [x] Mostrar el campo Día en los horarios registrados.
- [x] Cambiar la acción de desactivar por **Editar**.
- [x] Mostrar el apartado de carga masiva con los encabezados requeridos, opcionales y archivo Excel `.xlsx`.
- [ ] Ejecutar y validar de extremo a extremo la importación masiva de horarios desde Excel.
- [x] Agregar Calendario semanal al final del módulo.
- [x] Mostrar en el Calendario semanal los horarios registrados del monitor seleccionado.

## Módulo Horas extra

- [x] Incluir filtros en cuadros para Monitor, Fecha y Horas extra por aprobar (h).
- [x] Agregar el botón **Limpiar** para restablecer filtros.
- [x] Mostrar dinámicamente los registros debajo de los filtros.
- [x] Mostrar nombre del monitor, fecha, cantidad de horas y el botón **Ver registro**.
- [x] Incluir el panel **Decisión** con opciones Aprobar y Rechazar.
- [x] Incluir el campo de anotación y exigirlo cuando se rechaza un registro.
- [x] Incluir la opción de penalizar al monitor y su explicación.
- [x] Incluir el botón **Guardar** y aplicar la decisión al registro seleccionado.
- [x] Mantener los valores del panel dinámicos por cada registro.

## Módulo Memorandos

- [x] Agregar minidashboard de memorandos.
- [x] Agregar filtros de Estado y Dependencia con botón **Filtrar**.
- [x] Mostrar las secciones/columnas Monitor, Retardos, Correo actual, Envío, PDF y Acciones.
- [x] Mostrar en Monitor nombre completo, código y tipo/dependencia.
- [x] Mostrar cantidad de retardos, correo y último envío cuando está disponible.
- [x] Mostrar estado de envío Enviado o Pendiente.
- [x] Agregar acción para abrir el PDF.
- [x] Agregar acción para reenviar el memorando.

## Módulo Actas

- [x] Agregar el título **Actas de compromiso** y su descripción.
- [x] Mostrar indicadores dinámicos de monitores, actas firmadas y pendientes de firma.
- [x] Agregar búsqueda por nombre, correo o código.
- [x] Agregar filtros de estado y dependencia con datos disponibles en la información consultada.
- [x] Agregar el botón **Descargar firmadas** según los documentos firmados disponibles.
- [x] Agregar la sección **Seguimiento de firmas** y su descripción.
- [x] Mostrar una tabla de datos procedentes de la API con Monitor, Código, Correo, Dependencia, Estado, Archivo firmado y Acciones.
- [x] Mostrar datos dinámicos de monitor, código, correo, dependencia, estado y archivo.
- [x] Permitir visualizar y descargar el PDF disponible.
- [x] Mostrar acciones de revisión según el estado del acta.
- [x] Mostrar un contador de resultados calculado sobre la consulta.
- [x] Agregar paginación dinámica específica para la tabla de actas cuando haya múltiples páginas.
- [ ] Verificar con registros reales la actualización automática después de generar, firmar, aceptar, rechazar, eliminar o modificar un acta.
- [ ] Verificar la aplicación de permisos por rol para cada acción de acta.

## Módulo Históricos

- [x] Agregar el encabezado **SEMESTRES ARCHIVADOS**.
- [x] Agregar el título **Históricos de monitorias**.
- [x] Agregar la descripción de consulta por dependencia y semestre.
- [x] Agregar los controles de dependencia: Monitores Física, Monitores Aulas de Software y Monitores Laboratorios.
- [x] Agregar selección de semestre.
- [x] Mostrar indicadores de Registros, Horas extra y Anotaciones para la selección actual.
- [x] Agregar **Exportar el consolidado**.
- [x] Mostrar tabla con Semestre, Monitor, Dependencia, Normales, Extra, Aprobadas, Total y Restantes.

## Módulo Conciliación

- [x] Mostrar el contador dinámico “Mostrando X registros visibles.”
- [x] Conservar los filtros Nombre crudo, Dependencia, Fecha y Motivo.
- [x] Agregar botón **Limpiar** para reiniciar filtros.
- [x] Renombrar la columna “Asignar monitor” a **Acción**.
- [x] Permitir seleccionar y vincular un monitor a cada registro.
- [x] Mostrar “No hay registros pendientes.” cuando no hay resultados.
- [x] Mostrar paginación con “Página X de Y - Z registro(s)”.
- [x] Incluir botones **Anterior** y **Siguiente**.

## Módulo Anotaciones

- [x] Mostrar contador con el total de anotaciones realizadas.
- [x] Incluir el campo Tipo de anotación con “Olvido de registro” y otras novedades.
- [x] Cambiar el rótulo Fecha por **Fecha de la novedad**.
- [x] Mostrar el texto de ayuda requerido en “Horas a ajustar (h)” y limitar explícitamente el rango a 0.01–24 horas.
- [x] Agregar el botón **Registrar anotación**.
- [x] Agregar filtros de historial: Buscar monitor, Tipo y Acción.
- [x] Agregar la columna **Registro** al historial.
- [x] Mostrar Fecha, Monitor, Tipo, Acción, Ajuste, Motivo y Gestión en el historial.
- [x] Mostrar nombre y código del monitor.
- [x] Mostrar la operación y el ajuste de horas.
- [x] Mostrar de forma explícita quién realizó la gestión en cada fila.
- [x] Agregar acciones **Editar** y **Eliminar**.
- [x] Agregar paginación con página, cantidad de registros, Anterior y Siguiente.
- [x] Mantener el mensaje sobre el impacto de los cambios en reportes, dashboard y consulta pública.
- [x] Actualizar el contador local al agregar, editar o eliminar una anotación.

## Módulo Inconsistencias

- [x] Agregar los indicadores Por conciliar y Errores marcación.
- [x] Agregar la sección Errores automáticos de marcación y la descripción de tipos de inconsistencia.
- [x] Agregar tabla con Monitor, Fecha, Marcación, Error y Gestión.
- [x] Agregar “Crear anotación de solución”, Motivo de invalidación e Invalidar registro.
- [x] Agregar el detalle “Marcaciones y horarios cercanos”.
- [x] Mostrar día, fecha, horario, horas, asignatura, marcaciones, estados, relaciones y duplicados.
- [x] Identificar visualmente Emparejado y Duplicado ignorado.
- [x] Permitir gestionar mediante anotación de solución o invalidación y conservar monitor/dependencia en el detalle.

## Módulo Excepciones

- [x] Mostrar información de estados de las excepciones y calcular el estado según vigencia y activación.
- [x] Ajustar los nombres de estado solicitados exactamente a Activa, Próxima a iniciar, Finalizada e Inactiva.
- [ ] Agregar usuarios incluidos y bloques horarios en Nueva excepción.
- [ ] Agregar la casilla **Todo el semestre académico** y deshabilitar las fechas al seleccionarla.
- [ ] Mostrar Usuarios y Bloques en Excepciones registradas.
- [x] Incluir acciones **Editar** y **Eliminar** en las excepciones registradas.

## Validación pendiente general

- [ ] Recorrer y comprobar módulo por módulo con datos reales y roles de administrador, líder y monitor antes de realizar el commit o despliegue.
