# Informe 10 - Plataforma e Integración

FECHA: 02/09/2026  
TURNO: 6:00 p. m. - 10:00 p. m.
AUTORES: Kaleth Molina Diaz y Carol Stefanya Velasco Rodriguez  

## TURNOS DE TRABAJO


## OBJETIVO DE LA JORNADA

Continuar la validación operativa de los módulos de Estudiantes, Docentes,
Prácticas Libres y Disponibilidad. La jornada se enfocó en fortalecer las cargas
masivas, depurar inconsistencias de identificación de docentes, evitar duplicados
en una práctica libre y mejorar la lectura visual del estado de las aulas, sin
modificar las reglas de negocio ajenas a estos procesos.

## AVANCES REALIZADOS

### Módulo de Estudiantes

* Se consolidó la carga masiva de estudiantes mediante Excel con las columnas
  `Código`, `Nombre` y `Correo`, junto con la descarga de la plantilla
  correspondiente.
* La carga actualiza o incorpora los estudiantes del archivo y mantiene el
  comportamiento de reemplazo previsto para la información que no posee
  relaciones históricas.
* Se ajustó la interfaz para eliminar el registro redundante dentro de la vista,
  ya que el botón **Registrar estudiante** concentra esa operación.
* Los mensajes de resultado de importación permanecen visibles durante 15
  segundos, diferenciando correctamente los resultados exitosos de los errores.
* Los nombres se muestran en mayúsculas sostenidas en el listado, sin modificar
  el valor originalmente almacenado en la base de datos.

### Módulo de Docentes

* Se habilitó la carga masiva y la descarga de la plantilla de Docentes. Para la
  importación institucional se reciben únicamente las columnas `ID` y `NOMBRE`.
* La columna `PROYECTO` se omite en la carga masiva: no es obligatoria, no se
  descarga en la plantilla y tampoco sobrescribe los proyectos que se hayan
  registrado manualmente.
* Se implementó control de duplicados dentro del archivo: cuando un mismo ID se
  repite, se conserva la primera aparición y las siguientes filas se omiten. El
  resultado de la carga informa la cantidad de filas omitidas.
* Se retiró la búsqueda por proyecto del filtro visual de Docentes. La consulta
  se realiza por ID o nombre, y los nombres se presentan en mayúsculas sostenidas.
* Se depuraron los docentes duplicados que existían con el mismo nombre, uno con
  identificación y otro sin ella. Antes de eliminar la copia sin identificación,
  se reasignaron sus clases y relaciones al docente identificado para conservar
  la trazabilidad.
* Se corrigió además un caso de codificación de Excel, como `PEÃ‘A` frente a
  `PEÑA`. La importación de horarios ahora normaliza estas variantes antes de
  intentar crear un docente sin documento.
* Se verificó que no queden docentes con identificación vacía ni identificaciones
  repetidas. Cuando una clase no trae documento y no coincide con un docente
  identificado, se vincula a un único registro técnico **Información no
  disponible**, identificado como `DOCENTE_NO_IDENTIFICADO`, en vez de crear
  docentes incompletos.

#### Observación sobre docentes repetidos con proyectos diferentes

Cuando el Excel contiene el mismo ID y nombre en varias filas, pero con proyectos
distintos, actualmente se conserva la primera fila y se omite `PROYECTO` en la
carga masiva. Esto evita duplicar docentes y no altera proyectos registrados de
forma manual. Sin embargo, este comportamiento debe revisarse posteriormente con
el área funcional: un docente puede estar relacionado con más de un proyecto y se
debe definir si esa información requiere un modelo relacional propio, una lista de
proyectos o una fuente institucional adicional. Mientras no exista esa definición,
no se debe asumir que el primer proyecto representa toda la información docente.

### Módulo de Prácticas Libres

* Se ajustó el formulario de nueva práctica para conservar el estilo de los
  modales existentes y separar el registro rápido de una persona que no se
  encuentre en el sistema.
* El flujo permite validar tanto estudiantes por código como docentes por cédula.
  Si la persona no existe, se solicitan nombre, identificación y correo en una
  ventana modal antes de confirmar la práctica.
* Se agregó la opción **Ninguno** como software requerido, permitiendo sugerir
  aulas disponibles cuando no se necesita un programa específico.
* Se habilitó el registro de varios responsables para una misma reserva. Al
  confirmar, el backend conserva cada persona como práctica individual agrupada.
* Se impide agregar dos veces a la misma persona en una práctica, tanto desde el
  frontend como en la validación final del backend. El aviso se muestra cerca del
  campo de validación, en color rojo y sin conservar el botón de agregado para
  una persona que ya fue incluida.
* Se conservaron las validaciones de disponibilidad, software, multas y cruces
  de horario. También se mantienen los controles para no crear préstamos en
  bloques pasados ni cuando el bloque actual tenga menos de 30 minutos restantes.
* La devolución se maneja mediante ventanas modales: confirma si el aula fue
  devuelta, detecta entregas posteriores al límite de 15 minutos antes del fin
  estimado y permite recomendar la creación de una multa por devolución tardía o
  por sala no devuelta.

### Módulo de Disponibilidad

* Se rediseñaron las tarjetas de aulas: tienen mayor altura, mejor separación
  vertical y tipografía más legible para evitar que la información operativa se
  vea comprimida.
* Se conectaron visualmente los estados reales calculados por el backend. Las
  tarjetas y los indicadores muestran verde para disponible, azul para ocupada,
  naranja para reservada, rojo para mantenimiento y morado para bloqueada.
* Los paneles de resumen se transformaron en indicadores tipo mini-dashboard,
  similares a los de Prácticas Libres: presentan el total, una etiqueta, un punto
  de color y el fondo asociado a cada estado.
* Se mantuvo la adaptación para modo oscuro, garantizando contraste suficiente
  en paneles, tarjetas y estados.
* Se corrigió el botón **Actualizar**: ahora usa el estilo institucional,
  presenta el estado **Actualizando…** durante la consulta y evita clics
  repetidos mientras se recibe la respuesta.
* Se verificó que el botón consulta el endpoint de disponibilidad con la fecha y
  bloque seleccionados, actualizando los resultados. El módulo conserva además
  la actualización automática cada minuto.

### Ajustes transversales y estabilidad

* Los mensajes temporales de cargas masivas de Estudiantes, Docentes, Horarios y
  Aulas se ajustaron para permanecer visibles durante 15 segundos. El resultado
  detallado de Software Instalado conserva su modal abierto para no ocultar los
  errores por fila antes de su revisión.
* Se limpió la caché generada `.next` cuando se detectó una inconsistencia de
  compilación de Next.js relacionada con `_not-found`; esta limpieza no eliminó
  datos funcionales del aplicativo.
* Se compiló correctamente el backend con `npm run build` y el frontend con
  `npm run build` después de los cambios realizados.

## RESTRICCIONES Y REGLAS CONSERVADAS

* El ID de Docente permanece como identificador único; no se crean docentes con
  documento vacío.
* La carga masiva de Docentes no interpreta ni sobrescribe proyectos mientras se
  define la regla institucional para docentes vinculados a varios proyectos.
* La conservación del primer ID repetido se limita a filas duplicadas del mismo
  archivo; no elimina información histórica asociada.
* Una práctica libre no puede incluir dos veces al mismo estudiante o docente.
* Una práctica continúa bloqueándose ante multa activa, incompatibilidad de
  software, cruce de horario, aula no disponible o falta de tiempo útil en el
  bloque.
* La disponibilidad continúa calculándose con clases, asistencia, inasistencia
  automática posterior a 20 minutos, reservas y restricciones operativas. Los
  cambios realizados en este módulo son visuales y no modifican ese cálculo.
* No se modificaron localhost, puertos, URLs de conexión ni configuraciones de
  despliegue local.

## VALIDACIONES EJECUTADAS

* Se verificó la importación de Docentes con IDs repetidos, confirmando que se
  conserva el primer registro y se reportan las filas omitidas.
* Se revisó la base de datos de Docentes después de la depuración: no quedaron
  documentos nulos ni documentos duplicados.
* Se preservó la trazabilidad al reasignar clases y préstamos antes de eliminar
  los duplicados sin identificación.
* Se verificó el control de duplicados de responsables en la interfaz y en el
  servicio de Prácticas Libres.
* Se revisó la ruta de consulta de Disponibilidad utilizada por el botón
  **Actualizar** y el estado de carga de la interfaz.
* Se ejecutaron las compilaciones de backend y frontend sin errores de tipos o de
  construcción. El frontend conserva advertencias preexistentes de estilos y de
  dependencias de efectos que no pertenecen a los cambios de esta jornada.

## SEGUIMIENTO DE PENDIENTES DE INFORMES ANTERIORES

1. **Software Instalado:** la carga institucional, validaciones de columnas,
   asociación con aulas, actualización de versiones por aula, control de errores
   y búsqueda combinada se encuentran implementados. Se debe continuar con las
   pruebas integrales de datos reales y con la revisión operativa de estados de
   software en préstamos.
2. **Disponibilidad:** los requerimientos principales de cálculo por asistencia e
   inasistencia automática después de 20 minutos se mantienen implementados. La
   mejora visual fue ampliada en esta jornada. Se requiere seguir validando los
   resultados con casos reales de clases, préstamos, reservas y mantenimiento.
3. **Prácticas Libres:** se avanzó en el registro de estudiantes/docentes, grupos,
   software opcional, disponibilidad y devolución con recomendación de multa.
   Falta configurar y probar el envío real de correo mediante el servicio externo
   (`EMAIL_WEBHOOK_URL`), y validar de extremo a extremo el redireccionamiento y
   precarga de datos en Multas.
4. **Módulo de Usuarios:** se mantiene implementada la restricción de acceso
   exclusivo para administrador. Falta comprobarla con cuentas administradora y
   no administradora, y completar los requisitos de cargos: asistente, monitor,
   técnico y profesional; desactivación/eliminación de cargos; y asignación
   automática del cargo Monitor.
5. **Módulo de Limpieza:** sigue pendiente la selección de salas, la matriz según
   el formato Excel y la validación de sus reglas de negocio.
6. **Módulo de Tareas Operativas:** sigue pendiente reflejar la regla de negocio
   en el dashboard, conservar la asignación inicial cuando no se acepta una tarea
   y generar el informe de realizado/pendiente para tareas inconclusas.
7. **Gestión temporal de Estudiantes y Docentes:** las pantallas continúan siendo
   temporales para validación. Deben retirarse del acceso del administrador cuando
   la gestión definitiva quede restringida a los permisos específicos definidos.
8. **Credenciales:** se conserva la implementación anterior. Queda pendiente, si
   el sistema se distribuye en varias instancias, evaluar la persistencia o
   distribución del desbloqueo temporal de seguridad.

## SIGUIENTE PASO PRIORITARIO

Iniciar pruebas funcionales y corrección de errores de la lógica desde el módulo
de **Préstamos Docentes**. Las pruebas deben cubrir identificación del docente,
selección de software requerido, disponibilidad estricta de aulas sin clase,
restricción de bloques pasados o con menos de 30 minutos disponibles, asignación
del encargado autenticado y conservación de la trazabilidad. Después de ello se
deben continuar los pendientes de Usuarios, Limpieza y Tareas Operativas.

## ESTADO ACTUAL

La plataforma cuenta con gestión masiva más controlada para Estudiantes y
Docentes, depuración de identificaciones docentes, prevención de duplicados en
Prácticas Libres y una vista de Disponibilidad más clara y consistente con el
estado operativo de cada aula. El próximo foco debe ser validar la lógica real de
Préstamos Docentes antes de ampliar otros módulos pendientes.
