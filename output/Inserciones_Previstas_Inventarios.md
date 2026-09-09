# Inserciones previstas a partir de INVENTARIOS

Este documento contiene únicamente información nueva identificada en `C:\Users\MONITORES\Downloads\INVENTARIOS` que podría incorporarse al levantamiento preliminar. No repite capacidades ya documentadas: maestro de equipos, historial general de mantenimiento, insumos, adjuntos, ubicaciones, responsables y auditoría general.

## 1. Campañas de levantamiento físico de inventario

**Inserción prevista:** incorporar un módulo de campañas de inventario físico.

Los formatos de levantamiento y actualización de inventario por sala, bodega y centro de acopio (`GIF-PR-003-FR-004`, versión 1.1) evidencian un proceso institucional distinto de la administración ordinaria del inventario. Cada formato registra funcionario responsable, sede, edificio, UAL, nombre y código del espacio, revisor de inventario, estado del activo y observaciones. Además, compara la existencia en inventario físico, ARKA y ERP.

### Requerimientos a insertar

- Crear campañas de levantamiento con periodo, alcance, responsable, estado y evidencia de cierre.
- Registrar visitas por espacio físico con fecha, revisor y responsable del espacio.
- Registrar verificaciones de activos con resultado independiente para físico, ARKA y ERP.
- Clasificar discrepancias: no encontrado, no identificado, placa ilegible, ubicación diferente, responsable diferente, activo sin registro y registro sin activo físico.
- Gestionar observaciones, fotografías, evidencias y acciones de conciliación.
- Impedir que una verificación física sobrescriba el maestro sin aprobación.
- Conservar el histórico de cada campaña y sus diferencias resueltas o pendientes.

### Modelo de datos previsto

- `campañas_levantamiento`
- `visitas_levantamiento`
- `verificaciones_activo`
- `discrepancias_inventario`
- `evidencias_verificacion`
- `acciones_conciliacion`

### Evidencia

- `Formatos LAI - 2026\406 Formato (LAI) Levantamiento y actualización de inventario.xlsx`
- Formatos equivalentes para salas 306, 311, 312, 403, 406, 412, 501 a 507, 601, 608, 701 a 707, bodegas y Calle 34.

## 2. Mobiliario como dominio de inventario

**Inserción prevista:** ampliar el alcance desde equipos tecnológicos e insumos hacia mobiliario.

Los formatos LAI incluyen inventario de sillas, mesas, racks, armarios y otros muebles. Sus campos son tipo de mueble, código de inventario o identificador local, descripción, ubicación, estado, marca, responsable, fecha de última revisión y revisor.

Se observan identificadores alfanuméricos locales, como `406S001`, además de placas institucionales numéricas. Por lo tanto, ningún identificador de activo debe convertirse automáticamente a número.

### Requerimientos a insertar

- Incorporar una entidad general `activos` con subtipos `equipo_tecnologico`, `mobiliario` y `otros_activos`.
- Definir atributos y validaciones específicos por subtipo.
- Permitir códigos de inventario institucionales, códigos internos y etiquetas físicas alfanuméricas.
- Registrar condición física y revisión del mobiliario de forma separada del estado del equipo tecnológico.
- Asociar mobiliario a espacios físicos y campañas de levantamiento.

### Modelo de datos previsto

- `activos`
- `tipos_activo`
- `mobiliario`
- `revisiones_activo`

### Evidencia

- Hojas `Mobiliario` de los formatos LAI 2025 y 2026.
- `INVENTARIO\Formato_Inventario_Mobiliario_Con_Ubicaciones.xlsx`.

## 3. Traslado formal de activos y cambio de custodia

**Inserción prevista:** incorporar un proceso de traslado formal, separado del simple cambio de ubicación.

Los documentos `GIF-PR-005-FR-008` registran fecha de solicitud, responsable que entrega, correo, destinatario, placa, descripción detallada del bien, sede, dependencia, observaciones y aceptación. La hoja de apoyo de traslados registra lugar de origen, lugar destino, hardware, elementos existentes y objetivo.

### Requerimientos a insertar

- Crear solicitudes de traslado con bienes, origen, destino, motivo y objetivo.
- Manejar estados: borrador, solicitado, aprobado, entregado, recibido, rechazado, devuelto y cancelado.
- Exigir responsable que entrega y destinatario que recibe.
- Actualizar ubicación y custodia únicamente al confirmar la recepción.
- Generar acta oficial de traslado desde una plantilla versionada.
- Conservar firma, aceptación digital o evidencia de entrega y recepción.
- Registrar devoluciones, anulaciones y observaciones posteriores.

### Modelo de datos previsto

- `traslados`
- `lineas_traslado`
- `aceptaciones_traslado`
- `actas_traslado`
- `movimientos_custodia`

### Evidencia

- `Formatos LAI - 2026\Formatos traslados\*.docx`.
- `INVENTARIO\EQUIPOS_TRASLADO_ESTEBAN_SANDRA (1).xlsx`.

## 4. Recepción técnica y alta de equipos nuevos

**Inserción prevista:** incorporar un proceso de recepción técnica antes del alta operativa de un equipo.

El formato `GSIT-PR-002-FR-007`, versión 02, registra orden de compra, proveedor, dependencia, funcionario receptor, componentes técnicos, serial de CPU, serial de monitor, verificación funcional, tipo de uso, garantía, soporte postventa, documentos de referencia y firmas de contratista, revisor técnico, supervisor y almacén.

### Requerimientos a insertar

- Crear una recepción asociada a orden de compra, proveedor y lote de entrega.
- Registrar una lista de chequeo por activo: encendido, periféricos, sistema operativo, discos, red y otras pruebas definidas.
- Registrar los seriales individuales de componentes entregados.
- Permitir aceptación, rechazo o aceptación con novedad.
- Mantener garantía, cobertura, vigencia, contacto postventa y documentos asociados.
- Dar de alta el activo operativo solo después de una recepción aprobada.
- Mantener firmas o responsables de contratista, revisor técnico, supervisor y almacén.

### Modelo de datos previsto

- `recepciones_tecnicas`
- `lineas_recepcion`
- `pruebas_recepcion`
- `garantias`
- `contactos_postventa`
- `documentos_recepcion`

### Evidencia

- `RECEPCION COMPUTADORES 2024\RECEPCIÓN DE EQUIPO COMPUTADOR PC MARZO 2024.pdf`.
- `RECEPCION COMPUTADORES 2024\Acta de Entrega #00930 y Servicio Y Garantias.pdf`.

## 5. Composición de puestos de trabajo y equipos compuestos

**Inserción prevista:** modelar los componentes de un puesto de trabajo y sus relaciones físicas.

Los inventarios de salas vinculan puesto, placa y serial de torre, placa y serial de monitor, mouse, teclado, cableado y otros periféricos. Esta evidencia exige superar el registro único de tipo `TORRE Y MONITOR` cuando los componentes tienen identidad patrimonial, serial y ciclo de vida propios.

### Requerimientos a insertar

- Modelar un activo principal o puesto de trabajo y sus componentes.
- Registrar torre, monitor, teclado, mouse, cableado, guaya, tarjeta gráfica y otros periféricos como componentes asociables.
- Mantener placa y serial individual por componente.
- Permitir reemplazo de componente sin perder la trazabilidad del conjunto anterior.
- Validar componentes obligatorios o faltantes según tipo de puesto.
- Registrar estado de recepción o verificación por componente, por ejemplo `OK`, faltante o con novedad.

### Modelo de datos previsto

- `puestos_trabajo`
- `composiciones_activo`
- `componentes_activo`
- `verificaciones_componentes`

### Evidencia

- `INVENTARIO\SN_SALAS_PLAQUETA.xlsx`.
- `ACTUALIZACION DE PCS\PCS_NUEVOS.xlsx`.
- `ACTUALIZACION DE PCS\PCS_ANTIGUOS.xlsx`.
- `Equipos internos\INVENTARIO 2023-1.xlsx`.

## 6. Servicio externo, garantías y partes utilizadas

**Inserción prevista:** estructurar los casos de servicio gestionados por proveedores.

El reporte `SG-FR34` incluye número de caso, falla reportada, estado físico, diagnóstico, pruebas realizadas, solución entregada, tipo de servicio, partes utilizadas o recomendadas y aceptación de cliente y personal técnico.

### Requerimientos a insertar

- Registrar casos de servicio de proveedor vinculados a equipo, mantenimiento y garantía.
- Estructurar falla, diagnóstico, pruebas, solución y estado físico.
- Registrar partes utilizadas o recomendadas con cantidad, número de parte, serial y descripción.
- Clasificar el servicio como instalación, mantenimiento, garantía u otro.
- Registrar cierre técnico, aceptación institucional y documentos de soporte.

### Modelo de datos previsto

- `casos_servicio_proveedor`
- `diagnosticos_servicio`
- `pruebas_servicio`
- `partes_servicio`
- `cierres_servicio`

### Evidencia

- `RECEPCION COMPUTADORES 2024\Acta de Entrega #00930 y Servicio Y Garantias.pdf`.

## 7. Identificación física como dimensión independiente

**Inserción prevista:** separar la condición de identificación física del estado operativo del activo.

Las fuentes registran valores como `¿Elemento identificado?`, `no se pudo verificar`, inventario físico, ARKA y ERP. Estas situaciones no equivalen a que el activo esté activo, dañado, obsoleto o en mantenimiento.

### Requerimientos a insertar

- Registrar condición de identificación: identificado, sin placa, placa ilegible, serial ilegible, no verificado y no encontrado.
- Registrar ubicación declarada, ubicación física verificada y diferencia.
- Permitir capturar evidencia fotográfica de placa, serial y ubicación.
- Mantener la discrepancia abierta hasta su resolución formal.

### Modelo de datos previsto

- `identificaciones_fisicas`
- `lecturas_placa_serial`
- `discrepancias_ubicacion`

### Evidencia

- `Equipos internos\Estado de placas\Estado de placas.xlsx`.
- Hojas de verificación de los formatos LAI.

## 8. Configuración técnica e imágenes de disco

**Inserción prevista condicional:** incluir gestión de configuración técnica solo si el alcance del aplicativo cubre la operación de computadores además del inventario patrimonial.

`Contenido Discos.xlsx` registra imágenes de equipos, respaldos, plantillas, software y versiones asociadas a salas. Esto puede requerir un módulo de configuración, pero no debe incorporarse si la aplicación se limitará a inventario, custodia y mantenimiento.

### Requerimientos condicionales

- Registrar imagen o plantilla instalada por equipo.
- Registrar sistema operativo, versión, aplicaciones base y fecha de instalación.
- Relacionar respaldos o imágenes con sala, equipo y responsable técnico.
- Conservar el historial de cambios de configuración.

### Modelo de datos condicional

- `configuraciones_equipo`
- `imagenes_sistema`
- `respaldos`
- `software_instalado`

### Evidencia

- `Contenido Discos.xlsx`.

## 9. Evidencia documental, versiones y trazabilidad institucional

**Inserción prevista:** ampliar la gestión documental para formatos emitidos, no solo adjuntos genéricos.

Los formatos LAI, actas de traslado y recepciones son soportes operativos e institucionales. El sistema debe conservar el formato aplicado, sus datos de emisión, responsables, estado y versión, incluso si los datos maestros cambian posteriormente.

### Requerimientos a insertar

- Versionar cada plantilla institucional por código, versión, fecha de aprobación y vigencia.
- Mantener el documento emitido como evidencia inmutable.
- Guardar una copia de los datos que alimentaron cada documento emitido.
- Asociar documento, responsables, firmas, fecha de emisión y estado del trámite.
- Evitar que una actualización posterior del equipo altere un acta, recepción o levantamiento ya cerrado.

### Modelo de datos previsto

- `plantillas_documentales`
- `documentos_emitidos`
- `versiones_plantilla`
- `firmas_documentales`

## 10. Riesgos de migración adicionales

- Los formatos de inventario son copias históricas por sala y año; deben importarse como campañas o evidencias, no como fuentes maestras paralelas.
- Existen rangos sobredimensionados y filas heredadas en varios libros. La migración debe basarse en tablas o filas con datos reales, no en el rango usado de Excel.
- Se identifican códigos numéricos, alfanuméricos y etiquetas locales. Todos deben tratarse como texto en integración y almacenamiento.
- Los catálogos de estado requieren normalización. En las fuentes aparecen valores como `Activo`, `Obsoleto`, `Dañado`, `Mantenimiento`, `ok` y `mal`.
- La información de entradas y salidas históricas de insumos debe conservarse como evidencia, pero la nueva plataforma debe registrar cantidades como campos numéricos estructurados.

