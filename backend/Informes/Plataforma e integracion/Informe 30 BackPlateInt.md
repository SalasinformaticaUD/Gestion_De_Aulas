# Informe Plan de Integracion 30 - Incorporacion funcional de Gestion de Monitores

FECHA: 16/09/2026  
AUTOR: Julian Romero  
HORARIO: 12:00 p.m. a 6:00 p.m.

## OBJETIVO DE LA JORNADA

Comparar los módulos de Gestión de Monitores disponibles en el software de referencia con el proyecto `Software Monitorias` que se encuentra en desarrollo. A partir de esa comparación se inició la incorporación funcional y visual de los flujos requeridos en el frontend actual, conservando la integración existente con la API de Gestión de Monitores.

## ALCANCE Y CONTROL DE RAMAS

* La comparación se realizó entre la funcionalidad propuesta para Gestión de Monitores y la implementación actual de `Software Monitorias`.
* Se trabajó sobre la rama de integración `gestion-monitores`.
* La rama `version-2.0` no se modificó.
* No se realizaron commits, merges, rebases ni pushes durante la jornada.
* Se inició la implementación en el proyecto en desarrollo; los cambios quedan preparados para revisión funcional antes de aprobar un commit.

## COMPARACION E INCORPORACION INICIAL

Se revisaron las pantallas, datos solicitados y acciones necesarias en los módulos de Monitores, Horarios, Horas extra y Memorandos. La comparación permitió identificar campos y controles que no estaban visibles o no estaban conectados al flujo actual.

La incorporación se orientó a reutilizar los contratos REST de la API de Monitores y evitar duplicar lógica del software de referencia. Cuando la API ya expone la información necesaria, la interfaz la consume directamente; cuando la vista necesita datos complementarios, como dependencia y tipo de monitor, se relaciona el memorando con el directorio de monitores disponible en la API.

## MODULO MONITORES

Se continuó el ajuste del directorio y de las acciones administrativas de monitores:

* El formulario de registro se presentó como **Crear y enviar activación**.
* Se mantuvieron las opciones para crear monitor, cargar archivo Excel e iniciar un semestre nuevo en el panel superior.
* Se incorporaron acciones de editar, reenviar correo, desactivar y eliminar monitor.
* La eliminación requiere verificación de contraseña desde Gestión de Aulas antes de ejecutarse.
* Se ajustaron los estados hover de las acciones para mejorar la identificación visual.
* Se dejó visible la especificación de carga masiva con encabezados admitidos, campos obligatorios y opcionales, confirmación de monitores repetidores y procesamiento de archivo `.xlsx`.

Adicionalmente, se revisó el flujo de creación y activación de cuentas. La API crea el perfil local, solicita la provisión central y genera el correo de activación. La entrega final del correo depende de la aceptación del proveedor SMTP y de la bandeja de destino; por ello debe verificarse con una cuenta institucional real durante las pruebas funcionales.

## MODULO HORARIOS

Se inició la incorporación de los elementos operativos requeridos para horarios:

* Se agregaron accesos de **Calendario** y **Nuevo horario** en el encabezado del módulo.
* El formulario de horario incluye asignatura, grupo, docente y proyecto curricular; grupo y docente se identificaron como opcionales.
* El listado de horarios muestra el día y reemplaza la acción de desactivación por edición.
* Se añadió la estructura de carga masiva para archivos Excel, con validación documental de columnas, días, rangos horarios, ubicación y campos opcionales.
* Se ajustó el Calendario semanal para seleccionar un monitor con horario activo y mostrar los bloques registrados de dicho monitor.

## MODULO HORAS EXTRA

Se reestructuró el módulo de revisión de horas extra para que cada registro pueda gestionarse de forma independiente:

* Se agregaron filtros en cuadros para Monitor, Fecha y Horas extra por aprobar, junto con la acción **Limpiar**.
* El listado muestra monitor, fecha, horas solicitadas y el enlace **Ver registro**.
* Cada fila contiene un panel de decisión dinámico con las opciones Aprobar y Rechazar.
* Al seleccionar rechazo, la anotación es obligatoria y el sistema impide guardar sin ella.
* Se incorporó la opción de penalizar al monitor en caso de rechazo, con su mensaje explicativo.
* La acción Guardar utiliza el endpoint de revisión de horas extra y actualiza el estado del registro en pantalla.

## MODULO MEMORANDOS

Se inició y completó la adaptación del listado de memorandos generados:

* Se agregó un minidashboard con cantidad de memorandos generados, enviados, pendientes y retardos acumulados.
* Se incorporaron filtros por estado y dependencia, aplicados mediante el botón **Filtrar**.
* El listado presenta las columnas Monitor, Retardos, Correo actual, Envío, PDF y Acciones.
* La información del monitor reúne nombre completo, código de estudiante y tipo/dependencia.
* El correo actual muestra la dirección usada y el último envío registrado.
* El estado de entrega se identifica como **Enviado** o **Pendiente**.
* El botón **Abrir PDF** consulta el documento generado por la API en una pestaña nueva.
* El botón **Reenviar** usa la acción REST correspondiente y refresca la fila con el resultado actualizado.

## VALIDACIONES REALIZADAS

Se ejecutaron validaciones de compilación del frontend después de las modificaciones funcionales y visuales:

```powershell
cd Frontend
npm run build
```

Resultado:

```text
Compiled successfully
Finished TypeScript
Generating static pages: 36/36
```

La compilación finalizó correctamente e incluyó las rutas de Gestión de Monitores, Horarios, Horas extra y Memorandos.

## PENDIENTES

* Probar en navegador cada flujo con datos reales y con los roles de administrador, líder y monitor.
* Validar la entrega de correos de activación y reenvío en una bandeja institucional, incluyendo Spam y Promociones.
* Ejecutar una carga masiva real de monitores y horarios con archivos Excel de prueba controlados.
* Confirmar que los horarios importados y creados manualmente aparezcan en el Calendario semanal.
* Verificar la apertura de PDF y el reenvío de memorandos desde el navegador con documentos existentes.
* Recorrer módulo por módulo el proceso completo antes de aprobar el commit o un despliegue.

## ESTADO FINAL

Durante el turno de 12:00 p.m. a 6:00 p.m. se comparó la propuesta de Gestión de Monitores con el software que se está desarrollando y se inició su implementación en la rama de integración. Quedaron incorporados y compilados los ajustes principales de Monitores, Horarios, Horas extra y Memorandos.

El siguiente paso es realizar la comprobación funcional módulo por módulo con usuarios y datos reales, corregir los hallazgos que aparezcan y solo después aprobar el commit de los cambios preparados.
