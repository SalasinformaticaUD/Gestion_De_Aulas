# Bases documentales para definir los macroprocesos del aplicativo

## Propósito y alcance

Este documento consolida únicamente información observada en los archivos y carpetas suministrados. Su finalidad es servir como base para definir los macroprocesos del aplicativo de inventarios, equipos, salas, mantenimientos, traslados e insumos. No incorpora reglas de diseño, claves técnicas, decisiones de arquitectura ni procedimientos que no estén explícitamente respaldados por las fuentes.

## Fuentes revisadas

| Fuente | Contenido observado |
|---|---|
| `Hojas_Vida_Salas_Informatica.xlsm` | Libro principal con hojas de vida, mantenimientos, base de datos, inventario de profesores, formatos y lista de imágenes. |
| `Hojas_Vida_Salas_Informatica_1.csv` a `_8.csv` | Exportaciones de hojas activas del libro principal. |
| `Hojas_Vida_Salas_Informatica.pdf` | Representación del formato contenido en la hoja 2, correspondiente a la Hoja de Vida. |
| `inventario insumos.xlsx` | Catálogo de insumos, estados, historial, trabajadores, ubicaciones y empaques. |
| Carpeta `C:\Users\MONITORES\Downloads\INVENTARIOS` | Formatos LAI, recepción técnica, transferencias, servicio técnico, placas, inventarios históricos, contenido de discos y soportes documentales. |

## Hallazgos documentales

### 1. Activos y hojas de vida

- El libro principal contiene una base de datos de activos en la hoja `Base de Datos`, con aproximadamente 1.154 registros y campos de identificación, descripción, ubicación y características.
- La hoja `Hoja de vida equipos` contiene un formato institucional estructurado, con áreas combinadas, imágenes, fórmulas y zona de impresión definida. El PDF suministrado corresponde a este formato.
- Se observan equipos informáticos y periféricos, entre ellos CPU, monitores, teclados, mouse, proyectores o video beams, pantallas interactivas, tablets y portátiles.
- Los inventarios y formatos también documentan elementos de sala y mobiliario, como sillas, mesas, parlantes y otros bienes.
- En las fuentes aparecen placas institucionales y números de serie como datos de identificación. La forma en que estos identificadores se relacionan debe conservarse en los formatos institucionales.

### 2. Levantamiento de salas y formato LAI

- Los formatos LAI corresponden al código `GIF-PR-003-FR-004`, versión 1.1.
- El levantamiento se organiza por sala, campaña o periodo, e incluye responsables, revisores y fechas.
- Se registran verificaciones física, ARKA y ERP, además de estados como Activo, Obsoleto, Dañado y Mantenimiento.
- La hoja de mobiliario incluye ítems de sala, identificadores locales y números institucionales.
- El formato LAI es un documento institucional y debe conservar su estructura y contenido oficial.

### 3. Recepción técnica y alta documental

- El formato de recepción `GSIT-PR-002-FR-007`, versión 2, registra orden de compra, proveedor, especificaciones técnicas, seriales de CPU y monitor, lista de comprobación funcional, garantía y firmas.
- En la documentación revisada se encuentra un acta de recepción de 183 computadores correspondiente a 2024.
- La recepción técnica constituye un punto documental previo a la incorporación o actualización de información de equipos.

### 4. Mantenimientos y servicio técnico

- La hoja `Mantenimientos` contiene aproximadamente 3.242 registros y cerca de 900 identificadores únicos.
- Se identificaron 43 registros de mantenimiento sin correspondencia clara en la base de activos revisada.
- El formato de servicio `SG-FR34` incluye número de caso, falla reportada, estado físico, diagnóstico, pruebas, solución, repuestos, observaciones y firmas del cliente y del técnico.
- La documentación registra mantenimientos preventivos y correctivos, así como intervenciones asociadas a componentes.

### 5. Placas, componentes y relación entre equipos

- Los archivos `SN_SALAS_PLAQUETA`, `PCS_NUEVOS`, `PCS_ANTIGUOS` e inventarios históricos contienen relaciones entre torres, monitores y otros componentes.
- CPU, monitor, mouse, teclado y periféricos aparecen como elementos identificables en los inventarios y formatos.
- Algunas fuentes contienen placas repetidas en contextos distintos; el significado operativo de estas repeticiones debe validarse antes de convertirlas en restricciones del sistema.

### 6. Traslados, entregas y asignaciones

- El formato de transferencia `GIF-PR-005-FR-008` registra quien entrega, quien recibe, fechas, elementos transferidos, origen, destino y observaciones.
- Los documentos de entrega y recepción contienen información de responsables y soportes de la operación.
- La documentación revisada contempla trabajadores, responsables de sala y personal técnico o administrativo.

### 7. Insumos

- `inventario insumos.xlsx` contiene las hojas `empaques`, `estados`, `historial`, `insumos`, `trabajadores` y `ubicaciones`.
- El catálogo contiene aproximadamente 906 registros de insumos; se observan existencias actuales, cantidades iniciales, estado, ubicación y datos de empaque.
- El historial contiene aproximadamente 1.529 eventos con tipos como Nuevo ingreso, Eliminar, Editar, Salida, Entrada, Entradas/Salidas y Reactivar.
- Gran parte del detalle de los movimientos está vacío o expresado en texto libre; por ello, el historial no permite reconstruir con certeza todos los saldos únicamente a partir de sus textos.
- Se observan trabajadores y ubicaciones como catálogos relacionados con la gestión de insumos.
- En otra versión revisada de inventario se identifican movimientos con columnas de cantidad más estructuradas.

### 8. Imágenes, discos, copias y soportes

- `Lista Imagenes` y `Contenido Discos.xlsx` documentan imágenes, respaldos, plantillas, software y contenido asociado a equipos o salas.
- La documentación permite identificar la existencia de estos soportes, pero no define por sí sola si todos deben formar parte del alcance funcional del aplicativo.

## Macroprocesos que pueden delimitarse con la evidencia disponible

1. **Inventario y caracterización de activos y salas.** Consolidación de equipos, periféricos, mobiliario, placas, seriales, ubicaciones, estados y características.
2. **Gestión de hojas de vida institucionales.** Consulta y diligenciamiento del formato oficial de Hoja de Vida, con sus imágenes, campos y antecedentes.
3. **Levantamiento y conciliación LAI.** Registro de campañas por sala y comparación de inventario físico, ARKA y ERP.
4. **Recepción técnica de equipos.** Registro de adquisiciones, proveedores, órdenes, especificaciones, pruebas, garantías y firmas.
5. **Traslados, entregas y asignaciones.** Documentación de movimientos de bienes entre responsables, salas, sedes, almacén y centro de acopio.
6. **Mantenimiento y soporte técnico.** Gestión de casos, diagnósticos, pruebas, soluciones, repuestos, garantías y cierre.
7. **Gestión de insumos y movimientos.** Catálogo, existencias, entradas, salidas, ajustes, estados, ubicaciones, trabajadores e historial.
8. **Soportes documentales y trazabilidad.** Gestión de formatos, firmas, imágenes, respaldos, observaciones y consultas históricas.

## Límites de lo que puede afirmarse actualmente

Los archivos permiten delimitar dominios, documentos, datos y relaciones observadas. No permiten establecer todavía, de manera concluyente, los permisos por rol, aprobaciones, estados de transición, reglas de unicidad, política de integración futura con ERP, procedimiento de migración, retención documental ni alcance definitivo de imágenes, copias y software.

## Base para la siguiente etapa

La siguiente etapa debe validar cada macroproceso con sus responsables y convertir los hallazgos en: entradas y salidas, actividades, documentos utilizados, datos obligatorios, excepciones, responsables y criterios de cierre. Las definiciones técnicas o reglas de negocio deberán registrarse separadamente como decisiones aprobadas, no como hallazgos.
