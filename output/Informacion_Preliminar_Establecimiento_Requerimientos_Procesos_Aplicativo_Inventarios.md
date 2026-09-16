# Información preliminar para el establecimiento de requerimientos y procesos del aplicativo de inventarios

Aplicativo para centralizar inventarios y hojas de vida de equipos de salas de informática

Documento de análisis funcional y de datos

| Elemento | Detalle |
| --- | --- |
| Fuente principal | Libro Hojas_Vida_Salas_Informatica.xlsm |
| Ruta analizada | C:\Users\MONITORES\Downloads\Hojas_Vida_Salas_Informatica.xlsm |
| Estado del análisis | Solo lectura. No se ejecutaron macros ni se modificó el libro. |
| Propósito | Aportar evidencia para definir el alcance, las reglas, la migración y la integración de un aplicativo centralizado. |

## 1 Resumen ejecutivo

El libro analizado contiene un proceso operativo de inventario y mantenimiento para equipos de salas de informática. Su núcleo está compuesto por un maestro de equipos, un historial de mantenimientos y una hoja de vida institucional imprimible. El futuro aplicativo debe centralizar estas capacidades, conservar la trazabilidad por código de inventario y producir el formato oficial sin modificar su diseño.

La evidencia demuestra que el archivo XLSM es la fuente de análisis adecuada, porque conserva la estructura del libro, las imágenes, las fórmulas, las celdas combinadas, la configuración de impresión y los componentes necesarios para comprender el proceso actual.

Conclusión principal: el aplicativo debe tratar el código de inventario como una llave de negocio de texto, mantener un historial ilimitado de eventos por equipo y generar una representación controlada de la hoja de vida oficial. La migración deberá incluir una etapa explícita de conciliación, ya que existen equipos con mantenimientos que no se encuentran actualmente en el maestro.

## 2 Alcance y método de revisión

El análisis se efectuó en modo de solo lectura sobre el archivo XLSM original. Se inspeccionaron la estructura del libro, los nombres de las hojas, las tablas estructuradas, las fórmulas de la hoja de vida, las tablas dinámicas, las relaciones entre hojas, los metadatos de impresión, las imágenes incorporadas y la distribución de los datos.

| Aspecto | Resultado de la revisión |
| --- | --- |
| Libro | Archivo habilitado para macros con ocho hojas, tablas, imágenes, tablas dinámicas y segmentadores. |
| Macros | Existe vbaProject.bin. No se ejecutó ni se modificó código VBA. |
| Hoja de vida | Rango de impresión B1:AE41, orientación horizontal, 79 celdas combinadas, imágenes y 41 celdas con fórmulas. |
| Maestro | Tabla BD con rango A1:AC1155 y 1.154 registros operativos. |
| Mantenimiento | Tabla Mantenimientos con rango A1:J3243 y 3.242 registros operativos. |
| Riesgo técnico | La hoja Base de Datos tiene un rango usado A1:CS1046419. El exceso de formato residual es el principal factor del tamaño del archivo. |

Límite de la evidencia: este documento describe el comportamiento observable en el libro. Las definiciones de negocio de campos ambiguos, políticas institucionales, perfiles de usuario y contratos de integración deberán validarse con las personas responsables del proceso.

## 3 Inventario de hojas y funciones observadas

| Hoja | Función observada | Uso esperado en el aplicativo |
| --- | --- | --- |
| Lista Imagenes | Matriz de ubicaciones y tipos de equipo con referencias visuales. | Repositorio o catálogo de imágenes por equipo, ubicación y tipo. |
| Hoja de vida equipos | Formato institucional por equipo. Consulta datos, mantenimiento e imagen. | Plantilla oficial de consulta, impresión y exportación a PDF. |
| Mantenimientos | Tabla estructurada con historial de eventos por código de inventario. | Módulo transaccional de mantenimiento. |
| Añadir Mantenimientos | Tablas dinámicas y segmentadores sobre el maestro BD. | Búsqueda, filtros, listados y paneles operativos. |
| Base de Datos | Tabla BD con los atributos del inventario de equipos. | Maestro central de equipos y fuente de datos de la hoja de vida. |
| INV. PROFESORES | Inventario institucional amplio, con sede, dependencia, espacio y responsable. | Fuente externa para importación, contraste y conciliación. |
| Formato 1 | Vista filtrada de inventario institucional para el Centro de Acopio 608. | Reporte derivado, no entidad maestra. |
| Formato 2 | Lista corta con datos de prueba o excepciones. | Datos a depurar y clasificar antes de migrar. |

## 4 Entidades y atributos identificados

### 4.1 Equipo

La tabla BD representa el maestro de equipos. Cada registro concentra información de identificación, localización, adquisición, características, uso, estado y revisión. El código de inventario funciona como la llave utilizada por las fórmulas de consulta y por el historial de mantenimiento.

| Grupo | Campos observados |
| --- | --- |
| Identificación | Código de inventario, código interno, nombre del equipo, marca, número de serie, referencia o modelo. |
| Ubicación y asignación | Dependencia, ubicación, inventario a cargo de docente. |
| Adquisición | Fecha de adquisición, factura de compra, proveedor, remisión, valor de compra, país de origen. |
| Operación | Frecuencia de mantenimiento, potencia eléctrica, tipo de uso, estado, obsolescencia, fecha de última revisión, revisó. |
| Documentación técnica | Especificaciones técnicas, cuenta con manual, accesorios, tiempo de garantía y vida útil. |
| Campos pendientes de definición | Columna1 y Columna2; deben ser aclarados antes de diseñar la base de datos final. |

### 4.2 Mantenimiento

La tabla Mantenimientos tiene diez campos formales: código de inventario, ítem, tipo de mantenimiento, fecha de realización, datos de la empresa contratada, tiempo de garantía, especificaciones del mantenimiento realizado, responsable, observaciones o repuestos y ubicación.

| Regla o hallazgo | Implicación para el aplicativo |
| --- | --- |
| 3.242 registros y 900 códigos distintos | La relación es uno a muchos entre equipo y mantenimiento. |
| Tipos usados | Se observan MIC, MIP, MIPV y MEPV. El catálogo institucional también contempla MEC y MEP. |
| Seis valores No Realizado en fecha | La fecha debe ser opcional y el estado de ejecución debe ser un campo independiente. |
| 27 registros sin ubicación | La ubicación debe conservar historial y permitir un estado de dato pendiente. |
| Observaciones y repuestos | Debe habilitar texto libre estructurable y anexos para evidencias o repuestos. |

### 4.3 Ubicación y responsable

Las fuentes incluyen sede, dependencia, espacio físico, ubicación de sala y docente o responsable. Se observan diferencias de capitalización y denominación, por ejemplo variantes de Sabio Caldas y referencias a salas, centro de acopio y espacios administrativos. La nueva aplicación debe utilizar catálogos normalizados y preservar la denominación original como dato de importación cuando sea necesario.

## 5 Relaciones y automatizaciones actuales

La hoja de vida usa fórmulas para consultar el maestro BD por código de inventario. Recupera dependencia, ubicación, nombre, proveedor, marca, serie, adquisición, garantía, vida útil, potencia, especificaciones, manual y accesorios. También filtra el historial de Mantenimientos por el mismo código.

| Automatización observable | Comportamiento actual | Requisito equivalente |
| --- | --- | --- |
| Selección de equipo | El código de inventario identifica el registro que alimenta la hoja de vida. | Búsqueda exacta por código y navegación a ficha de equipo. |
| Autollenado | INDEX y MATCH consultan BD para llenar los campos institucionales. | Servicio de consulta de ficha única desde el maestro de equipos. |
| Historial | FILTER recupera los mantenimientos asociados y los muestra en la plantilla. | Listado completo, ordenable y paginable de eventos por equipo. |
| Imagen | XLOOKUP busca una imagen según ubicación y tipo de equipo. | Asociación explícita de imágenes y documentos al equipo; no depender solo de una búsqueda por texto. |
| Filtros | Cuatro tablas dinámicas soportan filtros por código, ubicación, nombre y marca. | Filtros combinables, exportables y con permisos. |

La hoja oficial muestra hasta ocho líneas de mantenimiento en la página impresa. El aplicativo debe almacenar todos los eventos y replicar este límite únicamente en la representación de impresión o en páginas consecutivas, sin truncar el historial digital.

## 6 Hallazgos de calidad de datos

| Prioridad | Hallazgo | Evidencia e impacto | Acción requerida |
| --- | --- | --- | --- |
| Alta | Mantenimientos sin equipo maestro | 857 de 900 códigos de mantenimiento tienen coincidencia en BD. Quedan 43 por conciliar. | Crear bandeja de conciliación; no eliminar eventos huérfanos. |
| Alta | Formato residual masivo | Base de Datos llega a la fila 1.046.419 aunque la tabla BD termina en la fila 1.155. | Optimizar en una copia controlada, sin modificar la plantilla oficial. |
| Media | Estado mezclado con fecha | No Realizado se usa como valor de fecha en seis eventos. | Separar estado, fecha programada, fecha realizada y motivo. |
| Media | Códigos y campos ambiguos | Columna1, Columna2, 0, No encontrado y No especificado carecen de definición uniforme. | Definir diccionario de datos y política de valores ausentes. |
| Media | Regla frágil de tipo de uso | Una validación consulta por serial y las demás por código de inventario. | Usar una única llave y reglas consistentes en el aplicativo. |
| Media | Búsqueda de imagen | La fórmula de imagen conserva un valor almacenado #VALUE! aunque la imagen está visible en el PDF. | Gestionar archivos adjuntos con vínculo explícito y validación de disponibilidad. |

## 7 Requerimientos funcionales sugeridos

### 7.1 Gestión de inventario

- Crear, consultar, actualizar, inactivar y, cuando sea autorizado, dar de baja equipos sin perder trazabilidad.

- Mantener el código de inventario como texto, único, obligatorio y no reutilizable.

- Buscar por código, serial, código interno, tipo, marca, ubicación, dependencia, responsable y estado.

- Administrar catálogos de tipos de equipo, marcas, proveedores, dependencias, sedes, salas, estados, usos y obsolescencia.

- Conservar el historial de ubicación y responsable, no solo el valor vigente.

- Permitir adjuntar manuales, facturas, remisiones, fotografías, soportes de mantenimiento y evidencias de baja.

### 7.2 Gestión de mantenimiento

- Registrar mantenimiento preventivo, predictivo y correctivo, interno o externo, mediante un catálogo controlado.

- Separar programación, ejecución, cancelación y no realización; conservar causa y responsable de cada estado.

- Registrar empresa contratada, garantía, actividades realizadas, responsables, repuestos, observaciones y anexos.

- Calcular próximos mantenimientos a partir de frecuencia, fecha del último mantenimiento y reglas aprobadas.

- Mostrar el historial completo por equipo y generar la sección correspondiente en la hoja de vida oficial.

### 7.3 Formato oficial y documentos

- Generar la hoja de vida oficial respetando su código institucional, distribución, campos, orientación horizontal, imágenes y área de impresión.

- Versionar la plantilla. Cualquier cambio estructural debe requerir aprobación explícita de la dependencia responsable.

- Exportar PDF con el mismo comportamiento visual de la plantilla institucional.

- Mantener la hoja digital como vista dinámica, sin limitar el historial almacenado por las ocho filas del formato impreso.

### 7.4 Importación, conciliación y reportes

- Importar inventarios desde la base de datos institucional mediante una zona de staging y validaciones antes de afectar el maestro.

- Conciliar por código de inventario, serial y reglas de coincidencia supervisadas; registrar conflictos y decisiones.

- Generar reportes por ubicación, tipo de equipo, estado, responsable, proveedor, frecuencia de mantenimiento y obsolescencia.

- Identificar equipos sin mantenimiento, mantenimientos próximos o vencidos, datos incompletos y registros huérfanos.

## 9 Reglas de negocio propuestas

- El código de inventario debe conservarse como texto desde la captura hasta la exportación, incluyendo ceros iniciales, guiones, letras y longitud original. No se permite conversión automática a número, notación científica, truncamiento ni redondeo.

- Un equipo puede tener cero, uno o varios mantenimientos, documentos, imágenes y movimientos de ubicación. Cada evento debe conservar fecha, responsable, origen y estado cuando esos datos existan en la fuente.

- Un mantenimiento no realizado debe registrarse con estado explícito y motivo obligatorio. La fecha de ejecución solo puede diligenciarse cuando el mantenimiento haya sido efectivamente realizado.

- Los catálogos y formularios deben distinguir, mediante valores controlados, un dato ausente, no aplicable, cero real y pendiente de verificación; estos estados no deben mezclarse con texto libre.

- La eliminación física de registros debe estar restringida a personal autorizado. Las bajas, correcciones, inactivaciones y reactivaciones deben conservar usuario, fecha, motivo y valor anterior cuando aplique.

- La plantilla oficial LAI y Hoja de Vida no debe ser modificada por usuarios operativos. Toda modificación estructural requiere control de versión, justificación, aprobación formal y conservación de la versión anterior.

- Todo registro importado que no coincida de forma verificable con un equipo existente debe pasar a una bandeja de conciliación, conservar la fuente, fecha y valores originales, y quedar pendiente de decisión antes de consolidarse.

Los formatos LAI y Hoja de Vida deben conservar los campos visibles de placa y serial exigidos por sus plantillas institucionales.

CPU, monitor y demás periféricos identificables deben conservar su contexto documental individual, aunque se relacionen dentro de una misma sala o puesto de trabajo.

La placa institucional puede repetirse en activos independientes. Una consulta por placa debe mostrar tipo de activo, serial, ubicación y contexto antes de permitir una modificación.

## 10 Requerimientos no funcionales sugeridos

| Área | Requerimiento sugerido |
| --- | --- |
| Seguridad | Autenticación institucional, autorización por rol, control de acceso a documentos y registro de auditoría. |
| Integridad | Transacciones, llaves únicas, validaciones de catálogos y trazabilidad de importaciones. |
| Rendimiento | Consultas ágiles por código y filtros combinados; evitar depender de libros de Excel voluminosos. |
| Interoperabilidad | API o proceso de importación documentado para la base de datos institucional y exportación a PDF/Excel controlada. |
| Disponibilidad | Respaldo de documentos y recuperación ante fallos; el inventario no debe depender de un único archivo local. |
| Usabilidad | Interfaz para personal técnico y administrativo, con búsqueda rápida, formularios guiados y validaciones comprensibles. |
| Compatibilidad | La generación de la hoja oficial debe ser independiente de la versión de Microsoft Excel instalada por el usuario. |

## 11 Información requerida de la base de datos institucional

Cuando se suministre la base de datos, el siguiente análisis debe establecer el origen autoritativo de cada atributo y el procedimiento de integración. Se requiere, como mínimo, la siguiente información:

- Motor, versión, método de acceso y ambiente disponible para consulta o integración.

- Esquema de tablas, columnas, tipos de datos, llaves primarias, llaves foráneas e índices.

- Diccionario de datos y significado de las placas, códigos, estados, dependencias y espacios físicos.

- Periodicidad y mecanismo de actualización del inventario institucional.

- Identificación de la fuente autoritativa para código de inventario, serial, responsable y ubicación.

- Reglas de seguridad, datos sensibles, roles autorizados y procedimiento para corregir inconsistencias.

- Muestras anonimizadas o consultas de contraste para validar el mapeo sin alterar registros productivos.

## 12 Preguntas de validación para el levantamiento

| Tema | Pregunta de validación |
| --- | --- |
| Propiedad de datos | ¿Qué sistema es la fuente oficial para cada código de inventario, ubicación, responsable y estado? |
| Campos ambiguos | ¿Qué representan Columna1, Columna2, el valor 0 y los textos No encontrado o No especificado? |
| Mantenimiento | ¿Qué evento inicia el conteo de frecuencia y quién puede programar, cerrar o declarar no realizado un mantenimiento? |
| Plantilla oficial | ¿Qué campos son editables, qué campos se autocompletan y quién aprueba una nueva versión del formato? |
| Documentos | ¿Qué anexos son obligatorios por tipo de equipo o mantenimiento y cuánto tiempo deben conservarse? |
| Roles | ¿Qué acciones pueden realizar técnicos, administradores, docentes responsables, supervisores y auditores? |
| Integración | ¿La base de datos se consultará en tiempo real, se sincronizará por lotes o recibirá importaciones manuales aprobadas? |
| Migración | ¿Cómo se resolverán los 43 códigos de mantenimiento que no aparecen en el maestro actual? |

## 13 Plan recomendado de continuación

| Fase | Resultado esperado |
| --- | --- |
| 1. Validación funcional | Aprobación del diccionario de datos, roles, flujo de mantenimiento y alcance de la hoja de vida oficial. |
| 2. Análisis de base de datos | Mapa de tablas y campos, fuente autoritativa, llaves de integración y calidad de datos. |
| 3. Diseño de migración | Reglas de transformación, staging, conciliación de huérfanos, bitácora y plan de reversión. |
| 4. Diseño del aplicativo | Modelo lógico, pantallas, permisos, API, reportes y generación del formato oficial. |
| 5. Prueba piloto | Migración de una muestra de salas y validación de hoja de vida, mantenimientos e informes. |
| 6. Despliegue controlado | Carga inicial aprobada, capacitación, soporte y monitoreo de calidad. |

## Anexo A Evidencia técnica relevante

| Elemento | Evidencia observada |
| --- | --- |
| Formato institucional | Código GL-PR-002-FR-007, versión 01 y fecha de aprobación 30/10/2017 en la hoja de vida y PDF de referencia. |
| Formato de impresión | Orientación horizontal, área B1:AE41, escala 36 y 79 celdas combinadas. |
| Relaciones | BD se consulta desde la hoja de vida por código de inventario; Mantenimientos se filtra por ese mismo código. |
| Tablas dinámicas | Filtros observados para código, ubicación y nombre; tabla dinámica principal con ubicación, código, nombre y marca. |
| Compatibilidad | Fórmulas FILTER y XLOOKUP requieren un motor compatible. El aplicativo debe sustituir esta dependencia por lógica de servidor. |
| Volumen físico | El XLSM mide aproximadamente 192,6 MB. El XML de Base de Datos descomprimido mide aproximadamente 1,7 GB por formato residual. |

## Anexo B Fuentes revisadas

- Hojas_Vida_Salas_Informatica.xlsm, libro de trabajo habilitado para macros, ruta: C:\Users\MONITORES\Downloads\Hojas_Vida_Salas_Informatica.xlsm

- Hojas_Vida_Salas_Informatica.pdf, representación de referencia del formato oficial de hoja de vida.

- Ocho exportaciones CSV suministradas inicialmente, utilizadas únicamente como contraste y no como fuente maestra.

## Anexo C Inventario de insumos

El archivo inventario insumos.xlsx incorpora un segundo dominio funcional para el aplicativo: el control de existencias de insumos, empaques y consumibles. A diferencia del libro de hojas de vida, esta fuente ya está organizada como una exportación relacional con identificadores y relaciones explícitas. Debe incorporarse al alcance como un módulo de inventario de insumos integrado, pero distinto del maestro de equipos activos.

La revisión se realizó en modo de solo lectura. Se analizaron sus seis hojas, sus llaves, los conteos, las relaciones entre tablas, la distribución de cantidades, la bitácora histórica y ejemplos de operaciones. No se modificó el archivo fuente.

### C.1 Estructura de la fuente

| Hoja | Registros | Función observada | Llave y relaciones |
| --- | --- | --- | --- |
| insumos | 906 | Maestro de artículos, cantidades y ubicación actual. | Item_id; referencia estado, ubicación y empaque. |
| historial | 1.529 | Bitácora de altas, bajas, ediciones y movimientos. | Historial_id; referencia Trabajador_id e Item_id. |
| trabajadores | 28 | Personas que realizan o registran operaciones. | Trabajador_id; usado por historial. |
| ubicaciones | 7 | Ubicaciones físicas de almacenamiento. | Ubicacion_id; usado por insumos. |
| empaques | 8 | Unidad o empaque de almacenamiento. | Empaque_id; usado por insumos. |
| estados | 3 | Estados codificados como success, warning y danger. | Estado_id; usado por insumos. |

Las comprobaciones de integridad referencial dan resultado positivo: no se identificaron referencias inválidas desde insumos hacia estados, ubicaciones o empaques, ni desde historial hacia trabajadores o artículos. Esta calidad estructural facilita una migración controlada.

### C.2 Catálogo de datos de insumos

| Entidad | Campos observados | Interpretación preliminar |
| --- | --- | --- |
| insumos | Item_id, Activo, Nombre, Detalles, Cantidad, Cantidad_Inicial, Estado_id, Ubicacion_id, Empaque_id. | Representa el saldo actual de un artículo y su clasificación logística. |
| historial | Historial_id, Tipo, Detalles, Trabajador_id, Fecha, Item_id. | Representa eventos de inventario y auditoría, con detalle narrativo. |
| trabajadores | Trabajador_id, Activo, Nombre_Apellido, Dependencia, Cargo, Correo. | Catálogo de actores operativos y administrativos. |
| ubicaciones | Ubicacion_id, Lugar. | Catálogo de siete puntos de almacenamiento: stands y piso. |
| empaques | Empaque_id, Empaque. | Caja, unidad, rollo, caja redonda, bolsa, carrete y sin definir. |
| estados | Estado_id, Estado. | Etiquetas visuales de interfaz; la semántica de negocio debe formalizarse. |

### C.3 Volumen y perfil de datos

| Métrica | Resultado | Lectura para requisitos |
| --- | --- | --- |
| Artículos | 906 | El módulo debe soportar catálogo amplio, búsqueda y filtros. |
| Cantidad actual total | 7.614 | Es saldo agregado; debe poder reconstruirse por artículo y ubicación. |
| Cantidad inicial total | 7.678 | Existe una diferencia neta de 64 unidades frente al saldo actual. |
| Saldos en cero | 36 artículos | Se requieren alertas de agotamiento y reglas de reposición. |
| Saldos negativos | 0 artículos | La aplicación debe mantener esta restricción como regla de integridad. |
| Cantidad mayor que inicial | 24 artículos | Puede reflejar entradas posteriores; exige movimientos numéricos auditables. |
| Estados | 848 success, 19 warning, 39 danger | La nomenclatura actual debe traducirse a estados de inventario comprensibles. |
| Empaques | 546 unidad, 163 caja, 88 bolsa, 46 sin definir y otros | Se requiere normalizar unidades y empaques. |
| Ubicaciones | Siete ubicaciones; la mayor concentración está en Stand 2 con 184 artículos | Debe existir stock por ubicación, no solo ubicación vigente del artículo. |

La tabla de empaques presenta dos valores semánticamente equivalentes con distinta capitalización: Bolsa y bolsa. El catálogo destino debe evitar duplicados mediante valores normalizados y, si aplica, una etiqueta de visualización separada.

### C.4 Historial de operaciones

| Tipo de evento | Cantidad | Observación |
| --- | --- | --- |
| Nuevo ingreso | 608 | Alta de nuevos artículos o registros. |
| Eliminar | 563 | Eliminación o desactivación; debe distinguirse de una salida de stock. |
| Editar | 187 | Cambio de información del artículo; el cambio específico no está estructurado. |
| Salida | 111 | Consumo, retiro o entrega; la cantidad aparece en texto libre. |
| Entrada | 36 | Ingreso de existencias; la cantidad aparece en texto libre. |
| Entradas/Salidas | 22 | Tipo ambiguo que mezcla dos operaciones. |
| Reactivar | 2 | Restauración de registros eliminados o inactivos. |

El historial cubre desde el 5 de febrero de 2025 hasta el 8 de abril de 2026. Todos los eventos tienen fecha y referencias válidas a un trabajador y a un artículo. Sin embargo, 1.214 de los 1.529 eventos no tienen detalle, y las cantidades de entradas o salidas se registran dentro de frases como retirar 1 o añadir 2. Por ello, no es posible recalcular de manera independiente y confiable el saldo actual a partir de la bitácora.

### C.5 Requisitos para el módulo de insumos

- Mantener un maestro de insumos separado del maestro de equipos, con código interno, nombre, descripción, unidad de medida, empaque, estado y trazabilidad de activo o inactivo.

- Administrar existencias por ubicación. Un mismo insumo debe poder tener saldos en varias ubicaciones al mismo tiempo.

- Registrar movimientos con tipo controlado, cantidad numérica, unidad, fecha, usuario responsable, motivo, ubicación de origen y destino, y documento o evidencia adjunta cuando corresponda.

- Separar altas o bajas de catálogo de las entradas y salidas físicas de existencias. Eliminar un artículo no debe confundirse con consumirlo.

- Impedir saldos negativos salvo autorización excepcional registrada y auditable.

- Permitir ajustes de inventario, conteos físicos, diferencias, aprobaciones y conciliación contra saldos esperados.

- Generar alertas de agotamiento, mínimo de reposición y artículos en estado de advertencia o crítico cuando se definan sus reglas.

- Conservar historial detallado de cambios de nombre, descripción, unidad, estado, ubicación y saldo.

### C.7 Riesgos y decisiones pendientes

| Prioridad | Decisión o riesgo | Acción de levantamiento |
| --- | --- | --- |
| Alta | No existe cantidad estructurada en la bitácora de entradas y salidas. | Definir modelo de movimientos y decidir si el saldo inicial será la base de migración. |
| Alta | Eliminar, reactivar y activo no tienen semántica completamente verificable desde la fuente. | Acordar estados de ciclo de vida del artículo y reglas de conservación. |
| Media | success, warning y danger son etiquetas técnicas de interfaz. | Definir estados de negocio y criterios de alerta. |
| Media | Entradas/Salidas mezcla dos clases de transacción. | Separar en entrada, salida, traslado, ajuste y devolución. |
| Media | Detalles es texto libre y está vacío en la mayoría de eventos. | Estructurar motivos, cantidades, destinatarios y referencias; conservar observación libre opcional. |
| Media | Bolsa y bolsa duplican el mismo empaque. | Normalizar catálogos antes de la migración. |

## Anexo D Decisiones confirmadas para el diseño

Este anexo consolida las decisiones funcionales confirmadas durante el levantamiento. Complementa los hallazgos del inventario y convierte las aclaraciones recibidas en reglas de diseño para la ficha central, los formatos institucionales, la identidad de activos, los traslados, los insumos y el control de acceso.

### D.1 Identidad y asociación de activos

Los activos se identifican en las fuentes mediante placas institucionales, números de serie, códigos de inventario y otros campos descriptivos. La relación entre estos identificadores debe conservarse en los formatos institucionales y validarse durante la conciliación.

La placa institucional no tendrá una restricción de unicidad global. Una misma placa puede estar asociada a una CPU y a un monitor independientes. Por ello, una búsqueda por placa deberá mostrar contexto adicional como tipo de activo, serial, ubicación, componente y estado antes de permitir una modificación.

| Situación | Regla confirmada | Comportamiento del aplicativo |
| --- | --- | --- |
| Activo con placa | La placa se registra como identificador de negocio y puede repetirse. | Se desambigua por tipo, serial, placa y contexto. |
| Activo sin placa y con serial | El serial sirve como referencia del componente o proceso. | Se registra el serial como referencia del componente o proceso. |
| Activo sin placa ni serial | Almacén debe generar un código interno. | El proceso queda asociado al código interno cuando este haya sido generado por almacén. |
| CPU y monitor | Son activos independientes. | Pueden asociarse como componentes de un puesto sin perder su identidad individual. |

### D.3 Fuentes, alcance y conciliación

- Los archivos por sala y año se consideran evidencia histórica. Ante diferencias, debe realizarse una revisión rigurosa de los datos, su fecha, fuente, contexto y soportes antes de determinar cuál registro es válido.

- ARKA prevalece como fuente actual durante la transición hacia el nuevo ERP o formato institucional. Las discrepancias son resueltas por el equipo de salas con consulta a almacén.

- Almacén y Centro de Acopio representan el mismo contexto logístico. El sistema usará un nombre normalizado y podrá mantener alias para búsquedas y documentos heredados.

- Los activos prioritarios son CPU y monitor. También se contemplan teclados, pantallas interactivas, sillas, altavoces, video beam, tabletas y portátiles; otros activos quedan sujetos a revisión del equipo de trabajo.

- Cables y mouse no requieren placa. Para los demás activos, si no existe placa ni serial, se debe generar un código interno.

- La regla de que los activos superiores a 800.000 COP llevan placa debe tratarse como criterio configurable y validarse con almacén antes de automatizarse.

### D.4 Recepción, traslados y trabajadores

La recepción técnica es obligatoria para equipos nuevos. Los formatos LAI y hoja de vida se deberán diligenciar por los responsables correspondientes. Los traslados se aplican por cambios de coordinador o casos excepcionales.

| Proceso | Decisión confirmada | Regla de implementación |
| --- | --- | --- |
| Recepción | LAI y hoja de vida obligatorios para equipo nuevo. | Crear una recepción que alimente los formatos sin rediseñarlos. |
| Traslado | Los responsables pueden variar por caso. | Permitir seleccionar o cargar trabajadores y, además, capturar texto libre en los campos del formato. |
| Documento emitido | Debe reflejar los datos variables requeridos por el formato. | Guardar el texto visible y, cuando aplique, la relación interna con el trabajador. |
| Trabajadores | La asignación cambia por semestre. | Soportar carga masiva, vigencia, dependencia, cargo, correo y estado. |

### D.5 Insumos y acceso

La definición del saldo de apertura de insumos queda pendiente de validación por el equipo de trabajo. Una vez validada, las actualizaciones deberán registrarse como entrada, salida, traslado o ajuste con cantidad numérica, fecha, responsable, motivo y ubicación.

Los perfiles asistenciales, técnicos y administradores podrán acceder a información sensible. Los monitores no tendrán acceso a responsables, correos, firmas, facturas ni documentos restringidos.

### D.6 Pendientes vigentes

| Tema | Definición pendiente |
| --- | --- |
| Servicio externo y garantías | Alcance de número de caso, partes utilizadas, tiempos de atención, proveedor responsable, cobertura y cierre técnico. |
| Código interno | Procedimiento exacto de solicitud, aprobación y generación por almacén. |
| Sincronización | Lista definitiva de campos compartidos entre LAI y hoja de vida, campos exclusivos y responsables autorizados. |
| Acceso | Nivel de detalle de permisos por perfil sobre formatos emitidos, anexos, firmas y datos personales. |
| Configuración técnica | Decidir si imágenes de disco, respaldos y software instalado forman parte del aplicativo. |
