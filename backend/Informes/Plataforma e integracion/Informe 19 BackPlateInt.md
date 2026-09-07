# Informe 19 - Plataforma e Integración

FECHA: 07/09/2026  
TURNO: 6:00 a. m. - 8:00 m.  
AUTOR: Pablo Garzon Gomez

## OBJETIVO DE LA JORNADA

Ejecutar los dos primeros pasos propuestos en el Informe 19 anterior para
validar el flujo de tareas operativas asociadas a varias aulas: creación de un
grupo y avance parcial por una sola sala, sin afectar las tareas hermanas.

## PRUEBAS EJECUTADAS

### 1. Creación real de un grupo de aulas

* Se inició la API local y se comprobó `GET /health` con respuesta
  `{ "status": "ok" }`.
* Se consultaron dos aulas operativas y se envió una solicitud real a
  `POST /tareas-operativas` con ambos identificadores en `aulaIds`.
* La API respondió con dos tareas pendientes: una asociada al aula 306 y otra
  al aula 312. Ambas recibieron el mismo `grupoId`.
* Se consultó la auditoría de la primera tarea y se confirmó el evento
  `CREATE`, con el aula y el identificador de grupo almacenados en el registro
  nuevo.
* Al finalizar la prueba, las dos tareas temporales se eliminaron y se verificó
  que no permaneciera ninguna tarea con el `grupoId` de prueba. La auditoría se
  conserva intencionalmente como trazabilidad de las operaciones ejecutadas.

### 2. Avance parcial, auditoría y aislamiento por sala

* Se añadió una prueba unitaria que representa dos tareas hermanas del mismo
  grupo en estado `EN_PROCESO`.
* La prueba completó solo una de ellas y verificó que la actualización se envía
  exclusivamente con el identificador de esa sala; la tarea hermana no recibe
  cambios.
* También se verificó que la acción de completado registra auditoría para la
  tarea específica. Esto confirma que el avance parcial no propaga el estado al
  resto del grupo.
* La suite del servicio de Tareas Operativas finalizó correctamente con
  **8 pruebas aprobadas**.

## RESULTADOS

El backend cumple el requisito RF-121 de asociar una tarea a varias aulas y
mantiene las reglas de RF-123, RF-127, RF-128, RF-129 y RF-132 por cada aula.
Una tarjeta agrupada puede resumir el grupo en el tablero, pero cada sala se
mantiene como una tarea independiente en persistencia, estados e historial.

## LIMITACIONES DE LA VALIDACIÓN

La interfaz de pruebas en `/tareas` solicita credenciales institucionales y no
había una sesión autenticada disponible. Por seguridad no se utilizaron ni se
solicitaron credenciales. Por tanto, queda pendiente una validación manual de
la tarjeta agrupada en el navegador, especialmente en modo claro, oscuro y
pantallas pequeñas.

## PRÓXIMOS PASOS

1. Con una sesión de prueba autorizada, validar visualmente la tarjeta agrupada
   y el modal **Gestionar salas** en modo claro, oscuro y ancho móvil.
2. Probar desde la interfaz aceptar, registrar informe, completar y cancelar
   una única sala del grupo; confirmar el avance resumido y el historial.
3. Continuar con las pruebas de Horarios para fecha pasada, actual y futura, y
   ampliar la cobertura automatizada de sus filtros diarios.
4. Implementar pruebas para respuestas paginadas e invalidación de caché en
   Estudiantes, Docentes, Multas y Software Instalado.

## ESTADO ACTUAL

La creación agrupada y el avance parcial por aula fueron validados contra la
API local y mediante pruebas automatizadas. El comportamiento pendiente no es
de lógica de negocio sino de revisión visual autenticada de la interfaz.
