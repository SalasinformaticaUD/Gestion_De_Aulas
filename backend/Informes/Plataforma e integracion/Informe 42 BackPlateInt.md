# Informe Plan de Integración 42 - Mejoras visuales de jornadas, navegación de horas extra y flujos de invalidación

FECHA: 25/09/2026  
AUTORES: Ivan Felipe Prado Blanco

## TURNOS DE TRABAJO

* **Ivan Felipe Prado Blanco:** 10:00 a. m. a 2:00 p. m. del viernes 25/09/2026.

## OBJETIVO DE LA JORNADA

Implementar la correcta visualización de las gráficas de jornada según reglas de negocio (distinguiendo entre horarios asignados y horas extra reales), mejorar la experiencia de navegación desde el módulo de Horas Extra hacia los registros diarios, solventar los pendientes técnicos heredados del Informe 41 referentes a la invalidación automática de sesiones, y adaptar la vista del horario en el Dashboard para su correcta navegación en dispositivos móviles.

## ALCANCE Y REGLA DE TRABAJO

* La revisión se enfocó en el frontend (componentes de registro de asistencia e inconsistencias) y en la extensión del backend (API de sesiones).
* Se debía cumplir la regla visual donde cualquier tiempo laborado que exceda el turno asignado debe pintarse por defecto como "Extra Pendiente" (Amarillo), cambiando a "Aprobada" (Azul) o "Rechazada" (Rojo) según su estado.
* La invalidación de una marcación que ya tiene una sesión debe resolver la sesión derivada automáticamente sin exigir pasos extra al usuario en otras pantallas.
* La vista del calendario del Dashboard en móvil debe presentarse en un formato de columna única (sin scroll horizontal) permitiendo seleccionar el día mediante botones.

## TRABAJO REALIZADO

### Corrección y mejoras en Gráficas de Asistencia (Nivel 2 y 3)
* En RegistrosPorDia.tsx se rediseñó el algoritmo de graficación de la Línea de Tiempo para que evalúe y cruce los minutos trabajados con el arreglo de *todos* los turnos asignados del monitor para ese día (soportando múltiples turnos/fragmentos).
* El tiempo laborado que interseca con el turno asignado se visualiza como "Horas Normales" (verde). Las fracciones de tiempo anteriores o posteriores se renderizan como "Horas Extra" adoptando colores acordes a su estado en base de datos.
* Se agregó la lógica respectiva para las marcaciones puntuales de huella biométrica (Nivel 3), asignándoles color según el mismo criterio de cruce de horario.
* Se crearon clases CSS en SistemaVisualMonitores.module.css para soportar las variaciones de diseño de las huellas y se corrigió el fallo de especificidad que hacía que los puntos flotaran en el borde superior de la pista.

### Navegación desde Horas Extra a Registros Diarios
* En RevisionHorasExtra.tsx, se retiró el modal antiguo de "Ver registro". En su lugar, el sistema redirige mediante el enrutador (
outer.push) directamente a los detalles del monitor en la vista de Registros, inyectando la fecha por parámetro de URL.
* Se modificó el gancho usarPaginacion.ts para proveer la función irA, la cual permite realizar saltos de página.
* La vista RegistrosPorDia.tsx fue dotada de un efecto (useEffect) que lee el parámetro de la URL, busca la posición del registro, salta a la página correspondiente de la tabla, y expande automáticamente el acordeón del día consultado.

### Flujo automático de Invalidación de Sesiones
* En el backend (Django), se extendió el WorkSessionViewSet (pps/work_sessions/api/views.py) con un nuevo endpoint (/api/v1/work-sessions/{id}/invalidate/), que expone a la API el servicio interno invalidate_work_session.
* Se actualizó servicioMonitores.ts en el frontend para incluir el nuevo contrato y consumir este endpoint.
* En GestionInconsistencias.tsx, se interceptó el error de *"sesión procesada"*. Al recibirlo, el frontend extrae el ID de la sesión y ejecuta de manera transparente y automática la invalidación de la sesión derivada, cerrando el modal con un aviso de éxito sin obligar al usuario a migrar de módulo.

### Optimización móvil del Calendario Dashboard
* En `CalendarioHorariosDashboard.tsx` se integró un nuevo selector de días (Lunes a Sábado) que permite al usuario móvil elegir qué día específico desea visualizar.
* Se agregó la lógica para que por defecto el sistema auto-seleccione el día actual de la semana (si es un día hábil).
* En `SistemaVisualMonitores.module.css` se introdujo un media query (`max-width: 850px`) que reescribe la cuadrícula CSS (`grid-template-columns`). Esto permite ocultar dinámicamente las columnas de los días inactivos y expandir la columna del día seleccionado al 100% del contenedor, erradicando la necesidad de scroll horizontal.

## VALIDACIÓN TÉCNICA

* Se corrió de manera exitosa el linter en el frontend (
pm run lint), validando la integridad del tipado y reglas de hooks.
* Se comprobó manualmente en Google Chrome (y sus perfiles móviles responsive) el correcto despliegue visual de los modales de Inconsistencias.
* Se validó el correcto cálculo y visualización gráfica del monitor "Ivan Felipe Prado Blanco" contemplando su condición de turno fragmentado en la base de datos de pruebas (ej. 08:00 a 10:00 y 14:00 a 16:00).
* Los 4 puntos de confirmación heredados en el informe previo fueron satisfactoriamente comprobados, usando las cuentas de Administrador y Lideres integrados en BD (dmin, leader.electrical, etc.).

## COSAS PENDIENTES

* (No se identifican pendientes técnicos bloqueantes derivados de estas tareas. Se sugiere proceder con pruebas de aceptación (UAT) en un ambiente de Staging para el flujo general integrado).

## ESTADO FINAL

El módulo de Inconsistencias es totalmente resolutivo desde su propia interfaz, y la trazabilidad visual del módulo de Registros por Día es ahora 100% fidedigna con la política de cruce contra el turno real. Los pendientes heredados sobre la validación y UX fueron resueltos en su totalidad.
