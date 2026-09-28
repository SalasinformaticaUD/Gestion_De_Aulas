# Plan general de implementación — Solicitudes de instalación de software

Fecha base: 21/09/2026

Este plan cubre frontend y backend para incorporar al Sistema de Gestión Operativa de las Aulas de Software un módulo que importe, normalice, revise y tramite las respuestas del formulario institucional de solicitudes de instalación.

El módulo representa la **demanda de instalación**. No reemplaza el catálogo de software ni el inventario de programas instalados por aula. Una solicitud aprobada genera tareas operativas; el inventario instalado solo se actualiza cuando la instalación haya sido confirmada.

---

## 0. Objetivo y alcance

El módulo deberá permitir:

- importar el archivo Excel de respuestas del formulario;
- validar su estructura y conservar los datos originales;
- convertir las columnas repetidas de software adicional en una colección variable de ítems;
- normalizar docentes, periodos y aulas; conservar proyectos curriculares, asignaturas y software como texto original;
- identificar información incompleta, ambigua o duplicada para revisión humana;
- consultar solicitudes actuales e históricas;
- aprobar total o parcialmente una solicitud, o rechazarla con justificación;
- crear automáticamente tareas operativas de instalación a partir de cada software aprobado;
- conservar trazabilidad entre la fila del Excel, la solicitud, el software normalizado y las tareas generadas.

Fuera del alcance inicial:

- modificar Microsoft Forms o integrarse directamente con él;
- decidir automáticamente que una coincidencia ambigua es correcta;
- considerar un programa como instalado únicamente porque la solicitud fue aprobada;
- ejecutar instalaciones remotas en los equipos;
- enviar notificaciones institucionales hasta que se defina el canal de correo.

---

## 1. Reglas generales

- [x] Implementar el módulo NestJS en `backend/src/solicitudes-instalacion`.
- [x] Agregar el módulo y sus contratos al mapa técnico del backend.
- [x] Reutilizar `PrismaService`, autenticación, permisos, auditoría y formato común de errores.
- [x] Reutilizar los catálogos existentes de docentes, periodos y aulas; no exigir relaciones de catálogo para proyecto, asignatura o software.
- [x] No modificar directamente la base de Gestión de Monitores.
- [x] No duplicar la lógica del módulo de Tareas Operativas.
- [x] No crear instalaciones en `AulaSoftware` durante la importación o aprobación.
- [x] Procesar la aprobación y la creación de tareas dentro de una transacción.
- [x] Conservar siempre el texto original importado, aunque exista un valor normalizado.
- [x] Evitar duplicar importaciones mediante huella del archivo y referencia de fila/origen.
- [x] Proteger los datos personales mediante permisos y auditoría.
- [x] Considerar aceptado el tratamiento de datos dentro del flujo institucional, sin confirmación manual adicional.

---

## 2. Modelo funcional

### 2.1 Entidades propuestas

#### `ImportacionSolicitudInstalacion`

Representa cada archivo cargado.

- nombre del archivo;
- hash o huella del archivo;
- fecha de carga;
- usuario responsable;
- estado: `PROCESANDO`, `COMPLETA`, `PARCIAL` o `FALLIDA`;
- cantidades procesadas, creadas, repetidas, observadas y rechazadas;
- detalle general de errores.

#### `SolicitudInstalacion`

Representa una respuesta del formulario.

- identificador original de la respuesta;
- fila original del Excel;
- fecha y hora de la petición;
- docente y correo institucional;
- proyecto curricular;
- periodo académico calculado o asignado;
- aulas solicitadas;
- observación general;
- aceptación de tratamiento de datos;
- estado de la solicitud;
- copia de los valores originales necesarios para trazabilidad.

Estados recomendados:

```text
PENDIENTE_REVISION
REQUIERE_AJUSTES
APROBADA_PARCIAL
APROBADA
EN_EJECUCION
FINALIZADA
RECHAZADA
CANCELADA
```

#### `ItemSolicitudInstalacion`

Representa cada asignatura incluida en una respuesta. Sustituye las columnas fijas de “solicitud adicional 1, 2, 3...” del Excel.

- solicitud padre;
- posición dentro de la respuesta;
- asignatura original y asignatura normalizada;
- observaciones particulares;
- aulas originales y aulas normalizadas;
- estado de revisión del ítem.

#### `SoftwareSolicitado`

Representa cada programa solicitado dentro de un ítem.

- nombre y versión originales;
- `softwareId` normalizado, cuando exista coincidencia con el catálogo;
- nombre y versión normalizados;
- estado de normalización: `PENDIENTE`, `COINCIDENCIA`, `NUEVO`, `AMBIGUO` o `DESCARTADO`;
- decisión y usuario revisor;
- tareas operativas generadas.

#### Relaciones auxiliares

- `ItemSolicitudAula`: relación entre un ítem y una o varias aulas.
- `SolicitudSoftwareTarea`: relación trazable entre un software solicitado y las tareas operativas creadas.
- `AliasSoftware`: equivalencias controladas, por ejemplo `R Studio` → `RStudio` o `Excell` → `Microsoft Excel`.
- `AliasAula`: equivalencias entre textos del formulario y aulas registradas.

### 2.2 Regla de creación de tareas

- Cada software aprobado genera una tarea operativa de instalación.
- Si una solicitud contiene varios programas, se generan tareas diferentes para cada software.
- Si el mismo software debe instalarse en varias aulas, se utilizará el mecanismo de grupo existente en Tareas Operativas: una tarea por aula con el mismo `grupoId`.
- No se deben crear dos veces las tareas de un mismo `SoftwareSolicitado` y aula.
- La tarea debe incluir como mínimo:
  - título `Instalar <software> <versión>`;
  - aula;
  - docente solicitante;
  - proyecto curricular;
  - asignatura;
  - observaciones y enlaces originales;
  - referencia a la solicitud y al software solicitado;
  - prioridad inicial configurable, por defecto `MEDIA`;
  - estado inicial `PENDIENTE`.
- Cuando todas las tareas asociadas terminen, la solicitud puede pasar a `FINALIZADA`.
- Completar una tarea no debe crear automáticamente `AulaSoftware`. La confirmación de instalación deberá ser explícita para evitar que una tarea cancelada, parcial o fallida altere el inventario real.

---

## 3. Importación y normalización

### 3.1 Flujo de importación

1. El usuario autorizado selecciona el archivo Excel.
2. El backend valida extensión, tamaño, hoja, encabezados y columnas mínimas.
3. Se calcula la huella del archivo y se advierte si ya fue procesado.
4. Cada fila se transforma en una `SolicitudInstalacion`.
5. Los cinco bloques posibles de asignatura/software se convierten en ítems relacionados.
6. Se ejecuta la normalización y se clasifican las coincidencias.
7. El sistema muestra una previsualización con válidos, observados, ambiguos y duplicados.
8. El usuario confirma la importación.
9. Se guarda el lote y se presenta un resumen descargable de errores.

La importación inicial puede ser síncrona porque el archivo actual es pequeño. Se debe mantener un límite configurable y dejar la ejecución en segundo plano como evolución futura, no como requisito del MVP.

### 3.2 Normalización

La normalización debe ser determinista y auditable:

- eliminar espacios sobrantes y unificar mayúsculas/minúsculas para comparación;
- conservar tildes y texto original para presentación;
- validar y normalizar correos institucionales sin reemplazar silenciosamente valores inválidos;
- conservar proyecto curricular y asignatura como texto plano sin exigir una relación de catálogo;
- extraer como aulas todas las secuencias independientes de exactamente tres dígitos;
- separar listas de software por saltos de línea, punto y coma y viñetas;
- tratar las comas con cautela, porque pueden separar software o formar parte de una descripción;
- conservar el nombre y la versión del software dentro del texto solicitado, permitiendo programas nuevos;
- enviar coincidencias ambiguas a revisión manual.

No se recomienda usar inteligencia artificial como autoridad automática durante el MVP. Puede incorporarse posteriormente para sugerir coincidencias, pero la aceptación debe permanecer en manos de un usuario autorizado.

### 3.3 Duplicados

El sistema debe advertir posibles duplicados usando, como mínimo:

- identificador original del formulario;
- docente;
- fecha de petición;
- proyecto curricular;
- asignatura;
- software y versión;
- aulas solicitadas.

Un duplicado potencial no se elimina automáticamente. El revisor decide si se conserva, se fusiona o se descarta.

---

## 4. Backend NestJS

### 4.1 Responsabilidades internas

- `SolicitudesInstalacionController`: contratos HTTP y permisos.
- `SolicitudesInstalacionService`: consulta, estados, aprobación y rechazo.
- `ImportacionSolicitudesService`: lectura y validación del Excel.
- `NormalizacionSolicitudesService`: docentes, periodos y aulas; proyecto, asignatura y software se preservan como texto.
- `GeneracionTareasInstalacionService`: integración transaccional con Tareas Operativas.
- DTOs específicos para importación, filtros, corrección, aprobación y rechazo.

### 4.2 Contratos REST propuestos

```text
POST  /solicitudes-instalacion/importaciones
GET   /solicitudes-instalacion/importaciones
GET   /solicitudes-instalacion/importaciones/:id
GET   /solicitudes-instalacion
GET   /solicitudes-instalacion/:id
PATCH /solicitudes-instalacion/:id
PATCH /solicitudes-instalacion/:id/items/:itemId
POST  /solicitudes-instalacion/:id/aprobar
POST  /solicitudes-instalacion/:id/rechazar
POST  /solicitudes-instalacion/:id/reabrir
GET   /solicitudes-instalacion/:id/tareas
GET   /solicitudes-instalacion/exportar
```

Filtros mínimos:

- vista `actuales` o `historial`;
- periodo académico;
- estado;
- fecha inicial y final;
- docente;
- proyecto curricular;
- aula;
- asignatura;
- software;
- texto libre;
- paginación y ordenamiento.

La aprobación debe recibir explícitamente los ítems y programas aceptados para permitir aprobación parcial. Debe devolver las tareas creadas, las ya existentes y cualquier elemento que no pudo procesarse.

### 4.3 Permisos

Agregar el módulo `SOLICITUDES_INSTALACION` y aplicar permisos en backend:

- `SOLICITUDES_INSTALACION_LEER`;
- `SOLICITUDES_INSTALACION_IMPORTAR`;
- `SOLICITUDES_INSTALACION_ACTUALIZAR`;
- `SOLICITUDES_INSTALACION_APROBAR`;
- `SOLICITUDES_INSTALACION_RECHAZAR`;
- `SOLICITUDES_INSTALACION_EXPORTAR`.

La visibilidad del frontend debe acompañar estos permisos, pero no sustituir su validación en la API.

### 4.4 Auditoría e idempotencia

Registrar como mínimo:

- carga del archivo;
- confirmación de importación;
- correcciones de normalización;
- fusión o descarte de duplicados;
- aprobación total o parcial;
- rechazo y motivo;
- creación de tareas;
- reapertura o cancelación.

La aprobación debe ser idempotente: repetir la solicitud HTTP no puede crear tareas duplicadas.

---

## 5. Frontend

### 5.1 Ruta y navegación

Agregar una opción `Solicitudes de instalación` al menú de Gestión de Aulas, visible según permisos.

Ruta sugerida:

```text
/solicitudes-instalacion
```

### 5.2 Vista principal

La pantalla tendrá tres secciones:

#### `Peticiones actuales`

Incluye solicitudes del periodo activo que no están en estado terminal.

- indicadores de pendientes, con ajustes, aprobadas y en ejecución;
- búsqueda y filtros;
- tabla o tarjetas con fecha, docente, proyecto, asignaturas, aulas, cantidad de programas y estado;
- señal visible para datos incompletos, ambiguos o duplicados;
- acciones según permiso: revisar, corregir, aprobar o rechazar.

#### `Historial`

Incluye solicitudes finalizadas, rechazadas, canceladas y solicitudes de periodos anteriores.

- mismos campos de consulta de la vista actual;
- filtros por periodo y estado;
- acceso de solo lectura al detalle, decisiones y tareas generadas;
- exportación del resultado filtrado.

La clasificación inicial de una importación aplica primero el corte del 15 de julio de 2026: las peticiones anteriores pasan al historial. Desde esa fecha, una solicitud pasa al historial cuando al menos una de sus celdas de software está marcada con relleno verde; las demás permanecen en peticiones actuales. Los estados terminales y periodos cerrados continúan formando parte del historial durante la operación posterior.

#### `Importar Excel`

Flujo guiado:

1. cargar archivo;
2. validar estructura;
3. revisar resumen y posibles duplicados;
4. resolver coincidencias ambiguas;
5. confirmar importación;
6. mostrar resultado final.

### 5.3 Detalle de solicitud

Debe mostrar:

- fecha y origen de la petición;
- docente y correo;
- proyecto curricular;
- periodo académico;
- aulas originales y normalizadas;
- una tarjeta por asignatura;
- listado separado de todos los programas y versiones solicitadas;
- texto original junto al valor normalizado cuando difieran;
- observaciones y enlaces;
- aceptación de tratamiento de datos;
- alertas de información incompleta;
- historial de decisiones;
- tareas operativas creadas y su estado.

La aprobación permitirá seleccionar individualmente asignaturas, software y aulas. Antes de confirmar debe presentarse una previsualización de las tareas que serán creadas.

---

## 6. Integraciones con módulos existentes

### Software instalado

- No exigir que el software solicitado exista en el catálogo para aprobar y crear tareas.
- No crear relaciones `AulaSoftware` durante la importación o aprobación.
- Al terminar una tarea de instalación, ofrecer una acción explícita para confirmar la instalación y actualizar el inventario del aula.

### Tareas operativas

- Crear tareas mediante el servicio del módulo, no escribiendo directamente sus tablas.
- Conservar estados, responsables, auditoría, seguimientos y reglas de tareas existentes.
- Utilizar tareas agrupadas cuando un software deba instalarse en varias aulas.

### Aulas, docentes, asignaturas y proyectos

- Reutilizar los catálogos existentes.
- No crear aulas automáticamente desde texto libre.
- Los docentes o proyectos no encontrados deben quedar como observados hasta revisión.
- Conservar el valor original aunque se asocie con un catálogo.

### Panel operativo

- No incluir todas las solicitudes pendientes en el panel diario.
- Mostrar únicamente tareas de instalación ya aprobadas cuando correspondan a la operación actual.

---

## 7. Entrega por incrementos

### Incremento 1 — Contrato y persistencia

- [x] Definir modelos Prisma y migración.
- [x] Registrar módulo y permisos.
- [x] Implementar importación con preservación de valores originales.
- [x] Convertir columnas repetidas en ítems y programas relacionados.
- [x] Implementar consultas paginadas de solicitudes actuales e históricas.
- [x] Documentar formato admitido y respuesta de importación.

### Incremento 2 — Normalización y revisión

- [x] Implementar alias y coincidencia por código para aulas.
- [x] Relacionar docentes, periodos y aulas existentes; preservar proyecto, asignatura y software como texto.
- [x] Identificar ambiguos, incompletos y duplicados.
- [x] Crear flujo frontend de importación y previsualización.
- [x] Crear listado, filtros y detalle de solicitud.
- [x] Permitir corrección manual sin perder el valor original.

### Incremento 3 — Aprobación e integración operativa

- [x] Implementar aprobación total y parcial.
- [x] Implementar rechazo obligatorio con motivo.
- [x] Crear tareas idempotentes, una por software y aula.
- [x] Mostrar en la solicitud el progreso de sus tareas.
- [x] Actualizar el estado de la solicitud según las tareas relacionadas.
- [x] Preparar confirmación explícita hacia el inventario instalado.

### Incremento 4 — Calidad y cierre

- [x] Exportar solicitudes filtradas y resultados de importación.
- [x] Integrar auditoría completa.
- [x] Validar permisos con perfiles diferentes.
- [x] Probar archivos históricos, filas incompletas y cargas repetidas.
- [x] Revisar modo claro, oscuro y diseño responsive.
- [x] Actualizar documento general, mapa de módulos y contratos técnicos.

---

## 8. Pruebas mínimas

### Backend

- [x] Archivo válido, inválido y previamente importado.
- [x] Conversión de una fila con uno, dos y cinco bloques de solicitud.
- [x] Separación de varios programas dentro de una celda.
- [x] Coincidencia de aulas por código o alias y caso ambiguo.
- [x] Aula, docente o proyecto inexistente.
- [x] Consentimiento no aceptado.
- [x] Duplicado potencial conservado para revisión.
- [x] Aprobación total y parcial.
- [x] Creación de una tarea por software y aula.
- [x] Repetición de aprobación sin tareas duplicadas.
- [x] Rechazo con motivo y auditoría.

### Frontend

- [ ] Importación y previsualización del Excel real.
- [x] Filtros y paginación de actuales e historial.
- [x] Visualización de varias asignaturas y varios programas.
- [x] Corrección de valores ambiguos.
- [x] Previsualización y confirmación de tareas.
- [x] Restricciones visuales y de API por permisos.
- [x] Estados de carga, vacío, error y procesamiento parcial.

### Flujo E2E principal

```text
Importar Excel
→ revisar solicitud
→ normalizar software y aulas
→ aprobar parcialmente o totalmente
→ crear tareas operativas
→ ejecutar tareas
→ finalizar solicitud
→ confirmar inventario instalado cuando corresponda
```

---

## 9. Criterio de cierre

El módulo se considera terminado cuando:

- el archivo real puede importarse sin alterar sus datos originales;
- cada respuesta se representa como una solicitud con ítems y programas variables;
- los valores normalizados pueden revisarse y corregirse;
- las vistas de peticiones actuales e historial muestran toda la información relevante;
- la aprobación genera las tareas correctas sin duplicados;
- la solicitud conserva el vínculo y progreso de cada tarea;
- los permisos se validan en frontend y backend;
- existe auditoría de importación, normalización y decisiones;
- las pruebas unitarias, E2E, TypeScript y compilaciones finalizan correctamente;
- el módulo queda documentado en el documento general y en el mapa técnico del proyecto.

---

## 10. Orden recomendado

1. Definir modelos y contrato de importación.
2. Importar preservando datos originales.
3. Normalizar y resolver ambigüedades.
4. Construir vistas de actuales, historial y detalle.
5. Implementar aprobación total/parcial.
6. Integrar con Tareas Operativas de forma idempotente.
7. Incorporar seguimiento y confirmación de inventario instalado.
8. Cerrar permisos, auditoría, pruebas y documentación.

Este orden evita construir primero una interfaz sobre datos todavía ambiguos y protege la trazabilidad desde la respuesta original hasta la instalación confirmada.
