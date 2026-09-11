# Requerimientos preliminares consolidados

## Decisiones confirmadas

### Identidad del activo

Cada activo tendrá un `id_activo` interno, único y permanente. Este identificador será la llave técnica del aplicativo y no reemplazará los datos visibles en los formatos institucionales.

La placa institucional puede repetirse en dos activos independientes. Por ello, no existirá una restricción de unicidad global sobre la placa. Cuando una búsqueda por placa devuelva más de un resultado, el sistema deberá permitir distinguir el activo mediante tipo de activo, serial, ubicación, componente y estado.

Los formatos LAI y las hojas de vida conservarán sus campos de placa y serial sin cambios. El aplicativo asociará cada formato al `id_activo` interno y proyectará en el formato los valores de placa, serial y demás datos requeridos por su diseño vigente.

Si un activo no tiene placa, el serial será el identificador de referencia. Si no existe placa ni serial, se deberá solicitar a almacén la generación de un código interno para relacionar el activo, su mantenimiento o cualquier otro proceso.

### Ficha central y formatos institucionales

El aplicativo tendrá una ficha central de activo que será la fuente operativa de datos compartidos. Desde esa ficha se alimentarán en paralelo la hoja de vida y el formato LAI.

Los datos comunes incluyen placa, serial, tipo, marca, ubicación, responsable, estado, fecha de revisión y revisor. Una modificación aprobada de estos datos deberá reflejarse en ambos formatos.

Los campos propios de cada formato conservarán su independencia:

- Hoja de vida: adquisición, proveedor, garantía, especificaciones, accesorios, imagen e historial de mantenimiento.
- LAI: campaña de levantamiento, verificación física, contraste con ARKA y ERP, revisor y observaciones de inventario.

Una observación de campaña LAI o un mantenimiento histórico no actualizará automáticamente el otro formato. Solo los datos marcados como compartidos se sincronizarán.

### Fuente de información y conciliación

Los archivos por sala y año se consideran evidencia histórica. Ante diferencias, prevalece el dato con fecha más reciente.

ARKA prevalece como fuente actual durante la transición hacia el nuevo ERP o formato institucional. Las discrepancias se resolverán por el equipo de salas, con consulta o escalamiento a almacén.

Almacén y Centro de Acopio son denominaciones del mismo contexto logístico. El aplicativo deberá mantener un nombre normalizado y, cuando sea necesario, alias para búsqueda y documentos heredados.

### Alcance de activos

Los activos prioritarios son monitores y CPU. El alcance también contempla teclados, pantallas interactivas, sillas, altavoces, video beam, tabletas y portátiles.

Cada componente se administrará como activo independiente. Cables y mouse son la excepción principal: no requieren placa. Los demás activos deberían registrar placa, serial o código interno.

Los activos con valor superior a 800.000 COP registran placa. Esta regla debe conservarse como criterio de negocio configurable y validarse con almacén antes de automatizarla.

### Recepción, custodia y traslados

La recepción técnica es obligatoria para equipos nuevos. Para la recepción se deben diligenciar los formatos LAI y hoja de vida por los responsables correspondientes.

Los traslados se realizan por cambio de coordinador o por situaciones excepcionales. El sistema debe permitir seleccionar o cargar trabajadores desde el catálogo vigente y, adicionalmente, capturar texto libre para entrega, recepción, aprobación u otros campos variables exigidos por el formato.

El texto libre se conservará en el documento emitido. Cuando exista un trabajador registrado, la operación también conservará su relación interna para trazabilidad.

### Insumos y acceso

El saldo actual validado de insumos será el saldo de apertura para la migración. Desde ese momento, las actualizaciones deberán registrarse como entradas, salidas, traslados o ajustes con cantidad numérica y trazabilidad.

La asignación de trabajadores varía por semestre. El catálogo de trabajadores debe permitir cargas masivas y conservar vigencia, dependencia, cargo, correo y estado.

Los usuarios asistenciales, técnicos y administradores tendrán acceso a información sensible. Los monitores no podrán consultar responsables, correos, firmas, facturas ni documentos restringidos.

## Reglas de diseño derivadas

- `id_activo` es único y permanente.
- La placa y el serial son identificadores de negocio, no llaves técnicas únicas globales.
- Los formatos LAI y hoja de vida deben recibir placa y serial desde la ficha central, sin modificar sus diseños.
- Una búsqueda por placa duplicada debe solicitar contexto adicional antes de mostrar o editar el activo.
- El historial de mantenimiento, campañas LAI, traslados, documentos y verificaciones debe relacionarse con `id_activo`.
- Las campañas LAI no deben sobrescribir automáticamente el maestro de activos; las discrepancias requieren conciliación.
- El documento emitido debe conservar valores visibles y texto libre al momento de su emisión, aunque después cambie la ficha central.

## Pendientes de definición

1. Alcance de garantías, servicios externos, número de caso, partes utilizadas, tiempos de atención y cierre técnico.
2. Política final para confirmar la regla de valor superior a 800.000 COP y sus excepciones.
3. Procedimiento de generación y aprobación de códigos internos por almacén.
4. Campos LAI y hoja de vida que serán compartidos, campos exclusivos y responsable autorizado para modificarlos.
5. Nivel de acceso de cada perfil a formatos generados, anexos, firmas y datos personales.
6. Alcance de gestión de configuración de software, imágenes de disco y respaldos.

