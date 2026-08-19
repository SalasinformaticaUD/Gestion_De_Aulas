# Mapa de módulos del backend

Esta estructura sigue el Documento de Ingeniería de Software del Sistema de Gestión
Operativa de las Aulas de Software. Los módulos se organizan por dominio funcional y
se comunican mediante controladores REST.

| Módulo Nest | Ruta base | Requisitos | Responsabilidad principal |
| --- | --- | --- | --- |
| `horario` | `/horario` | RF-001 a RF-010 | Importación, validación y consulta de horarios y períodos académicos. |
| `disponibilidad-aulas` | `/disponibilidad-aulas` | RF-011 a RF-020 | Cálculo y consulta dinámica de disponibilidad. No representa una tabla permanente. |
| `asistencia-docente` | `/asistencia-docente` | RF-021 a RF-030 | Asistencia e inasistencia asociada a clases programadas. |
| `practicas-libres` | `/practicas-libres` | RF-031 a RF-048 | Solicitudes, préstamos, devoluciones y consulta de estudiantes. |
| `prestamos-docentes` | `/prestamos-docentes` | RF-049 a RF-058 | Reservas y préstamos temporales de aulas a docentes. |
| `prestamos-audiovisuales` | `/prestamos-audiovisuales` | RF-059 a RF-071 | Inventario, préstamo y devolución de equipos audiovisuales. |
| `software` | `/software` | RF-072 a RF-081 | Importación y consulta del software instalado por aula. |
| `aulas` | `/aulas` | RF-082 a RF-091 | Administración de aulas, capacidad, características y estado operativo. |
| `multas` | `/multas` | RF-092 a RF-102 | Multas, motivos, restricciones y cumplimiento. |
| `observaciones` | `/observaciones` | RF-103 a RF-110 | Novedades, restricciones y observaciones vigentes e históricas. |
| `limpieza-aulas` | `/limpieza-aulas` | RF-111 a RF-120 | Programación, registro, novedades e historial de limpieza. |
| `tareas-operativas` | `/tareas-operativas` | RF-121 a RF-132 | Tareas, responsables, prioridades, estados e impacto en disponibilidad. |
| `credenciales` | `/credenciales` | RF-133 a RF-142 | Credenciales operativas cifradas, acceso restringido e historial. |
| `reportes` | `/reportes` | RF-143 a RF-155 | Generación y exportación de formatos, reportes e indicadores. |
| `panel-operativo` | `/panel-operativo` | RF-156 a RF-165 | Vista consolidada, alertas y sugerencias calculadas en tiempo real. |

## Módulos transversales

| Módulo Nest | Ruta base | Responsabilidad principal |
| --- | --- | --- |
| `auth` | `/auth` | Autenticación centralizada y gestión de sesiones. |
| `usuarios` | `/usuarios` | Administración y desactivación de usuarios. |
| `roles` | `/roles` | Administración de roles. |
| `permisos` | `/permisos` | Permisos por módulo y operación. |
| `dependencias` | `/dependencias` | Dependencias a las que pertenecen los usuarios. |
| `auditoria` | `/auditoria` | Consulta de trazabilidad de operaciones críticas. |

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
