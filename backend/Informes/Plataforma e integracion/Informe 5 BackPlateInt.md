# Informe 5 - Cierre funcional de módulos

FECHA: 31/08/2026  
AUTORES: 
FECHA: 31/08/2026  
AUTORES: Juan Esteban Cañon Solorza 

## OBJETIVO DE LA JORNADA

Consolidar las modificaciones funcionales solicitadas para los módulos de
Horarios, Gestión de Aulas, Disponibilidad y Prácticas Libres, manteniendo los
flujos existentes y verificando las reglas críticas tanto en frontend como en
backend.

## AVANCES REALIZADOS

### Horarios

* Se incorporó la carga masiva de horarios mediante Excel, con validación de
  columnas, aulas, bloques, duplicados y conflictos antes de guardar.
* Se implementó la vista general de aulas organizada por día y bloque horario,
  mostrando las clases programadas en una tabla alineada.
* El conteo de semanas se maneja de forma semestral y reinicia en semana 1 al
  comenzar cada semestre.
* Las acciones “Crear periodo” y “Agregar clase” quedaron restringidas a
  administradores con validación en backend. También se eliminó el campo
  “Estado de la clase”.
* La recarga de horarios reemplaza la información previa de modificaciones del
  semestre para evitar duplicados.
* Se agregó el registro funcional de asistencia y ausencia, con bloqueo de
  cambios después del periodo permitido.

### Gestión de Aulas

* Se agregó la creación individual de aulas con código, ubicación, capacidad,
  marca, modelo de PC, software y hardware de la sala.
* Se agregó la opción “Subir aulas masivamente” mediante archivo Excel y una
  plantilla con estructura consistente.
* La carga valida encabezados, campos obligatorios, capacidad, códigos
  duplicados en el archivo y aulas existentes sin distinguir mayúsculas de
  minúsculas.
* Se retiraron de la interfaz el campo “Pisos” y las opciones “Audiovisuales” y
  “Prácticas libres” dentro de la gestión de aulas.

### Disponibilidad

* Se mejoró la presentación visual con filtros de estado, tarjetas por aula,
  indicadores resumidos y detalle de las fuentes que bloquean o liberan un
  aula.
* La disponibilidad considera el estado de asistencia de las clases:
  “ASISTIÓ” mantiene la ocupación, “AUSENTE” libera el aula y “PENDIENTE” la
  conserva ocupada durante la ventana permitida.
* Después de 20 minutos desde la hora programada, una asistencia pendiente sin
  registro se interpreta automáticamente como “AUSENTE”.
* La pantalla se actualiza automáticamente cada 60 segundos para reflejar el
  cambio sin recarga manual.

### Prácticas Libres

* El flujo solicita el software requerido, consulta únicamente aulas
  disponibles que cuentan con dicho software y permite seleccionar una sala.
* El código estudiantil se valida contra un estudiante existente; no se crean
  estudiantes manualmente desde este flujo.
* El backend valida disponibilidad, software instalado, conflictos y multas
  activas antes de crear el préstamo.
* Cada práctica almacena responsable del préstamo (monitor, técnico o
  asistencial), aula, estudiante, software solicitado, inicio, fin estimado,
  fin real y estado.
* Se incorporó un mini dashboard con prácticas activas, vencidas, finalizadas y
  total histórico, además de las vistas “Gestión actual” e “Historial”.
* Al finalizar se confirma el cumplimiento de las reglas. Si existe
  incumplimiento, se solicita la descripción, se recomienda una multa y se abre
  el módulo de Multas con el estudiante precargado.
* Se agregó un adaptador de correo para enviar la confirmación de la práctica
  con horario, aula, software y reglas de uso.

### Cambios de datos y migraciones

* Se agregó la migración `20260901090000_extend_practicas_libres`.
* Se incorporaron los campos `responsableTipo` y `softwareSolicitado` en
  `PracticaLibre`, conservando los registros existentes mediante valores
  predeterminados y campos compatibles.
* La migración fue aplicada exitosamente en la base PostgreSQL configurada.

## VALIDACIONES EJECUTADAS

En el backend y frontend de Gestión de Aulas se ejecutaron satisfactoriamente:

* `npm run build` en backend: compilación exitosa.
* `npm run build` en frontend: compilación exitosa y generación de 34 rutas.
* `npm test -- --runInBand`: **25 suites aprobadas y 114 pruebas aprobadas**.
* Pruebas de Prácticas Libres: **10 pruebas aprobadas**.
* Pruebas de Disponibilidad: **15 pruebas aprobadas**, incluyendo los estados
  “ASISTIÓ”, “AUSENTE”, “PENDIENTE” y el límite automático de 20 minutos.
* `git diff --check`: sin errores de formato detectados en los cambios.

Las validaciones cubren carga masiva, gestión individual, permisos de horarios,
asistencia, disponibilidad, multas, software, aulas y prácticas libres.

## PENDIENTES PARA CERRAR EL PLAN AL 100%

### Pendientes de notificación y operación

1. Configurar `EMAIL_WEBHOOK_URL` en `backend/.env` para habilitar el envío real
   de confirmaciones por correo. Sin esta variable, la práctica se conserva y
   el backend informa que el correo no fue enviado.
2. Ejecutar un smoke test manual con usuarios, estudiantes, software, aulas y
   correos reales en el entorno de operación.
3. Confirmar con el equipo institucional los motivos de multa que deben
   recomendarse para cada tipo de incumplimiento.

### Consideraciones de alcance

Las modificaciones se limitaron a los módulos de Horarios, Gestión de Aulas,
Disponibilidad y Prácticas Libres, junto con el enlace operativo necesario hacia
Multas. No se alteraron las funcionalidades no relacionadas de los demás
módulos.

## ESTADO ACTUAL

Los módulos intervenidos quedaron compilados y probados en frontend y backend.
Los flujos de carga masiva, gestión de aulas, disponibilidad basada en
asistencia y prácticas libres con validaciones de negocio están implementados.
El plan funcional puede continuar a pruebas integrales de operación; el único
requisito técnico pendiente identificado para completar la notificación por
correo es configurar el webhook del servicio transaccional.
