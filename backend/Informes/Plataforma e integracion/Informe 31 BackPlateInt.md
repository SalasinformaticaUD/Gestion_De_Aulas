# Informe Plan de Integracion 31 - Consolidacion de Gestion de Monitores

FECHA: 16/09/2026  
AUTORES: Carol Velasco y Kaleth Molina  
HORARIO: 6:00 p.m. a 10:00 p.m.

## OBJETIVO DE LA JORNADA

Continuar la consolidación del módulo de Gestión de Monitores, verificando la integración de datos provenientes de la API y aplicando mejoras funcionales y visuales a los módulos de Actas, Históricos, Horarios, Monitores y Conciliación.

## ALCANCE Y CONTROL DE RAMAS

* Se trabajó sobre la rama de integración `gestion-monitores` del proyecto `Software Monitorias`.
* Se mantuvo como referencia la API de Gestión de Monitores, sin modificar la rama `version-2.0`.
* No se realizaron commits, merges, rebases ni pushes durante el turno.
* Las pantallas se ajustaron para consumir los registros existentes de la API, evitando conservar valores de ejemplo como datos permanentes del frontend.

## ACTAS DE COMPROMISO

Se revisó el flujo documental y se continuó la adaptación del módulo de Actas de compromiso:

* Se verificó la fuente de generación de actas y el período académico utilizado para los documentos.
* Se ajustó la visualización del módulo para presentar una tabla de monitores y documentos con información obtenida desde los registros disponibles.
* Se incorporó el encabezado **Actas de compromiso** y una descripción del propósito de revisión de actas enviadas por monitores.
* Se agregaron indicadores dinámicos para cantidad de monitores, actas firmadas y actas pendientes de firma, con tratamiento visual mediante degradados suaves.
* Se añadieron filtros por nombre, correo o código; estado del acta y dependencia.
* Se preparó el seguimiento de firmas, indicando que las actas nuevas permanecen pendientes hasta su revisión por un administrador o líder.
* Se incluyeron acciones condicionadas al estado del registro, tales como visualizar, descargar, revisar, aceptar o rechazar el documento, según corresponda.
* Se incorporó la opción de descargar las actas firmadas disponibles, de acuerdo con los registros actuales.
* Se mantuvo la posibilidad de visualizar el PDF desde la interfaz, además de descargarlo.

## VALIDACIONES DE MONITORES Y NOTIFICACIONES

Se reforzaron los controles del directorio de monitores y los avisos de la interfaz:

* Se estableció como obligatoria la información requerida al crear un monitor, incluidos documento, teléfono y proyecto curricular.
* Se restringieron los campos de código de estudiante, número de documento y teléfono para recibir únicamente valores numéricos.
* Se mejoró el cuadro de confirmación de eliminación: el botón de eliminar se ajustó visualmente, se presentó en rojo y se añadieron estados hover consistentes con el resto de la aplicación.
* Se unificó el comportamiento de avisos temporales de éxito, error y validación. Los avisos permanecen hasta diez segundos, mantienen su visibilidad mientras el cursor está sobre ellos y realizan una transición de transparencia durante los últimos tres segundos antes de ocultarse.
* El mismo comportamiento de avisos se aplicó a los mensajes equivalentes de Horarios y otros flujos que utilizan el componente compartido.

## HORARIOS

Se continuó la mejora del módulo de Horarios:

* Se corrigió la obtención del proyecto curricular al seleccionar un monitor en el formulario de asignación.
* Se conservaron grupo y docente como campos opcionales en la asignación de horario.
* Se revisó el Calendario semanal para que represente los horarios realmente registrados para el monitor seleccionado.
* Se dejó disponible la edición de horarios en lugar de la acción de desactivación en el listado.

## HISTORICOS

Se estructuró el módulo de consulta histórica:

* Se agregaron los encabezados **SEMESTRES ARCHIVADOS** e **Históricos de monitorias**.
* Se incorporó la descripción para la consulta de registros, horas extra, anotaciones y exportación del consolidado.
* Se incluyeron controles de dependencia y semestre para consultar la información correspondiente.
* Se prepararon indicadores de registros, horas extra y anotaciones, junto con la exportación del consolidado.
* La tabla histórica muestra los campos Semestre, Monitor, Dependencia, Normales, Extra, Aprobadas, Total y Restantes a partir de los datos recibidos.

## CONCILIACION DE ASISTENCIA

Se completó el ajuste solicitado para la pantalla de registros pendientes de conciliación:

* Se agregó el contador dinámico **Mostrando X registros visibles** en el encabezado.
* Se mantuvieron los filtros Nombre crudo, Dependencia, Fecha y Motivo, con el botón **Limpiar** para reiniciar la consulta.
* La columna de asignación se renombró a **Acción**.
* Se conservó la acción para seleccionar y vincular el monitor correspondiente a cada registro pendiente.
* Se agregó el estado vacío **No hay registros pendientes**.
* Se dejó la paginación dinámica con el formato **Página X de Y - Z registro(s)** y los botones Anterior y Siguiente.

## VALIDACIONES REALIZADAS

Se ejecutó la compilación de producción del frontend después de los cambios:

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

La compilación finalizó correctamente e incluyó las rutas de Gestión de Monitores, Actas, Históricos, Horarios y Conciliación de asistencia.

## PENDIENTES

* Realizar una prueba de extremo a extremo de creación de monitor, activación de cuenta y entrega efectiva del correo institucional.
* Verificar con registros reales la firma, revisión, aceptación, rechazo, visualización y descarga de todas las actas.
* Confirmar que el período mostrado dentro de cada PDF corresponde al semestre académico vigente antes de su liberación.
* Probar los filtros, la paginación y las acciones de Conciliación con una cantidad representativa de registros pendientes.
* Revisar módulo por módulo, con perfiles de administrador, líder y monitor, antes de aprobar un commit o despliegue.

## NOTA IMPORTANTE DE PRIORIZACIÓN

Hasta que cada módulo no esté completamente funcional, integrado con la API y comprobado con pruebas funcionales, no se deben iniciar nuevos cambios ni mejoras visuales sobre ese módulo. La prioridad del siguiente turno debe ser completar y validar los requerimientos pendientes módulo por módulo; únicamente después podrán planearse ampliaciones visuales o ajustes de diseño.

## ESTADO FINAL

Durante el turno de 6:00 p.m. a 10:00 p.m. se avanzó en la consolidación funcional y visual de Gestión de Monitores. Los cambios de Actas, Históricos, Horarios, Monitores y Conciliación se integraron sobre la rama de trabajo y la compilación de producción del frontend finalizó satisfactoriamente.

El siguiente paso es validar los flujos completos con datos reales y los roles correspondientes, corrigiendo cualquier hallazgo antes de realizar el commit de los cambios.
