# Informe 24 - Plataforma e Integración

**FECHA:** 09/09/2026  
AUTORES: 
Kevin Rincon 
Kaleth Molina Diaz y Carol Stefanya Velasco Rodriguez  
TURNO: 6:00 p. m. - 10:00 p. m.

## OBJETIVO

Continuar el endurecimiento funcional de la plataforma después de las pruebas Docker documentadas en el informe 23, mejorando los flujos administrativos, las integraciones de consulta, la trazabilidad de multas y la consistencia visual de los módulos operativos.

## AVANCES REALIZADOS

### 1. Gestión de usuarios, perfiles y permisos

* Se simplificó la administración de usuarios para evitar la duplicidad conceptual entre rol y cargo: el cargo queda como la entidad visible que concentra los permisos asignados.
* Se retiraron elementos de interfaz que no aportaban al flujo de creación y administración de cargos, se eliminó la visualización de dependencia vacía y se reorganizó el área de permisos para aprovechar mejor el espacio disponible.
* Los permisos asignables se ordenaron visualmente por módulo, facilitando su revisión por parte del administrador.
* Se revisó el permiso de Reportes y se eliminó la dependencia que no tenía uso efectivo en los flujos actuales.
* Se corrigió el modelo de autorización de Credenciales: editar la credencial o cambiar su contraseña depende de `CREDENCIALES_ACTUALIZAR`, mientras que asignar usuarios o roles autorizados se reserva para administradores.
* Se ajustó el modo de permisos del backend para que, por defecto, las rutas protegidas requieran el permiso correspondiente y no se habiliten de forma permisiva por ausencia de configuración.

### 2. Préstamos, prácticas libres y consultas de docentes

* Se reemplazó la búsqueda por cédula en los formularios de Préstamos Audiovisuales y Préstamos Docentes por búsqueda progresiva por nombre del docente.
* La lista de resultados se actualiza mientras se escribe; al presionar **Enter**, se selecciona el primer resultado disponible.
* Cuando no existe coincidencia, el flujo permite elegir explícitamente registrar otro docente y abre el modal de creación solo después de la acción del usuario.
* Se añadió el historial como sección intermedia en Préstamos Audiovisuales para separar los préstamos actuales del inventario.
* Se alineó la generación de fichas de Audiovisuales con la estructura por carpetas usada en Prácticas Libres, organizando los documentos por la persona que atendió.
* Las fichas audiovisuales incluyen en observaciones los elementos complementarios prestados, como HDMI o extensión, y la observación registrada cuando exista.
* Se ajustó Prácticas Libres para que los responsables disponibles sigan el mismo criterio de selección que Audiovisuales, sin incluir al administrador como responsable operativo.

### 3. Limpieza, dashboard y consistencia visual

* Se realizaron ajustes exclusivos al módulo Limpieza: se reemplazaron los términos Sala/Salas por Aula/Aulas y se hicieron clicables las selecciones de la barra lateral para abrir el modal correspondiente.
* Se uniformó la apariencia de los botones de sábado y domingo en los temas claro y oscuro, incluido el estilo aplicado al imprimir.
* En Dashboard se eliminó el bloque Estado de aulas solicitado, conservando el resto de indicadores y funcionalidades.
* En Horarios se restauró el control de fecha principal y se retiró únicamente la fecha duplicada bajo Periodo.
* Se ajustó la ubicación de fecha y hora del encabezado para mejorar su alineación visual en toda la plataforma.
* Se ampliaron y ajustaron los elementos de perfil para mejorar la experiencia de sesión: al permanecer inactivo cinco minutos se muestra un protector de pantalla con la foto y el nombre del usuario activo, sin alterar la sesión.

### 4. Tareas operativas y multas

* Se reforzó el cierre de tareas operativas: no es posible completar una tarea si no existe informe de seguimiento o si el informe conserva actividades pendientes. El sistema informa el motivo al usuario.
* Se mantuvo la agrupación de tareas por tarea y aulas seleccionadas para la gestión activa, y se separan los grupos por estado al quedar completadas o canceladas.
* Se incorporó la búsqueda masiva de multas mediante archivo XLSX con una única columna `Codigo`, mostrando si cada estudiante tiene multa activa, no tiene multa o no se encuentra registrado.
* Se añadió el acceso para descargar la plantilla de carga masiva desde el modal de Cargar multas.
* Se corrigió una inconsistencia de la carga masiva: la columna `Multa` aparecía como obligatoria aunque el importador nunca la procesaba. Ahora no se exige ni se incluye en la plantilla; `Multa sugerida` permanece opcional.
* Se agregó una prueba unitaria específica del importador sin columna `Multa`; la suite focalizada de Multas finalizó con 3 pruebas aprobadas.

### 5. Otros ajustes de integración

* Se corrigió la búsqueda de Software instalado por aulas para que consulte el catálogo completo y no solo los elementos de la página visible.
* Se mantuvieron los avisos temporales de éxito para evitar mensajes persistentes innecesarios y se preservan los errores hasta que el usuario pueda revisarlos.
* Se verificó la plantilla XLSX actualizada de multas: contiene Estudiante, Motivo, Fecha, Descripción, Multa sugerida y Estado; la fecha conserva el formato `AAAA-MM-DD` y Estado tiene los valores admitidos.

## FUNCIONA

* Los permisos de credenciales diferencian correctamente la edición de contraseña de la administración de autorizados.
* Las búsquedas de docentes de préstamos responden progresivamente por nombre y ofrecen una acción clara para registrar un docente inexistente.
* Las tareas no pueden completarse sin el informe de seguimiento requerido ni mientras conserven actividades pendientes.
* La plantilla e importador de multas ya no requieren una columna sin uso.
* La búsqueda masiva de multas procesa códigos de estudiantes e informa el estado encontrado para cada uno.
* El protector de pantalla se activa después de cinco minutos de inactividad y utiliza los datos del perfil actualmente autenticado.
* La prueba focalizada de Multas ejecutada con `npx jest src/multas/multas.service.spec.ts --runInBand` finalizó correctamente: 1 suite y 3 pruebas aprobadas.

## NO FUNCIONA / PENDIENTE DE VALIDAR

* La carga masiva histórica de multas puede contener códigos de estudiantes que no existen actualmente en la base de datos de Estudiantes. El importador los rechaza por fila para proteger la integridad referencial.
* No es correcto eliminar esos códigos de la migración ni crear multas desligadas de un estudiante, porque pueden corresponder a personas que regresen posteriormente o soliciten paz y salvo.
* Falta definir y validar una estrategia institucional de conciliación para dichos registros históricos: conservar el archivo de rechazos, identificar el código histórico y, cuando sea necesario, crear o reactivar el registro de estudiante mediante un proceso controlado antes de importar la multa. Esta decisión debe proteger el historial sin crear estudiantes ficticios automáticamente.
* Siguen pendientes los smoke tests de staging con secretos reales, la corrección de advertencias OpenAPI y la etapa de CI ya señaladas en el informe 23.

## NO MODIFICAR

* No volver a exigir en la carga de multas campos que el backend no procesa.
* No eliminar multas históricas ni códigos no encontrados únicamente para lograr que una migración finalice sin rechazos.
* No crear automáticamente estudiantes inexistentes desde el importador de multas sin una decisión y trazabilidad institucional.
* No otorgar a cargos no administradores la gestión de usuarios o roles autorizados de una credencial.
* No relajar el modo estricto de permisos del backend para ocultar errores de autorización.
* No permitir completar tareas operativas omitiendo su informe de seguimiento o sus actividades pendientes.

## SIGUIENTE PASO

* **Revisar la carga masiva de multas antes de migrarla:** identificar los códigos que no existen en la base de datos de Estudiantes, generar un reporte de conciliación y definir con la institución el procedimiento para preservar esos antecedentes sin eliminarlos. Los códigos pueden pertenecer a estudiantes que regresen o que posteriormente soliciten paz y salvo, por lo que deben conservarse como parte del histórico.
* Probar la migración en una copia de staging con un lote pequeño, incluyendo códigos existentes y no existentes, y validar el reporte de filas aceptadas y rechazadas.
* Continuar los smoke tests integrales de staging, la actualización de la prueba E2E pendiente y el endurecimiento de CI/OpenAPI descritos en el informe 23.

## ESTADO ACTUAL

La plataforma continúa integrada y operativa en sus flujos administrativos, de préstamos, tareas y multas. Se mejoró la coherencia entre permisos del frontend y backend, la consulta de docentes y el manejo de plantillas de importación. El principal riesgo pendiente para la migración es la correspondencia de códigos históricos de multas contra la base vigente de estudiantes; debe resolverse mediante conciliación controlada, no mediante eliminación de datos.
<>