# Informe 5 - Frontend: Gestión de Monitores

FECHA: 25/08/2026  
TURNO: Pendiente de registrar  
MONITOR: Alejandro Orjuela y Juan Esteban Cañon

## OBJETIVO DEL AVANCE

Se continuó la migración visual y funcional del aplicativo antiguo de monitores hacia el módulo **Gestión de Monitores** del sistema actual. El alcance de este informe es la modelación del frontend en modo demostración: las vistas, sus flujos de uso, la navegación, la responsividad y los datos temporales. La conexión efectiva a los servicios no se considera una funcionalidad pendiente de este avance, pues corresponde a la etapa posterior de integración.

## AVANCES

* Se reorganizó el menú lateral del módulo para incluir los apartados requeridos: Panel de monitores, Monitores, Horarios, Importar registros, Inconsistencias, Anotaciones, Excepciones, Horas extra, Memorandos, Actas e Históricos.
* Se integró la búsqueda por código, antes identificada como consulta pública, dentro del **Panel de monitores/Dashboard**.
* Se creó la vista **Monitores**, con registro y edición visual de información personal, académica y operativa; incluye directorio, búsqueda, filtro de estado, ubicación, datos académicos y acciones de editar o eliminar.
* Se reestructuró la vista **Horarios** para que inicie con la asignación manual de turnos y el calendario semanal por monitor.
* En Horarios se añadieron la carga masiva simulada, filtros por monitor, día y estado, y las columnas Datos académicos y Ubicación. Las acciones visibles se limitaron a editar y eliminar.
* Se actualizó el nombre de la vista de importación a **Importar registros** y se mantuvo el flujo de validación visual para archivos XLSX y XLS.
* Se creó la vista **Inconsistencias de asistencia**, con búsqueda, filtro por fecha y asignación visual de una marcación al monitor correspondiente.
* Se actualizó **Anotaciones y ajustes** con un buscador dentro de Historial reciente, filtro por tipo y la columna **Registró**.
* Se actualizó el filtro de Horas extra por aprobar: el campo ahora se denomina **Horas extra por aprobar (h)**.
* Se crearon las vistas de **Memorandos** y **Actas**, con formularios de registro, consecutivo visual y listado documental.
* Se creó la vista **Históricos**, con categorías para asistencia, horarios, anotaciones y documentos.
* Se conservaron los estilos del aplicativo actual: tarjetas, tablas, formularios, etiquetas de estado, modo oscuro y comportamiento responsivo.
* Se reforzó la responsividad de formularios laterales, tablas y calendario semanal para que los campos no se corten cuando el espacio disponible disminuye.

## TRABAJO REALIZADO SOBRE APIS

Aunque este avance funciona deliberadamente en modo demo, se dejó preparada la capa de integración para la etapa siguiente:

* Se revisaron y documentaron los contratos disponibles del backend en `src/features/monitores/api/mapeoEndpoints.md`.
* Se definieron tipos de respuesta para monitores, horarios, anotaciones, sesiones, importaciones, conciliaciones, dashboard y consulta por código.
* Se implementaron adaptadores para traducir los campos de las APIs al modelo visual del frontend.
* Se centralizaron las rutas y llamadas en el servicio de monitores, con soporte para autenticación, consulta de recursos y operaciones del módulo.
* Se configuraron rutas proxy de Next.js para los servicios de Gestión de Aulas y Gestión de Monitores.
* Se incorporó la variable `NEXT_PUBLIC_MODO_DEMO_MONITORES`, que permite utilizar datos locales y validar las vistas sin depender de los servicios.
* Se prepararon datos de demostración con la misma estructura de los contratos de API para que el reemplazo posterior por consumo real no requiera rediseñar los componentes.

## FUNCIONA EN MODO DEMO

* Acceso al módulo con credenciales no vacías, únicamente para pruebas visuales.
* Navegación entre todos los apartados incorporados al menú de Gestión de Monitores.
* Consulta por código desde el dashboard.
* Registro, edición y eliminación visual de monitores, horarios, anotaciones, documentos e inconsistencias durante la sesión actual.
* Filtros y búsquedas en directorios, horarios, horas extra, anotaciones e inconsistencias.
* Calendario semanal de horarios y simulación de carga masiva.
* Registro y decisión visual de horas extra.
* Visualización de históricos clasificados por tipo de información.
* Adaptación de la interfaz para escritorio, tableta y móvil; las tablas conservan desplazamiento horizontal cuando es necesario.
* Compilación de producción validada mediante `npm run build`.

## PARTES FALTANTES DEL FRONTEND

Estas tareas no corresponden a la conexión de APIs; son mejoras o definiciones aún necesarias en la experiencia del módulo:

* Confirmar con el software anterior el alcance exacto y los campos definitivos de Memorandos, Actas e Históricos. Las vistas actuales proporcionan una base coherente, pero deben contrastarse con los formatos institucionales finales.
* Completar las acciones visuales de ver, editar y descargar para Memorandos y Actas; actualmente el listado y el registro son demostrativos.
* Definir la estructura final de los subapartados de Históricos, los filtros específicos de cada uno y la información que será exportable.
* Diseñar una vista de detalle de monitor que agrupe perfil, horarios, asistencia, anotaciones, documentos e historial en un solo contexto.
* Incorporar validaciones de negocio más detalladas en formularios: traslape de horarios, rango de horas, obligatoriedad condicional y prevención de registros duplicados.
* Completar la experiencia de edición de horarios, actualmente anunciada visualmente en modo demo, con un formulario o modal de edición.
* Refinar las convenciones visuales y ayudas de cada formulario con ejemplos de formato, textos de apoyo y mensajes de confirmación más específicos.
* Realizar una revisión manual por puntos de quiebre de pantalla para ajustar textos extensos, especialmente en calendarios y tablas de Históricos.

## POSIBLES MEJORAS

* Añadir indicadores resumidos al Dashboard: monitores activos, cobertura de turnos, marcaciones pendientes y horas extra pendientes.
* Permitir exportar visualmente directorios, horarios, anotaciones e históricos a Excel o PDF cuando se definan los formatos institucionales.
* Incorporar filtros guardados y búsqueda avanzada por dependencia, programa académico, sede y periodo.
* Agregar vista de impresión para actas y memorandos, incluyendo consecutivo, firma, compromisos y responsables.
* Mejorar el calendario semanal con selector de monitor, navegación entre semanas y una leyenda de estados.
* Añadir confirmaciones antes de eliminar información y mensajes de éxito más descriptivos.
* Incorporar indicadores de accesibilidad adicionales: etiquetas ARIA, foco visible, contraste revisado y navegación completa por teclado.

## REVISIÓN LOCAL

Ejecutar desde la carpeta Frontend:

```bash
cd "C:\Users\MONITORES\Documents\Software Monitorias\Frontend"
npm install
npm run dev
```

Luego abrir:

* http://localhost:3000/gestion-monitores
* http://127.0.0.1:3000/gestion-monitores

> Importante: el módulo se encuentra en modo demostración. Los cambios realizados durante la sesión son temporales y se reinician al recargar la página. La preparación de contratos y rutas de API ya está documentada, pero la integración efectiva corresponde a una etapa posterior.
