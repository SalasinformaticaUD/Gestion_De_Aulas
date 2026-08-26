# Informe 6 - Frontend: Gestión de Monitores

FECHA: 26/08/2026  
TURNO: 6:00 a.m. a 10:00 a.m.  
MONITOR: Alejandro Orjuela

## OBJETIVO DEL AVANCE

Se continuó el ajuste de la migración visual del aplicativo anterior de monitores dentro de **Gestión de Monitores**. El objetivo fue acercar la navegación, el orden de los apartados, los formularios, las tablas y las acciones disponibles a la disposición conocida por los usuarios del aplicativo anterior, conservando el sistema visual, el modo oscuro y la responsividad del aplicativo actual.

El alcance sigue siendo de modelación frontend en modo demostración. Las conexiones con servicios no se toman como pendiente de este informe; la capa de APIs ya preparada se conserva para la fase de integración.

## AVANCES

* Se reorganizó la navegación de Gestión de Monitores con el orden operativo del aplicativo anterior: Dashboard, Monitores, Horarios, Horas extra, Memorandos, Actas, Históricos, Importar registros, Conciliación, Anotaciones, Inconsistencias y Excepciones.
* Se añadió al pie del menú una salida clara hacia el selector principal de aplicativos mediante **Volver al inicio**, sin condicionar al usuario a ingresar directamente al otro aplicativo. También se conservó la acción de cierre de sesión.
* Se incorporó la consulta por código como el primer bloque del Dashboard, ya que corresponde a la consulta pública que estaba presente en el aplicativo anterior.
* Se actualizó el bloque **Horas por monitor** del Dashboard con las columnas: Monitor, Normales (h), Horas extra aprobadas (h), Horas extra por aprobar (h), Anotaciones (h), Total (h), Faltan para 192 h y Acciones.
* Se organizaron los monitores del Dashboard en menús desplegables por dependencia, con paginación independiente y exportación visual de los resultados por dependencia.
* Se cambió el apartado de registros del panel por **Historial reciente de registros** e incorporó la columna Monitor, manteniendo acciones de acceso a detalle y exportación demostrativa.
* Se ajustó la vista **Monitores** para reflejar el formulario del aplicativo anterior: nombre completo, código estudiantil, número de documento, correo institucional, proyecto curricular, teléfono, dependencia y confirmación de monitoría previa.
* Se añadieron el botón de búsqueda, filtros por estado, alertas y orden, indicadores de total, activos, pendientes e inactivos, acciones de editar, activar/desactivar, reenviar y eliminar, exportación visual y carga masiva en Monitores.
* Se actualizó la vista **Horarios** con los indicadores iniciales de horarios, activos, inactivos y monitores.
* Se reestructuró el formulario de asignación manual de horario con los campos Monitor, Día, Hora inicio, Hora fin, Asignatura, Grupo, Docente, Proyecto curricular, Ubicación y estado Activo.
* Se añadió la carga masiva debajo de la asignación manual y se organizó el buscador de horarios con los campos Buscar, Monitor, Día, Estado y su botón de consulta.
* Se corrigieron las columnas de Horarios registrados a: Monitor, Día, Inicio, Fin, Datos académicos, Ubicación, Estado y Acciones. Las acciones se mantienen en editar y eliminar.
* Se trasladó el calendario semanal al final de la vista y se añadió el selector de monitor, evitando una columna fija que afectaba la lectura de los registros.
* Se actualizó **Horas extra** para incluir el campo Registro al momento de aprobar o rechazar una solicitud y se mantuvo la denominación **Horas extra por aprobar (h)**.
* Se consolidó una hoja de estilos compartida para las vistas de monitores, alineada con los patrones de tarjetas, tablas, formularios, insignias, estados, modo oscuro y puntos de quiebre utilizados por Gestión de Aulas.
* Se mantuvo el comportamiento responsivo: formularios en una columna en pantallas reducidas, controles que se adaptan al ancho disponible y desplazamiento horizontal controlado en tablas extensas.

## TRABAJO REALIZADO SOBRE APIS

El módulo continúa operando en modo demo, pero se preservó y aprovechó el trabajo de preparación de integración realizado previamente:

* Se conservaron los contratos, adaptadores y el servicio central de monitores para recursos como monitores, horarios, asistencia, anotaciones, sesiones, importaciones, conciliaciones y Dashboard.
* Se mantuvo documentado el mapeo entre las rutas del backend y las necesidades visuales en `src/features/monitores/api/mapeoEndpoints.md`.
* Las nuevas vistas reutilizan los modelos y datos de demostración con estructura compatible con dichos contratos, evitando que una integración posterior obligue a rediseñar la interfaz.
* La configuración de modo demo continúa separando la simulación visual del consumo efectivo de APIs, para poder validar los flujos sin depender del backend.

## FUNCIONA EN MODO DEMO

* Navegación completa por las secciones de Gestión de Monitores y retorno al selector principal de aplicativos.
* Consulta por código, directorio de monitores, filtros, búsqueda, acciones locales, agrupación por dependencia y exportaciones visuales.
* Registro y edición visual de monitores con la distribución de campos solicitada.
* Asignación manual de horarios, carga masiva simulada, filtros de horarios, edición/eliminación visual y calendario semanal por monitor.
* Registro y decisión visual de horas extra, incluyendo el campo Registro.
* Visualización de Memorandos, Actas, Históricos, Importar registros, Conciliación, Anotaciones, Inconsistencias y Excepciones desde la navegación principal.
* Aplicación de estilos coherentes en modo claro y oscuro, con controles y tablas adaptables a escritorio, tableta y móvil.
* Verificación estática realizada mediante `npm run lint` y `npx tsc --noEmit`.

## PARTES FALTANTES DEL FRONTEND

Estas tareas corresponden a continuidad visual y funcional de la demo, no a conexión de APIs:

* Rectificar y refactorizar cada sección del aplicativo de monitorias frente al software anterior. Aún existen diferencias de campos, nombres, orden de bloques, columnas, acciones y textos de ayuda en algunos apartados.
* Contrastar detalladamente Memorandos, Actas, Históricos, Importar registros, Conciliación, Anotaciones, Inconsistencias y Excepciones con sus flujos históricos para completar todos sus subapartados y convenciones.
* Definir las vistas de detalle que correspondan a **Ver registro** y a la consulta de un monitor, de modo que ambas presenten la misma información consolidada cuando el aplicativo anterior así lo hacía.
* Completar acciones demostrativas de ver, editar, descargar, confirmar y eliminar en documentos e históricos cuando se conozcan los formatos institucionales definitivos.
* Revisar visualmente todos los formularios en puntos de quiebre pequeños para confirmar que ningún frame lateral corte campos, botones o mensajes de validación.
* Refinar ayudas de campo, mensajes vacíos, confirmaciones y convenciones de estado para que los formularios sean más claros y consistentes.

## ANOTACIÓN DE CONTINUIDAD ENTRE APLICATIVOS

Gestión de Aulas debe mantenerse como referencia del sistema de diseño: estructura de encabezados, tarjetas, formularios, tablas, contraste, modo oscuro, responsividad y retroalimentación visual. Sin embargo, la referencia funcional y de contenido de Gestión de Monitores debe ser el aplicativo anterior de monitores.

La opción más óptima para conseguir una migración fiel es elaborar una matriz por sección con cuatro columnas: **elemento del aplicativo anterior**, **equivalente actual**, **diferencia detectada** y **ajuste requerido**. Esta matriz debe cubrir menú, encabezado, métricas, formularios, filtros, tablas, acciones, mensajes y vistas de detalle. De este modo se conserva el lenguaje visual unificado de Gestión de Aulas sin perder campos, columnas ni flujos propios de Monitorias.

Como prioridad, se recomienda realizar dicha comparación primero en Monitores y Horarios.

## POSIBLES MEJORAS

* Crear un inventario visual verificable, con capturas del aplicativo anterior y criterio de aceptación por cada sección migrada.
* Unificar botones de exportación, acciones de fila, confirmaciones y estados en componentes reutilizables del módulo.
* Añadir una vista consolidada del monitor que agrupe datos personales, horarios, asistencia, horas extra, anotaciones y documentos.
* Incorporar selector de periodo académico en las vistas que consultan información histórica o indicadores.
* Añadir validaciones visuales de traslapes de horario, registros duplicados y obligatoriedad condicional.
* Mejorar la accesibilidad con navegación por teclado, foco visible, etiquetas asociadas a cada control y contraste revisado en ambos temas.

## REVISIÓN LOCAL

Ejecutar desde la carpeta Frontend:

```bash
cd "C:\\Users\\MONITORES\\Documents\\Software Monitorias\\Frontend"
npm install
npm run dev
```

Luego abrir:

* http://localhost:3000/gestion-monitores
* http://127.0.0.1:3000/gestion-monitores

> Importante: el módulo se encuentra en modo demostración. Las operaciones realizadas durante la sesión son temporales y se reinician al recargar la página. La integración efectiva con los servicios corresponde a una etapa posterior; el mapeo y la preparación de APIs ya están documentados.
