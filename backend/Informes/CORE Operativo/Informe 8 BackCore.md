# Informe 8 - BackCore

FECHA: 24/08/2026  
TURNO : TURNO: 06:00 p. m. - 10:00 p. m.  
MONITOR: Juan Esteban Cañon Solorza 

## AVANCES

* Se continuó desde el Informe 7, cerrando primero la recomendación 3 del Informe 6 y después el flujo de semanas 6 y 7 del panel operativo.
* Disponibilidad ahora admite filtros opcionales por `softwareId`, capacidad mínima y características, sin cambiar el cálculo, el bloque de dos horas ni su orden de prioridad.
* Se añadieron `GET /disponibilidad-aulas/sugerencias` y `GET /disponibilidad-aulas/historial`. Las sugerencias solo incluyen aulas calculadas como disponibles y se ordenan por menor capacidad sobrante y código.
* El histórico se deriva de clases, préstamos docentes, prácticas libres, restricciones y tareas; limita el rango a 31 días y declara `derivado: true` y `persistido: false`.
* Se reemplazó el stub de panel operativo por `GET /panel-operativo/resumen`, `GET /panel-operativo/aulas` y `GET /panel-operativo/alertas`.
* El panel orquesta disponibilidad, asistencia docente, préstamos docentes y prácticas activas; las observaciones, horarios y tareas llegan por el motor de disponibilidad, por lo que no se duplicaron reglas.
* Se incorporaron métricas consolidadas, aulas paginadas y alertas de severidad `info`, `advertencia` y `critica`.
* Se actualizaron los contratos de disponibilidad y del panel, el mapa de módulos y las casillas finalizadas de la sección 9 del plan.

## FUNCIONA

* Los filtros de disponibilidad se aplican antes de calcular las aulas y las características se validan contra el JSON del aula.
* Las sugerencias y el histórico son consultas de solo lectura; no crean tabla, modelo ni registros de disponibilidad.
* El panel expone una vista consolidada de operación diaria, conservando `persistido: false` en sus datos calculados.
* Las alertas reportan préstamos programados como información, asistencias pendientes y mantenimiento como advertencias, y ausencias o bloqueos como críticas.
* Las pruebas unitarias específicas de disponibilidad y panel finalizan con 14 pruebas aprobadas; el E2E del panel valida resumen con aula ocupada, libre y alerta, además de las tres rutas de lectura.
* TypeScript finaliza sin errores.

## NO FUNCIONA

* La fuente de limpiezas pendientes no se incorporó al panel porque `limpieza-aulas` aún conserva un servicio scaffold y no ofrece una consulta operativa real.
* La migración `20260824090000_extend_aulas_and_project_relations` y otras previas siguen sin aplicarse a PostgreSQL local.
* La regla de liberar un aula por ausencia docente continúa pendiente de decisión operativa; el panel alerta la ausencia pero no altera disponibilidad.
* Las pruebas siguen usando Prisma simulado; no existe aún una base PostgreSQL aislada de E2E.

## NO MODIFICAR

* No crear una tabla permanente de disponibilidad ni de historial de disponibilidad.
* No agregar endpoints de escritura al módulo de disponibilidad ni al panel operativo.
* No modificar la prioridad del motor ni liberar aulas automáticamente por ausencia docente sin decisión aprobada.
* No retirar `proyectoCurricularId` ni aplicar migraciones pendientes sin autorización.
* No modificar los Informes 1 a 7 para registrar este avance.

## SIGUIENTE PASO

* Completar `limpieza-aulas` como fuente real y conectarla al panel cuando tenga estado de pendiente verificable.
* Resolver formalmente la regla de ausencia docente antes de cambiar disponibilidad o alertas asociadas.
* Aplicar y verificar las migraciones pendientes en un entorno autorizado y preparar PostgreSQL aislado para E2E.
* Continuar con las recomendaciones 4 a 6 del Informe 6 en el orden acordado, empezando por la decisión operativa de ausencia docente.
