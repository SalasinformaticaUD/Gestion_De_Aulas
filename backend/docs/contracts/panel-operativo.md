# Contrato del panel operativo

Fecha de publicación: 24/08/2026

El panel es una capa de lectura que orquesta los servicios del Core operativo. No crea
ni actualiza registros de operación y no mantiene una tabla propia de disponibilidad.

## Endpoints

- `GET /panel-operativo/resumen?fecha=YYYY-MM-DD&horaInicio=HH:00`
- `GET /panel-operativo/aulas?fecha=YYYY-MM-DD&horaInicio=HH:00&pagina=1&limite=20`
- `GET /panel-operativo/alertas?fecha=YYYY-MM-DD&horaInicio=HH:00`

`horaInicio` es opcional y debe identificar una hora completa; el panel consulta el
bloque operativo de dos horas correspondiente. Sin ese parámetro se usa `06:00-08:00`.

## Respuestas

`resumen` devuelve las métricas de aulas disponibles, ocupadas, reservadas, en
mantenimiento y bloqueadas; además de asistencias pendientes, ausencias, prácticas
activas, préstamos de la jornada y alertas. Las alertas tienen severidad `info`,
`advertencia` o `critica`.

`aulas` devuelve la lista calculada por disponibilidad con paginación (`pagina`,
`limite`, `total`, `items`). `alertas` entrega la misma lista de alertas del resumen
para cargas independientes del frontend. Todas las respuestas calculadas incluyen o
derivan `persistido: false`.
