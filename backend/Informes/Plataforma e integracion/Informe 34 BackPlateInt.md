# Informe Plan de Integración 34 - Validación integral y escenarios de prueba para Gestión de Monitores

FECHA: 19/09/2026  
AUTOR: Kaleth Molina  
HORARIO: 6:00 a.m. a 12:00 m.

## OBJETIVO DE LA JORNADA

Dar continuidad a los Informes 32 y 33 mediante la validación funcional integral de Gestión de Monitores en ambiente local, el ajuste de los filtros de monitores y horarios, la consolidación del histórico de actas y la preparación de datos de prueba realistas para comprobar memorandos, retrasos, horas extra, inconsistencias y conciliación.

## ALCANCE Y REGLA DE TRABAJO

* El trabajo se realizó exclusivamente en el ambiente local de desarrollo. No se modificó el despliegue, la infraestructura institucional ni los servicios productivos.
* Se revisó el aplicativo de Gestión de Monitores módulo por módulo, validando navegación, filtros, tablas, formularios, mensajes, permisos y flujos disponibles con la información local.
* Los escenarios de prueba se prepararon para la base local de Monitores y para el importador de asistencia; no reemplazan ni eliminan información institucional.
* Se mantuvo la integración ya implementada con Gestión de Aulas, conservando el perfil y el acceso centralizado entre aplicativos.

## TRABAJO REALIZADO

### Recorrido funcional integral del aplicativo

* Se realizó una visita de validación módulo por módulo en Gestión de Monitores: panel principal, monitores, horarios, asistencia, conciliación, importaciones, inconsistencias, horas extra, excepciones, memorandos, actas, históricos, usuarios y perfil.
* Se verificaron los recorridos de consulta, búsqueda, filtros, paginación, creación, edición, eliminación controlada, mensajes temporales y navegación interna.
* Se revisó que los mensajes de éxito, error e información mantengan el comportamiento temporal incorporado previamente: se desvanecen de forma automática y su cierre se pausa cuando el usuario mantiene el cursor sobre el aviso.
* Se contrastaron los flujos disponibles con los requerimientos de Gestión de Monitores y con el comportamiento esperado para el periodo académico activo.

### Actas de compromiso: periodo actual e histórico

* Se ajustó la consulta principal de Actas de compromiso para mostrar de forma predeterminada únicamente monitores activos pertenecientes al periodo académico vigente.
* Se consolidó la separación visual entre **Gestión actual** e **Historial**, evitando que los monitores de semestres anteriores aparezcan en el listado operativo del acta actual.
* Se incorporó en el histórico la selección explícita del periodo académico que se desea consultar.
* El selector histórico excluye el periodo académico activo, puesto que este debe revisarse desde la gestión actual y no desde el histórico.
* Se mantuvo la consulta de información y estados de actas de periodos anteriores sin habilitar acciones de revisión sobre registros históricos.

### Estado de monitores y activación de cuentas

* Se consolidó el manejo de tres estados funcionales para los monitores: **Activo**, **Pendiente** e **Inactivo**.
* Un monitor creado para el periodo actual queda en estado **Pendiente** cuando ya se envió el correo de activación pero todavía no ha definido su contraseña.
* Una vez el usuario activa su cuenta, su estado pasa a **Activo**.
* Se ajustó el flujo para monitores que repiten monitoría: cuando existe una cuenta previa válida, el sistema los registra directamente como activos y evita el reenvío innecesario del correo de activación.
* Se agregó la comunicación correspondiente para informar al administrador que el monitor es recurrente y que conservará su cuenta activa.

### Filtros de Monitores y Horarios

* Se mantuvo en el módulo de Monitores el filtro predeterminado de monitores activos.
* Se ajustó el módulo de **Horarios** para que también inicie mostrando los horarios asociados a monitores activos.
* El filtro de Horarios ahora se denomina **Estado del monitor**, con opciones para monitores activos, inactivos o todos.
* Al seleccionar **Todos**, los horarios se ordenan primero por monitores activos y después por monitores inactivos; dentro de cada grupo se ordenan por nombre, día y hora.
* El filtro toma el estado real del monitor y no solamente el estado individual del turno, evitando confusiones entre un horario suspendido y un monitor inactivo.

### Datos de prueba para asistencia y control de novedades

* Se analizó el archivo de ejemplo de registros de asistencia suministrado, identificando su estructura de marcaciones, usuario, fecha/hora, operación, turno y dispositivo.
* Debido a que el importador de Gestión de Monitores acepta archivos `.xlsx` o `.xlsm`, se generó una plantilla de pruebas compatible en formato `.xlsx`, sin modificar el archivo original de referencia.
* Se prepararon horarios locales de prueba para que las marcaciones puedan ser procesadas por las reglas reales de asistencia.
* Se añadieron escenarios de asistencia normales para comprobar el cálculo y la conciliación de horas regulares.
* Se añadieron tres llegadas tarde de un mismo monitor para activar el caso de generación de memorando por reincidencia de retrasos.
* Se añadieron jornadas que exceden el horario asignado para generar horas extra pendientes de revisión.
* Se incluyeron marcaciones de entrada y salida de duración anormalmente corta para probar inconsistencias de pares incompletos o inválidos.
* Se incluyó una marcación sin salida para comprobar el tratamiento de registros impares o incompletos.
* Se incluyó una marcación de un usuario no registrado para validar los casos que requieren conciliación o revisión manual.
* Con estos datos se cubren los flujos principales de importación, cálculo de sesiones, retrasos, memorandos, horas extra, inconsistencias y conciliación, sin depender de registros institucionales reales.

### Revisión de integración y estabilidad local

* Se verificó que la información del perfil continúe centralizada entre Gestión de Aulas y Gestión de Monitores para cuentas vinculadas.
* Se revisó el comportamiento de acceso y navegación entre aplicativos para preservar el uso de la sesión central existente.
* Se mantuvo la recomendación operativa de trabajar con una sola instancia local del frontend y una sola instancia de la API de Monitores durante las pruebas, para evitar duplicidad de solicitudes, sesiones o resultados inconsistentes.
* Se conservaron los cambios en ambiente local para validación previa; no se realizó despliegue.

## VALIDACIONES REALIZADAS

* Se ejecutó la validación de configuración de Django mediante `manage.py check` sin incidencias.
* Se ejecutaron pruebas de los módulos de Monitores y Reportes, incluyendo los flujos de actas y estado de monitores.
* Se compiló el frontend de forma satisfactoria mediante `npm run build`.
* Se verificó nuevamente la compilación después del ajuste de filtros del módulo de Horarios.
* Se revisó la estructura de la plantilla de registros generada para confirmar que usa los encabezados compatibles con el importador de asistencia.
* Se verificó visualmente el comportamiento de los filtros y de las vistas intervenidas durante el recorrido funcional local.

## ARCHIVOS Y ARTEFACTOS DE PRUEBA

* Se generó el archivo local `outputs/registros-prueba-monitores-2026-3.xlsx`.
* El archivo contiene marcaciones diseñadas para pruebas controladas de retrasos, memorandos, horas extra pendientes, registros normales, inconsistencias y conciliación manual.
* Se dejó un script local de apoyo para repetir la carga controlada de estos escenarios cuando sea necesario, sin depender del archivo institucional original.

## PRÓXIMOS PASOS

1. Realizar la aceptación manual de cada escenario cargado: confirmar el memorando por retrasos, revisar y decidir las horas extra pendientes, y resolver las inconsistencias generadas.
2. Validar la importación de un archivo institucional controlado antes de utilizar registros completos del periodo académico.
3. Comprobar con cuentas de prueba los estados Pendiente, Activo e Inactivo durante la creación y activación de monitores.
4. elc
5. Mantener las pruebas en ambiente local y no realizar despliegue hasta completar la aceptación funcional de los casos de prueba.

## ESTADO FINAL

Durante el turno del 19 de septiembre de 2026, de 6:00 a. m. a 12:00 m., se realizó la validación integral de Gestión de Monitores y se consolidaron ajustes funcionales para Actas, estados de cuenta, filtros de Monitores y Horarios. También se preparó información de prueba compatible con el importador para cubrir casos normales y novedades relevantes: retrasos reincidentes con memorando, horas extra pendientes, registros incompletos, pares inválidos y usuarios sin coincidencia. Todos los avances quedaron en el ambiente local, con compilación del frontend y verificaciones técnicas realizadas, pendientes únicamente de la aceptación manual final de los escenarios cargados.
