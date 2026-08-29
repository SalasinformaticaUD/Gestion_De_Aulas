# Mapa de módulos del backend

Esta estructura sigue el Documento de Ingeniería de Software del Sistema de Gestión
Operativa de las Aulas de Software. Los módulos se organizan por dominio funcional y
se comunican mediante controladores REST.

| Módulo Nest               | Ruta base                  | Requisitos      | Responsabilidad principal                                                                                                                         |
| ------------------------- | -------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `horario`                 | `/horario`                 | RF-001 a RF-010 | Importación JSON y oficial Excel, validación y consulta de horarios y períodos académicos.                                                        |
| `disponibilidad-aulas`    | `/disponibilidad-aulas`    | RF-011 a RF-020 | Cálculo y consulta dinámica por bloque, resumen, sugerencias e histórico derivado. Usa bloques de dos horas y no representa una tabla permanente. |
| `asistencia-docente`      | `/asistencia-docente`      | RF-021 a RF-030 | Asistencia e inasistencia asociada a clases programadas.                                                                                          |
| `practicas-libres`        | `/practicas-libres`        | RF-031 a RF-048 | Solicitudes, préstamos, devoluciones y consulta de estudiantes.                                                                                   |
| `prestamos-docentes`      | `/prestamos-docentes`      | RF-049 a RF-058 | Reservas y préstamos temporales de aulas a docentes.                                                                                              |
| `prestamos-audiovisuales` | `/prestamos-audiovisuales` | RF-059 a RF-071 | Inventario, préstamo y devolución de equipos audiovisuales.                                                                                       |
| `software`                | `/software`                | RF-072 a RF-081 | Importación y consulta del software instalado por aula.                                                                                           |
| `aulas`                   | `/aulas`                   | RF-082 a RF-091 | Administración de aulas, capacidad, características, proyectos curriculares y estado operativo.                                                   |
| `multas`                  | `/multas`                  | RF-092 a RF-102 | Multas, motivos, restricciones y cumplimiento.                                                                                                    |
| `observaciones`           | `/observaciones`           | RF-103 a RF-110 | Novedades, restricciones y observaciones vigentes e históricas.                                                                                   |
| `limpieza-aulas`          | `/limpieza-aulas`          | RF-111 a RF-120 | Programación, registro, novedades e historial de limpieza.                                                                                        |
| `tareas-operativas`       | `/tareas-operativas`       | RF-121 a RF-132 | Tareas, responsables, prioridades, estados e impacto en disponibilidad.                                                                           |
| `credenciales`            | `/credenciales`            | RF-133 a RF-142 | Credenciales operativas cifradas, acceso restringido e historial.                                                                                 |
| `reportes`                | `/reportes`                | RF-143 a RF-155 | Generación y exportación de formatos, reportes e indicadores.                                                                                     |
| `panel-operativo`         | `/panel-operativo`         | RF-156 a RF-165 | Vista consolidada de lectura, aulas paginadas y alertas calculadas en tiempo real.                                                                |

## Módulos transversales

| Módulo Nest    | Ruta base       | Responsabilidad principal                                                                                                                                |
| -------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth`         | `/auth`         | Autenticación centralizada mediante `POST /auth/login`, usuario actual mediante `GET /auth/me` y guards globales de autenticación y permisos por módulo. |
| `usuarios`     | `/usuarios`     | Administración y desactivación de usuarios.                                                                                                              |
| `roles`        | `/roles`        | Administración de roles.                                                                                                                                 |
| `permisos`     | `/permisos`     | Permisos por módulo y operación.                                                                                                                         |
| `dependencias` | `/dependencias` | Dependencias a las que pertenecen los usuarios.                                                                                                          |
| `docentes` | `/docentes` | Catálogo administrativo reutilizado por horarios, préstamos docentes y préstamos audiovisuales. Permite `GET`, `GET /:id`, `POST` y `PATCH /:id`; la búsqueda usa `?q=`. |
| `estudiantes` | `/estudiantes` | Catálogo administrativo reutilizado por prácticas libres y multas. Permite `GET`, `GET /:id`, `POST` y `PATCH /:id`; la búsqueda usa `?q=`. |
| `auditoria`    | `/auditoria`    | Consulta de trazabilidad de operaciones críticas.                                                                                                        |

## Reglas arquitectónicas

- Todos los identificadores persistentes se manejan como UUID (`string`).
- La disponibilidad, el panel operativo y los indicadores se calculan a partir de los
  dominios persistentes; no deben modelarse como tablas independientes.
- Gestión de Aulas no debe acceder directamente a la base de datos de Gestión de
  Monitores. La integración futura debe realizarse mediante API e identificadores
  externos.
- Las credenciales de inicio de sesión y las credenciales operativas son dominios
  distintos. Los secretos nunca deben exponerse sin autorización ni almacenarse en
  texto plano.
- Los registros históricos o auditables no deben eliminarse físicamente cuando la
  operación comprometa la trazabilidad.
- Los controladores del Core declaran su módulo mediante `RequireModule`. El guard
  permite operar inicialmente con `PERMISSIONS_MODE=permissive`; para aplicar los
  permisos almacenados en Prisma debe configurarse `PERMISSIONS_MODE=strict`.
- `AUTH_REQUIRED=false` mantiene compatibilidad durante la integración. En producción,
  la autenticación es obligatoria por defecto y `AUTH_TOKEN_SECRET` es requerido.

## Contratos publicados: módulos paralelos

Todos los endpoints usan JSON, `ValidationPipe` y los UUID expuestos por el recurso
relacionado. Cuando `PERMISSIONS_MODE=strict`, los módulos protegidos exigen el
permiso `<MODULO>_<ACCIÓN>` declarado por su controlador. Las respuestas de errores
siguen el formato HTTP de Nest (`400` validación, `404` referencia inexistente y
`409` conflicto de regla de negocio).

| Módulo        | Contratos REST disponibles                                                                                                                                                                                                                                                                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Audiovisuales | `GET/POST /prestamos-audiovisuales`, `GET /prestamos-audiovisuales/:id`, `PATCH /prestamos-audiovisuales/:id/devolver`, `PATCH /prestamos-audiovisuales/:id/cancelar`, y `GET/POST/PATCH /prestamos-audiovisuales/equipos[/ :id]`. La creación recibe docente, aula, salida, devolución estimada y equipos; la devolución requiere el estado físico y funcional de cada equipo. |
| Software      | `GET/POST/PATCH/DELETE /software`, `GET /software/:id`, `POST/GET /software/aulas/:aulaId`, `DELETE /software/aulas/:aulaId/:softwareId`, `GET /software/:id/aulas`, `POST /software/aulas/buscar-por-software` e importaciones. La asociación recibe `softwareId` **o** `nombre` y `version` (con `descripcion` e `instaladoEn` opcionales).                                   |
| Multas        | `GET/POST /multas`, `GET/PATCH /multas/:id`, `PATCH /multas/:id/cumplir`, `PATCH /multas/:id/anular`, y `GET/POST /multas/motivos`. La consulta permite `estado`, `estudianteId` y `codigo`.                                                                                                                                                                                    |
| Tareas        | `GET/POST /tareas-operativas`, `GET/PATCH /tareas-operativas/:id` y `PATCH /tareas-operativas/:id/estado`. Los filtros son `estado`, `responsableId`, `aulaId` y `fecha`; una tarea bloqueante requiere aula, inicio y fin.                                                                                                                                                     |
| Limpieza      | `GET/POST /limpieza-aulas`, `GET/PATCH /limpieza-aulas/:id`, `GET /limpieza-aulas/sugerencias`, `GET /limpieza-aulas/matriz` y `GET /limpieza-aulas/indicadores`.                                                                                                                                                                                                               |
| Credenciales  | `GET/POST/PATCH /credenciales`, `PATCH /credenciales/:id/estado`, `POST /credenciales/:id/accesos` y `GET /credenciales/:id/secreto`; el secreto solo se entrega por esta última ruta con permiso explícito.                                                                                                                                                                    |
| Reportes      | `GET /reportes/:reporte` y `GET /reportes/:reporte/csv`, donde `reporte` es `uso-aulas`, `practicas-libres`, `prestamos-audiovisuales`, `asistencia-docente`, `multas` o `limpieza`. Aceptan `desde`, `hasta`, `pagina` y `limite`.                                                                                                                                             |

### Contratos internos para Core

Los siguientes servicios se exportan para que Core reutilice reglas y datos del
dominio sin duplicarlos: `MultasService.tieneMultaActiva(estudianteId)`,
`TareasOperativasService.findTareasQueAfectanDisponibilidad(aulaId, inicio, fin)`,
`SoftwareService.findByAula(aulaId)`,
`PrestamosAudiovisualesService.findPrestamosPorAulaYDia(aulaId, fecha)` y
`LimpiezaAulasService.findIndicadores({ aulaId?, desde?, hasta? })`.
