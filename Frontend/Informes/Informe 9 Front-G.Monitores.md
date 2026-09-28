FECHA: 23/09/2026  
TURNO: 12:00 p. m. a 6:00 p. m.  
MONITOR: Julian Romero

## OBJETIVO DEL AVANCE

Corregir y mejorar los módulos de Gestión de Monitores, Horarios y Actas, garantizando que la información se guarde correctamente, se refleje en el dashboard y pueda consultarse mediante filtros e historial. También se buscó optimizar la visualización responsive del horario individual y mantener la identidad visual del aplicativo.

## AVANCES

* Se ajustó la vista del horario individual del monitor para que la hora y el lugar se visualicen centrados dentro de cada bloque.
* Se optimizó la distribución del horario en dispositivos móviles, reduciendo el espacio vertical desperdiciado y manteniendo la lectura de los datos.
* Se corrigió el dashboard para excluir los horarios de monitores que se encuentren desactivados.
* Se corrigió la edición de horarios. El backend ya reconoce la instancia existente al validar una modificación y no la interpreta como un registro nuevo duplicado.
* Se garantizó que los cambios de día, hora, ubicación, asignatura, grupo, docente y estado puedan guardarse correctamente.
* Después de editar un horario, la vista vuelve a consultar la API para mostrar la información persistida tanto en Horarios como en el dashboard.
* Se corrigió la actualización visual de las actas después de aceptar o rechazar una revisión.
* Se agregó la fecha de revisión junto al estado del acta para dejar visible cuándo fue aceptada o rechazada.
* Se corrigió el filtro de Estado del acta para que responda inmediatamente al seleccionar Pendiente, Aceptada o Rechazada.
* Se incorporó el periodo académico vigente `2026-3` al selector de Historial, junto con los periodos anteriores disponibles.
* Se ajustó el historial para permitir consultar actas por periodo académico, estado y dependencia.
* Se incorporó y ajustó el logo específico de Monitores en la aplicación destinada a los monitores, mejorando su tamaño y visibilidad.

## TRABAJO REALIZADO SOBRE APIS

* Se mantuvo el consumo de los endpoints de horarios mediante las operaciones de consulta, actualización y recarga posterior al guardado.
* Se corrigió la validación del serializer de horarios para que las reglas de unicidad excluyan el propio registro cuando se está editando.
* Se mantuvo el endpoint de revisión de actas para persistir las decisiones de aceptación o rechazo, el motivo y la fecha de revisión.
* La consulta de actas se actualiza después de cada revisión para sincronizar la información mostrada con los datos almacenados en la API.

## FUNCIONA EN MODO DEMO

Para verificar los cambios se pueden consultar los siguientes flujos:

* Dashboard del monitor con horario semanal individual.
* Horario responsive en escritorio y dispositivos móviles.
* Edición y guardado de horarios desde el módulo Horarios.
* Exclusión de horarios pertenecientes a monitores desactivados.
* Gestión actual de actas con estados Pendiente, Aceptada y Rechazada.
* Historial de actas seleccionando el periodo académico `2026-3` o un periodo anterior.
* Filtros por estado, búsqueda y dependencia.

## PARTES FALTANTES DEL FRONTEND

* Realizar pruebas integradas en navegador con usuarios de administrador, líder y monitor.
* Validar visualmente los filtros del historial con datos reales de cada periodo académico.
* Incorporar pruebas automatizadas de regresión para edición de horarios, cambio de estado de actas y consulta histórica.
* Revisar tamaños intermedios y móviles cuando existan lugares o nombres extensos en los bloques del horario.

## ANOTACIÓN DE CONTINUIDAD ENTRE APLICATIVOS

Los filtros, estados y mensajes mostrados en el frontend dependen de la información persistida por las APIs de Monitores. La autorización efectiva de las acciones de edición y revisión continúa siendo responsabilidad del backend.

Se recomienda verificar cada cambio con el periodo académico correcto: para consultar las actas del semestre vigente se debe seleccionar `2026-3` en la pestaña **Historial**.

## POSIBLES MEJORAS

* Agregar un historial detallado de cada cambio de estado, incluyendo usuario revisor, fecha, decisión y motivo.
* Añadir indicadores separados para actas pendientes, aceptadas y rechazadas por periodo.
* Incorporar pruebas de regresión visual para el horario responsive y las tablas de actas.
* Mostrar un mensaje contextual cuando el periodo seleccionado no tenga actas que coincidan con el estado filtrado.

## REVISIÓN LOCAL

* Se ejecutó la compilación de producción del frontend correctamente.
* Se ejecutó ESLint sobre el componente de actas sin errores funcionales.
* Se verificó la validación del backend para la edición de horarios.
* Se confirmó que los estados de revisión de actas y sus fechas se almacenan en la base de datos.