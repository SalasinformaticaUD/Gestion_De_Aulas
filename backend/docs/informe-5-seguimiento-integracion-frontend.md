# Informe 5 - Seguimiento de Integración Frontend, Aulas y Monitores

FECHA: 29/08/2026  
AUTORES: Equipo de desarrollo

## OBJETIVO DE LA JORNADA

Continuar la integración del frontend de Gestión de Aulas con las APIs reales,
corregir los errores identificados durante las pruebas manuales y dejar trazado el
trabajo aún necesario para validar el sistema completo, con especial atención a la
integración con Gestión de Monitores.

## AVANCES REALIZADOS

### Integración real del frontend

* Se sustituyeron flujos que conservaban datos solamente en el navegador por llamadas
  a los endpoints del backend en los módulos intervenidos.
* Se consolidó el uso del cliente autenticado de API para que las operaciones de
  consulta, creación, modificación y cierre informen los errores del servidor y no
  persistan cambios locales cuando la petición falla.
* Se expusieron y conectaron los catálogos requeridos para horarios, incluyendo
  docentes y estudiantes, de forma que los formularios no dependan de listas de
  prueba.
* Se eliminaron valores de demostración de las pantallas revisadas; una pantalla sin
  registros ahora muestra su estado vacío en lugar de inventar datos operativos.

### Aulas y disponibilidad

* El formulario de creación de aulas solicita el piso dentro del rango institucional
  de 1 a 7. El backend no tiene una columna física `piso`: el valor se conserva dentro
  de `ubicacion` y la API lo deriva para fines de consulta y presentación.
* Se añadió la edición de aulas existentes desde el módulo de Aulas, conectada al
  endpoint `PATCH /aulas/:id`.
* Se corrigió el envío de campos no admitidos por el DTO de Aulas; el frontend ya no
  envía la propiedad `piso` como parte del cuerpo de la petición.
* Se corrigió la etiqueta de piso para no mostrar artificialmente `Piso 0` cuando un
  aula no tiene piso identificable en su ubicación.
* La disponibilidad se consume desde `GET /disponibilidad-aulas`, que calcula el
  estado con las fuentes operativas del backend.

### Horarios académicos

* Se reemplazaron los bloques de horario anteriores por bloques consecutivos de dos
  horas, desde 06:00–08:00 hasta 20:00–22:00.
* El selector de aulas se carga desde la API y las clases se consultan y persisten en
  el backend, por lo que permanecen visibles después de recargar la página.
* Se incorporó la selección global de período académico en la pantalla. El período
  se elige una vez para el contexto del horario y no se solicita de nuevo por cada
  clase.
* Se añadió el alta de períodos académicos desde el frontend para instalaciones con
  una base de datos vacía. Al crearlo, queda activo y seleccionado en la pantalla.
* La creación de una clase usa la importación de horarios soportada por la API y
  solicita los datos mínimos de asignatura y docente exigidos por ese contrato.

### Préstamos docentes

* La solicitud de préstamo ya no ofrece simplemente las aulas cuyo catálogo figure
  como disponibles. Al modificar fecha o bloque consulta la disponibilidad calculada
  por la API y muestra únicamente las aulas con estado `disponible` en ese intervalo.
* Se corrigió la normalización del estado devuelto por el backend: el servicio emite
  `disponible` en minúsculas y el frontend estaba comparando contra `DISPONIBLE`, lo
  que impedía que apareciera cualquier aula.
* Al cambiar fecha u horario se limpia el aula seleccionada para impedir enviar una
  selección obtenida para un bloque anterior.
* La creación y la aprobación continúan sujetas a la validación del backend, que es
  la fuente de verdad ante cruces o cambios concurrentes.

### Estabilidad de pantallas administrativas y operativas

* Se conectó la administración de usuarios a sus endpoints de consulta, creación y
  actualización, y se ajustó el diseño responsive que comprimía los campos del
  formulario.
* Se protegieron flujos de audiovisuales y software frente a catálogos vacíos para
  evitar errores de acceso a elementos inexistentes.
* Se corrigieron formularios para no reflejar como guardada una operación que haya
  sido rechazada por la API.

### Integración con Gestión de Monitores

* Se mantiene la integración entre aplicaciones por HTTP, sin compartir la base de
  datos. El backend de Aulas usa `MONITORES_API_URL`, timeout y contratos tipados.
* Se conserva la consulta de estado y de usuario vinculado de Monitores, además del
  aprovisionamiento interno de usuarios mediante
  `POST /integraciones/monitores/usuarios` y el encabezado de servicio configurado.
* La documentación de contrato existente en `docs/contracts/integracion-monitores.md`
  sigue siendo la referencia para configurar ambos servicios.

## VALIDACIONES EJECUTADAS

En esta etapa se validó satisfactoriamente:

* Frontend: `npx tsc --noEmit` aprobado tras las correcciones de horarios y préstamos
  docentes.
* Frontend: `npm run lint` aprobado tras las correcciones de horarios y préstamos
  docentes.
* Backend: compilación realizada satisfactoriamente después de retirar el campo
  `piso` no soportado del DTO de creación de aulas.
* Revisión de contrato: el cálculo de disponibilidad del backend retorna el estado
  `disponible` en minúsculas, coherente con sus pruebas unitarias y con las
  validaciones de préstamos y prácticas libres.

Estos resultados verifican tipos, reglas estáticas y el ajuste del contrato. No
reemplazan las pruebas integrales de navegador ni el smoke test entre servicios.

## PENDIENTES PARA CERRAR LA INTEGRACIÓN AL 100%

### Pruebas funcionales de Gestión de Aulas

1. Ejecutar una matriz manual completa con una base limpia: crear aula, editar aula,
   crear período, programar clase, consultar disponibilidad, solicitar y aprobar
   préstamo docente, registrar práctica libre y verificar el panel operativo.
2. Probar casos de conflicto: dos solicitudes para la misma aula/bloque, aula en
   mantenimiento, clase programada, tarea que bloquea disponibilidad y cancelación
   durante la aprobación.
3. Verificar el ciclo de vida de todos los préstamos: solicitado, aprobado, activo,
   finalizado, cancelado y vencido, incluyendo permisos por rol.
4. Ejecutar pruebas de regresión de los demás módulos conectados: audiovisuales,
   software instalado, credenciales, observaciones, limpieza, tareas, multas,
   reportes y auditoría.
5. Ejecutar las pruebas automatizadas completas del backend y sus pruebas e2e en una
   base de prueba separada; no se debe inferir su resultado solo desde la compilación
   del frontend.
6. Actualizar y ejecutar la colección de Postman contra un entorno recién iniciado,
   incluyendo autenticación, permisos insuficientes, validaciones de DTO y errores de
   disponibilidad.

### Revisión pendiente de Gestión de Monitores

1. Levantar Aulas y Monitores simultáneamente con sus variables reales de entorno y
   ejecutar un smoke test: `/health`, autenticación, consulta de usuario vinculado y
   aprovisionamiento idempotente.
2. Comprobar que los JWT, secretos de servicio, CORS, URL base y timeouts configurados
   coincidan en ambos entornos, sin exponer secretos en el repositorio.
3. Recorrer todos los módulos de Monitores con datos reales: cuentas, monitores,
   horarios, registros de asistencia, excepciones, memorandos, actas, históricos y
   reportes. Debe verificarse que cada pantalla consuma su endpoint y gestione los
   estados vacío, carga, error y permisos insuficientes.
4. Comparar los DTOs y respuestas reales de Monitores con el contrato documentado,
   especialmente campos de identidad, estado de monitor, dependencias, períodos y
   paginación.
5. Probar altas, cambios y desactivaciones de usuario en ambos sentidos para definir
   la política de sincronización, conservación de vínculos y tratamiento de fallos.
6. Revisar autorización de módulos y permisos de Monitores con perfiles de
   administrador, coordinador, monitor y usuario sin permisos.

### Entrega y despliegue

1. Realizar una revisión visual responsive de las pantallas en escritorio y móvil,
   empezando por Usuarios, Aulas, Horarios y Préstamos Docentes.
2. Preparar configuración de despliegue con las URL de producción, migraciones y seed
   administrativo controlado.
3. Confirmar copias de seguridad y restauración antes de cualquier limpieza de datos
   en ambientes compartidos.
4. Agrupar las correcciones que siguen en cambios revisables, ejecutar validaciones y
   crear commits de entrega antes del despliegue.

## ESTADO ACTUAL

La integración del frontend de Gestión de Aulas avanza sobre APIs reales y los
defectos detectados en aulas, horarios, usuarios y préstamos docentes han sido
corregidos en el código de trabajo. Las validaciones estáticas actuales están en verde.

El sistema aún no debe declararse listo para despliegue definitivo. Falta realizar la
matriz de pruebas funcionales y de concurrencia, ejecutar las pruebas completas de
backend y e2e, y hacer el smoke test real de punta a punta con Gestión de Monitores.
La revisión de Monitores permanece como frente prioritario antes del cierre final.
