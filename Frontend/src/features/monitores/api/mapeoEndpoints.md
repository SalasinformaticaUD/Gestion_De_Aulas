# Mapeo de endpoints del módulo de monitores

El frontend consume dos servicios a través de los rewrites de Next.js. `/api/aulas`
apunta al backend NestJS central y `/api/monitores` a la API Django que conserva los
datos funcionales de Gestión de Monitores.

Durante desarrollo, `NEXT_PUBLIC_MODO_DEMO_MONITORES=true` activa datos locales y
permite entrar con cualquier usuario y contraseña no vacíos. Para integración real,
definirla como `false` y reconstruir el frontend.

| Flujo | Método y endpoint funcional |
| --- | --- |
| Login central y permisos | `POST /api/aulas/auth/login` |
| Validación de sesión central | `GET /api/aulas/auth/me` |
| Sesión funcional de monitores | `POST /api/monitores/api/v1/auth/login/` |
| Monitores visibles | `GET /api/monitores/api/v1/monitors/` |
| Dashboard | `GET /api/monitores/api/v1/reports/dashboard/` |
| Horarios | `GET /api/monitores/api/v1/schedules/` |
| Activar o desactivar horario | `PATCH /api/monitores/api/v1/schedules/:id/` |
| Importar asistencia | `POST /api/monitores/api/v1/attendance/imports/` |
| Consultar importación | `GET /api/monitores/api/v1/attendance/imports/:id/` |
| Pendientes de conciliación | `GET /api/monitores/api/v1/attendance/pending-reconciliation/` |
| Asignar monitor | `POST /api/monitores/api/v1/attendance/pending-reconciliation/:id/assign-monitor/` |
| Anotaciones | `GET/POST /api/monitores/api/v1/annotations/` |
| Editar o eliminar anotación | `PATCH/DELETE /api/monitores/api/v1/annotations/:id/` |
| Excepciones | `GET/POST /api/monitores/api/v1/schedules/exceptions/` |
| Editar o eliminar excepción | `PATCH/DELETE /api/monitores/api/v1/schedules/exceptions/:id/` |
| Sesiones | `GET /api/monitores/api/v1/sessions/` |
| Revisar horas extra | `POST /api/monitores/api/v1/sessions/:id/review-overtime/` |
| Consulta pública | `GET /api/monitores/api/v1/reports/public-monitor-lookup/` |

## Contratos aún no disponibles

La API funcional no expone un endpoint REST para importar horarios masivamente; esa
operación existe únicamente dentro de Django Admin. La vista conserva la selección y
validación del archivo, pero no simula una importación ni envía datos a una ruta
inventada. El backend central tampoco expone todavía un endpoint para cambiar la
contraseña; la vista informa esta condición y nunca almacena las claves ingresadas.

El cliente de integración del backend central espera `GET /health` y
`GET /usuarios/:usuarioExternoId`, mientras que la API funcional inspeccionada publica
`GET /healthz/` y `GET /api/v1/monitors/:id/`. Esa diferencia es un contrato pendiente
entre backends y no se corrige desde el frontend.
