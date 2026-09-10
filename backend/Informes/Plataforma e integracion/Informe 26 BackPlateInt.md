# Informe 26 - Plataforma e Integración

**FECHA:** 10/09/2026  
AUTORES: Pablo Garzon Gomez
TURNO:  10:00 a. m. - 14:00 p. m.

## OBJETIVO

Validar la aplicación integrada en Docker después de construir las imágenes, resolver incidencias detectadas durante las pruebas operativas y consolidar el resultado de la carga histórica de multas.

## AVANCES REALIZADOS

### 1. Construcción y verificación de la aplicación en Docker

* Se reutilizó la configuración existente de `backend/docker-compose.yml` para construir y ejecutar la aplicación integrada.
* Se levantaron y verificaron los servicios de base de datos PostgreSQL, migración, backend NestJS, frontend Next.js y renderizador PDF.
* Se comprobaron los estados de salud de los contenedores y la comunicación entre frontend, backend, base de datos y renderizador PDF.
* Se validó el acceso de la aplicación por `http://127.0.0.1:3001` y el endpoint de salud del backend por `http://127.0.0.1:3002/health`.
* La base de datos se mantuvo persistente en su volumen Docker; no se eliminó ni reinicializó información durante las pruebas.

### 2. Permisos de asistencia docente en el dashboard

* Se identificó que el endpoint de asistencia exigía el módulo técnico `ASISTENCIA_DOCENTE`, aunque este no pertenece al catálogo de módulos asignables ni al rol de administrador sembrado en la base Docker.
* Se corrigió la validación para que la asistencia docente se autorice mediante el módulo funcional `HORARIOS`, al que pertenece esta operación.
* Con ello, el administrador puede confirmar asistencia o ausencia desde el dashboard sin recibir el mensaje de acceso denegado al módulo técnico.

### 3. Optimización del registro de asistencia

* Se detectó que cada clic de asistencia consultaba primero todo el historial de la clase y luego realizaba una segunda solicitud para crear o actualizar el registro.
* Se incorporó una operación idempotente de registro que crea o actualiza la asistencia en una sola solicitud.
* El dashboard actualiza inmediatamente la fila con el estado **Asistió** o **No asistió** y actualiza el resumen completo en segundo plano.
* Se añadieron y ejecutaron pruebas focalizadas del servicio de asistencia: 8 pruebas aprobadas.

### 4. Carga histórica de multas y estudiantes inactivos

* Se realizó la carga del archivo histórico de multas en un entorno controlado.
* Se verificó el tratamiento de códigos ausentes en la base vigente: el sistema conserva el historial creando el estudiante con el prefijo `(INACTIVO)` y asocia la multa correspondiente.
* Los registros inactivos continúan disponibles para consulta, cumplimiento y anulación; no se elimina la trazabilidad de la multa.
* Se mantiene la reactivación automática cuando, en una actualización semestral posterior, ingrese un estudiante con el mismo código.

### 5. Finalización de prácticas libres solicitadas por docentes

* Se confirmó que las multas son exclusivamente estudiantiles y no deben aplicarse a docentes.
* Se simplificó el modal de finalización para prácticas cuyo solicitante es docente: solo presenta las acciones **Cancelar** y **Sí, finalizar**.
* Se eliminaron de ese flujo las preguntas sobre incumplimiento, devolución tardía y registro de multas.

## FUNCIONA

* Los contenedores de PostgreSQL, backend, frontend y renderizador PDF se encuentran saludables.
* El frontend responde desde el contenedor y se comunica con el backend mediante la red interna de Docker.
* El administrador puede registrar asistencia docente desde el dashboard con los permisos correctos.
* El registro de asistencia requiere menos solicitudes y actualiza la interfaz sin esperar el recálculo completo del panel.
* La carga histórica de multas conserva registros de estudiantes no presentes en la lista semestral mediante el indicador `(INACTIVO)`.
* Las prácticas libres de docentes pueden finalizarse sin flujo de multas.
* La compilación del backend y del frontend finalizó correctamente después de los cambios.

## NO FUNCIONA / PENDIENTE DE VALIDAR

* Falta conciliar y asignar el estudiante vigente correspondiente a cada registro creado como `(INACTIVO)`, según la información institucional disponible.
* Hasta que se realice esa conciliación, los registros inactivos conservarán el código y nombre histórico importado, pero no tendrán vinculación confirmada con un estudiante vigente diferente.
* Permanecen pendientes los smoke tests de staging con secretos reales, la limpieza de advertencias OpenAPI y la etapa de CI documentadas en los informes anteriores.

## NO MODIFICAR

* No eliminar multas históricas ni estudiantes inactivos creados durante la importación.
* No asociar de forma automática un estudiante vigente a un registro `(INACTIVO)` sin confirmar que corresponde al mismo código e identidad institucional.
* No usar el módulo de Multas para sancionar docentes; sus restricciones son exclusivas para estudiantes y afectan únicamente el flujo de prácticas libres.
* No volver a requerir el módulo técnico `ASISTENCIA_DOCENTE` para registrar asistencia desde Horarios o Dashboard.
* No destruir volúmenes de PostgreSQL durante pruebas de Docker sin respaldo y autorización explícita.

## SIGUIENTE PASO

* Revisar los estudiantes creados como `(INACTIVO)` durante la carga histórica y asignar/conciliar el estudiante correspondiente cuando se cuente con la información oficial.
* Ejecutar smoke tests de staging con las variables y secretos definitivos del entorno de despliegue.
* Continuar la revisión funcional de módulos en Docker antes de la publicación en producción.

## ESTADO ACTUAL

La aplicación se encuentra operativa en Docker con sus servicios integrados y saludables. Se corrigieron los permisos y la respuesta de asistencia en el dashboard, se verificó la carga histórica de multas y se separó el cierre de prácticas docentes del flujo de sanciones estudiantiles. El principal pendiente funcional es la conciliación de los registros estudiantiles marcados como `(INACTIVO)` con la información institucional vigente.
