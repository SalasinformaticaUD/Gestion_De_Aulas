# Verificador documental de contratistas — validación por documento

Módulo integrado en Gestión de Aulas con NestJS, Prisma/PostgreSQL y Next.js. No requiere registrar al contratista en otro módulo.

## Política vigente: solo resultados — 2026-11-26

Los PDF se reciben temporalmente en memoria para su validación y se descartan al concluir la petición, también cuando hay errores. No se guardan originales, texto completo ni copias adicionales de campos extraídos. Se conservan el resultado, los valores necesarios para explicar los hallazgos y los metadatos de procedencia (nombre, tamaño, hash, documento y página).

Cada validación nueva requiere un borrador nuevo y cargar nuevamente todos los documentos. Reenviar los mismos PDF a una verificación finalizada devuelve 409; no reutiliza resultados anteriores ni recupera documentos almacenados. Consultar el historial solo consulta resultados.

`20261126130000_verificador_solo_resultados` elimina las columnas `contenido`, `claveAlmacenamiento`, `textoExtraido` y `camposExtraidos`, incluyendo los originales y textos anteriores, sin borrar verificaciones, hallazgos ni evidencias de resultados. La eliminación en la base activa no implica borrar backups o snapshots externos anteriores.

La limpieza de buffers se ejecuta tanto en el servicio como en un interceptor que cubre errores previos al controlador. Los workers se terminan antes de completar la operación. No se crean archivos temporales documentales en disco. La transferencia al backend sigue siendo necesaria para analizar los PDF; se elimina su almacenamiento permanente.

Aplicada en la base local: se retiraron 18 originales y se conservaron los 2 registros de resultados, comprobando su huella antes/después. La migración quedó registrada como aplicada. No se ejecutaron otras migraciones.

Validación del cambio: 304 pruebas de backend y 30 de frontend; prueba real de migración con datos anteriores, conservación del historial, ausencia física de las columnas de contenido, nueva carga y rechazo de reutilización de resultados.

## Eliminación individual y desplegables — 2026-11-26

Cada fila del historial permite eliminar una verificación previa confirmación. La operación exige módulo, LEER y `VERIFICADOR_DOCUMENTAL_ELIMINAR`; este último se administra desde los roles existentes y se incorpora al administrador mediante la migración específica, sin concederlo a otros roles. Un usuario con solo LEER o CREAR no puede borrar, incluso en modo permisivo.

`DELETE /verificador-documental/verificaciones/:id` elimina exclusivamente el id indicado, con sus metadatos documentales y hallazgos en cascada. La eliminación y una auditoría mínima (actor/id/acción, sin nombres ni valores personales) son transaccionales. Un fallo revierte la operación. Un registro inexistente devuelve 404 y uno en procesamiento devuelve 409.

La interfaz permite cancelar, bloquea dobles envíos, cierra el detalle eliminado y regresa a una página válida al borrar su última fila. Los encabezados `summary` del módulo muestran cursor de mano, evitan la selección de texto y conservan el comportamiento nativo por teclado y el foco visible. Los valores originales de los resultados siguen siendo seleccionables.

La migración `20261126160000_verificador_eliminar_individual` quedó aplicada y registrada en la base local: permiso creado y asignado al rol ADMINISTRADOR. No se ejecutó el seed general.

Pruebas actuales: 319 backend y 30 frontend, más navegador con Next/Nest/PostgreSQL: cancelación, confirmación, borrado de una sola fila con cascada, conservación de otros registros, permisos, reversión ante fallo de auditoría, paginación y estilos/teclado de desplegables.

## Alcance documental vigente — 2026-11-26

Se requieren **ocho documentos**. La planilla de seguridad social fue retirada del catálogo, la clasificación, la extracción, la comparación y las validaciones de nuevos expedientes. No se exige período de cotización. Las versiones nuevas son `reglas-v3`, `comparacion-v2` y `particulares-v2`.

Las nuevas verificaciones sin planilla no generan un faltante de seguridad social. Si se adjunta una planilla, se trata como documentación ajena al alcance esperado. Los resultados y los valores de enumeración anteriores se conservan para mantener el historial. La retirada de la planilla no requiere migración; la política de descarte sí incorpora la migración específica indicada arriba.

Verificación del cambio: 299 pruebas de backend y 30 de frontend. Compilaciones y controles del módulo; prueba de ocho documentos con proxy Next.js, NestJS y PostgreSQL, sin planilla/período, y ausencia de almacenamiento de originales.

Pruebas de orden independiente: secuencia habitual, invertida y mezclada, con ocho documentos en PDF unificado e individuales; se identifica la misma diferencia de cédula y la página que le corresponde. Suite actual: 310 pruebas de backend y 30 de frontend.

## Funcionalidad

- Datos de referencia y borradores: tipo y número de identificación, nombre completo, fecha de solicitud y modalidad de carga.
- Un PDF unificado o varios PDF individuales, seleccionados mediante diálogo o arrastrando archivos.
- Lista de archivos con tamaño y estado, eliminación antes del envío y detección de duplicados por SHA-256.
- Comprobaciones inmediatas en el navegador; el backend siempre vuelve a validar extensión, MIME, firma, cierre y estructura real del PDF mediante `pdf-lib`.
- Rechazo de archivos vacíos, dañados, protegidos con contraseña o fuera de los límites.
- Progreso real de envío mediante XHR y estado de procesamiento hasta recibir la respuesta del servidor.
- Identificación por contenido de Personería, Procuraduría, Contraloría, Policía Judicial, medidas correctivas, delitos sexuales, REDAM, declaración de veracidad .
- Segmentación por archivo y rango de páginas. Continuaciones verificadas por paginación consecutiva y contexto de la entidad; páginas sin texto no se heredan al documento anterior.
- Hallazgos de documentos no identificados, duplicados, páginas ajenas, clasificación incierta y límites incompletos.
- Resultado con documentos identificados, rango de páginas, criterio de clasificación y observaciones, conservado en el historial.
- Historial con búsqueda, paginación, autor, detalle y posibilidad de retomar borradores.

## Límites

| Regla             | Límite                   |
| ----------------- | ------------------------ |
| PDF unificado     | Exactamente un archivo   |
| PDF separados     | De uno a veinte archivos |
| Tamaño individual | 20 × 1024 × 1024 bytes   |
| Tamaño total      | 60 × 1024 × 1024 bytes   |
| Páginas por PDF   | Hasta 500                |

Los textos de interfaz expresan los tamaños como MB. El catálogo del backend publica los límites para mantener consistente la selección del cliente. MIME vacío o `application/octet-stream` se admite únicamente si el contenido pasa las comprobaciones reales de PDF. El nombre original no se utiliza como ruta de almacenamiento.

## API y permisos

Todas las rutas exigen sesión y acceso al módulo `VERIFICADOR_DOCUMENTAL`.

| Método | Ruta                                                  | Permisos        |
| ------ | ----------------------------------------------------- | --------------- |
| GET    | `/verificador-documental/catalogos`                   | LEER            |
| POST   | `/verificador-documental/verificaciones`              | LEER y CREAR    |
| GET    | `/verificador-documental/verificaciones`              | LEER            |
| GET    | `/verificador-documental/verificaciones/:id`          | LEER            |
| DELETE | `/verificador-documental/verificaciones/:id`          | LEER y ELIMINAR |
| POST   | `/verificador-documental/verificaciones/:id/procesar` | LEER y CREAR    |

La carga se recibe en memoria con presupuesto agregado de 60 MiB comprobado por cada bloque, además del límite de 20 MiB por archivo. Los errores descartan las referencias a los buffers y no se crean archivos temporales en disco. No se utiliza el nombre original como ruta.

La carga usa `multipart/form-data` con uno o más campos `archivos`. Se rechazan campos adicionales. Los permisos completos son `VERIFICADOR_DOCUMENTAL_LEER`, `VERIFICADOR_DOCUMENTAL_CREAR` y `VERIFICADOR_DOCUMENTAL_ELIMINAR`, asignables con el administrador de roles existente. No se crearon roles nuevos ni se concedieron permisos a perfiles ajenos. `DocumentalAccessGuard` mantiene estas comprobaciones estrictas aunque otros módulos usen `PERMISSIONS_MODE=permissive`. El permiso LEER permite consultar el historial compartido del módulo; no existe una restricción por autor de la verificación.

## Persistencia y estados

La carga trabaja sobre un borrador existente. Primero valida todos los PDF, extrae su texto con PDF.js y aplica las reglas documentales; después, una transacción reclama el borrador, guarda únicamente los metadatos de procedencia, los documentos identificados, las evidencias de comparación y validación particular, los hallazgos y un evento de auditoría. El estado distingue inconsistencias de comprobaciones pendientes de revisión. Una falla no deja archivos parcialmente guardados.

La comprobación no reescribe ni normaliza el contenido de los PDF. Los originales, incluidos los firmados, solo se analizan durante la petición y se descartan. Los modelos persistidos y el detalle público no contienen bytes originales, claves de almacenamiento ni texto extraído completo. Las respuestas del módulo fijan `Cache-Control: private, no-store`. `DocumentalExceptionFilter` reutiliza el filtro común, sustituyendo los errores internos por una excepción segura antes de registrarlos; no adjunta argumentos de Prisma ni fragmentos del PDF a los logs.

El reclamo condicional impide procesar simultáneamente el mismo borrador. Una verificación finalizada no se reprocesa. Para repetirla se crea un borrador nuevo y se vuelven a cargar todos los PDF. Si el navegador pierde la respuesta, se consulta el historial para comprobar el resultado; no se recuperan archivos del servidor.

`PROCESANDO` es una transición dentro de la transacción. La interfaz muestra los estados en tiempo real de la petición; no existe aún una cola de procesamiento en segundo plano.

## Reglas de clasificación

`document-classification.rules.ts` define anclas propias del encabezado o emisor, señales de apoyo y contexto de cada uno de los ocho tipos. Se normalizan tildes, mayúsculas, espacios y separadores. Un ancla aporta 4 puntos y cada apoyo 2; se exige un ancla, al menos 6 puntos y una ventaja mínima de 2 sobre el siguiente candidato. El puntaje expresa reglas satisfechas, no una probabilidad estadística ni autenticidad.

Las referencias incidentales a otras entidades no bastan por sí solas. Se considera la paginación `Página/Hoja/PAG n de m` o el pie `n/m`. Una segunda página de Policía puede reconocerse por su URL institucional y la paginación del documento anterior. Si no se puede confirmar la separación entre segmentos contiguos, se marcan límites inciertos y un posible duplicado en vez de afirmarlo automáticamente.

Los documentos requeridos pueden presentarse en cualquier orden, tanto dentro de un PDF unificado como entre PDF individuales o archivos compuestos. La clasificación usa el contenido y conserva las páginas físicas; las comparaciones y reglas particulares no dependen de la posición. No se generan hallazgos por orden. La interfaz muestra una lista sin numeración de documentos requeridos. Se siguen detectando faltantes, duplicados, páginas ajenas e ilegibles. Los resultados históricos conservan las reglas con las que fueron generados.

PDF.js se ejecuta localmente en un worker aislado por archivo, con 20 segundos y un heap máximo de 256 MiB. El parser estructural de pdf-lib también se aísla por archivo, con 10 segundos y un heap máximo de 256 MiB. Los mensajes internos de los workers no se propagan a los logs. No se envía contenido a servicios de IA ni se realizan consultas a entidades. Una falla de extracción genera páginas pendientes de revisión y no impide conservar los demás resultados. El texto se conserva internamente para etapas posteriores; la respuesta pública muestra criterios y rangos sin incluir el texto completo.

La versión `reglas-v3`, el estado por segmento, las evidencias, el puntaje y la necesidad de revisión manual quedan persistidos. Registros anteriores sin versión conservan sus resultados históricos; crear una nueva verificación permite clasificarlos con las reglas actuales, sin sobrescribir el historial.

## Motor de comparación personal

`personal-data-extraction.service.ts` extrae datos del titular con reglas por contexto y etiquetas: nombre completo, nombres y apellidos separados cuando estén explícitos, identificación, tipo, nacimiento, expedición de la identificación, lugares y otros campos compartidos (nacionalidad, sexo, correo y teléfono). Las fechas de consulta o aprobación del formato, los números de certificado y los NIT de entidades no se interpretan como datos personales. El lugar/fecha de emisión de un certificado no se atribuye a la identificación sin contexto explícito. No se divide automáticamente un nombre completo en cuatro partes.

Cada observación conserva campo, valor original, página física del PDF y regla de extracción. La clasificación mantiene las páginas originales en memoria durante el procesamiento para que los campos no se asignen a la primera página del documento por defecto. Se guardan solo las evidencias de los resultados, el resumen y grupos en `resultadoComparacion`, y la versión `comparacion-v2` en la verificación.

`personal-data.normalization.ts` normaliza espacios, mayúsculas, tildes, formatos de identificación y fechas, tipos y algunas equivalencias explícitas de lugar. La ñ permanece distinta de n. Los números se conservan como texto, incluidos ceros iniciales; O y 0 no se intercambian. Las fechas ambiguas o inválidas quedan no interpretables en lugar de inferirlas por mayoría. Un formato de día/mes declarado en la etiqueta sí se respeta.

`personal-data-comparison.service.ts` compara sin elegir un documento de referencia absoluto. Cada tipo documental aporta como máximo un voto por campo. Repetir páginas o copias no aumenta los votos. Cuando un documento o ejemplares del mismo tipo contienen valores contradictorios, ese tipo no vota para ese campo hasta revisión; otros campos consistentes pueden seguir comparándose.

Se distingue igualdad exacta, igualdad tras normalización, diferencias ortográficas o numéricas, empates, información insuficiente y mayoría relativa o absoluta. Una referencia mayoritaria requiere al menos dos tipos independientes y más de la mitad de los votos comparables. Una pluralidad sin mayoría absoluta se muestra como mayoría relativa sin referencia suficiente; en un empate no se selecciona ningún valor. Ningún valor se corrige automáticamente. La distancia de edición solo identifica posibles diferencias ortográficas, sin unir grupos distintos.

Los nombres con presentación explícita «apellidos y nombres» se alinean por rotación compatible con los nombres encontrados en otros documentos. Se conservan sus originales; si hay varios candidatos compatibles, se exige revisión. No se reordenan arbitrariamente nombres de presentación natural ni se eliminan partículas de apellidos compuestos.

Los datos ingresados por el funcionario se muestran como referencia separada y no votan ni determinan la mayoría. Cada hallazgo personal se vincula a documento, campo y página, e incluye originales, valores comparados, fuentes y necesidad de revisión manual. Los campos no presentes en ninguno de los formatos se muestran aparte, sin tratar su ausencia como una discrepancia.

La interfaz incluye resumen por campo y una vista de originales, normalización y procedencia. Las diferencias o contradicciones generan estado `CON_INCONSISTENCIAS`; las comprobaciones no verificables dejan el estado `INCOMPLETA`. `SATISFACTORIA` exige que no haya hallazgos pendientes; la firma de la declaración requiere revisión especializada y no se da por comprobada mediante extracción textual. Los resultados finalizados son de consulta; repetir la validación requiere una nueva carga completa.

## Presentación final y cierre seguro

La pantalla prioriza tres resultados: «Documentación verificada correctamente», «Documentación con inconsistencias» y «Verificación incompleta». Las correcciones se agrupan por documento e indican archivo, página o rango disponible, campo, valor original, valor con mayor coincidencia, observación y acción requerida. Para un documento no identificado no se inventa una página ni un valor. Los empates, la mayoría relativa y la fuente única no generan un valor sugerido para corregir. Las fechas y los períodos exigidos se presentan como valores de la regla, separados del consenso personal.

Las tablas de clasificación, comparación y comprobaciones particulares quedan en «Consultar documentos y evidencias de la revisión», cerrado inicialmente. No se generan informes PDF, descargas ni reportes administrativos.

`document-result.ts` exige los ocho tipos sin duplicados, clasificación suficiente, identidad coincidente entre al menos dos tipos, comprobaciones particulares y ausencia de hallazgos pendientes antes de permitir `SATISFACTORIA`. Un contador de errores en cero o una lista vacía no bastan. Los faltantes, páginas sin texto, OCR pendiente, incertidumbre, contradicciones y datos no verificables impiden el éxito. La interfaz vuelve a comprobar las evidencias y conserva esta protección para registros históricos; no convierte un estado incompleto del servidor en satisfactorio.

La firma de la declaración continúa pendiente de revisión humana o especializada. Mostrar el estado satisfactorio no introduce una aprobación manual ni valida firmas automáticamente.

## Reglas particulares (`particulares-v2`)

`document-validation.service.ts` aplica reglas a los documentos identificados, sobre las mismas extracciones personales que consume el comparador. El resumen y las evidencias quedan en `resultadoComparacion.validacionDocumental`; los hallazgos reutilizan la relación documento, página, campo, valores originales y revisión manual. No requiere columnas ni migraciones adicionales a las cuatro del módulo. Los registros anteriores conservan su resultado histórico.

| Documento           | Controles específicos                                                                                                                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Personería          | Tipo y número del titular, nombre, fecha de expedición y leyenda del resultado.                                                                                                                                       |
| Procuraduría        | Identidad del titular, nombre, fecha del encabezado y resultado; no confunde al funcionario firmante con el titular.                                                                                                  |
| Contraloría         | Tipo y número consultados, fecha de consulta SIBOR y resultado; no exige un nombre que este formato no imprime ni usa el código de verificación como cédula.                                                          |
| Policía Judicial    | Tipo, número, apellidos/nombres y fecha de consulta; excluye advertencias legales al identificar el resultado.                                                                                                        |
| Medidas correctivas | Tipo/número del ciudadano, fecha de consulta y leyenda del resultado; no inventa un nombre ausente.                                                                                                                   |
| Delitos sexuales    | Identidad del ciudadano, apellidos/nombres, fecha y resultado; el NIT de la entidad consultante no identifica al contratista.                                                                                         |
| REDAM               | Tipo/número, fecha de emisión, resultado y vigencia expresamente impresa.                                                                                                                                             |
| GC-PR-002-FR-038    | Código del formato sin imponer versión, identidad, lugar de expedición de identificación, texto de declaración/juramento, lugar y fecha de diligenciamiento, etiquetas personales vacías; firma para revisión humana. |

La fecha de aprobación del formato, la expedición de la cédula, las fechas legales y los pies de impresión no sustituyen la fecha propia del certificado. Se detectan fechas contradictorias o posteriores a la solicitud. Los formatos ambiguos o inválidos requieren revisión. Solo se comprueba vencimiento cuando existe una fecha de vigencia impresa; la antigüedad por sí sola no implica vencimiento.

Cada comprobación indica `OK`, `INCONSISTENCIA` o `NO_VERIFICABLE`. Una leyenda textual no demuestra antecedentes reales ni autenticidad. Las anotaciones requieren revisión humana. La ausencia de un dato en el texto no demuestra que falte en el original. No se infiere presencia, ausencia ni autenticidad de una firma a partir de la palabra «Firma» o de una línea gráfica.

## Alcance pendiente

Quedan OCR, verificación especializada de firmas, consultas de autenticidad ante entidades y reglas de vigencia que no estén impresas en los documentos. No se han inventado plazos legales ni se determina habilitación jurídica. La comparación comprueba coherencia textual, no autenticidad ni habilitación jurídica. Registros históricos sin versión de comparación conservan su resultado previo; crear una nueva verificación permite aplicar el motor actual sin sobrescribir su historial.

## Habilitación

Migraciones necesarias:

1. `20261125160000_verificador_documental`: modelos y catálogo de permisos de la primera fase.
2. `20261125170000_verificador_carga_pdf`: columna BYTEA para los originales.
3. `20261125180000_verificador_clasificacion`: versión y evidencias de clasificación por segmento.
4. `20261125190000_verificador_comparacion`: versión, resumen de comparación y procedencia de hallazgos personales.
5. `20261126130000_verificador_solo_resultados`: elimina el almacenamiento de PDF y texto completo, incluidos contenidos anteriores.
6. `20261126160000_verificador_eliminar_individual`: registra ELIMINAR y su acceso administrativo inicial.

Generar Prisma con `npm run prisma:generate` y aplicar las migraciones por el procedimiento habitual del entorno. Revisar primero `npx prisma migrate status`: en la base local había migraciones anteriores ajenas pendientes, por lo que no se ejecutó un despliegue general ni el seed de desarrollo. Actualizar la sesión después de asignar permisos.

El proxy de Next.js admite un cuerpo de hasta 64 MB para transportar los 60 MB de PDF más los encabezados multipart, evitando que el límite predeterminado de 10 MB trunque el envío. Los límites efectivos por archivo y por lote siguen siendo responsabilidad del backend.

Las dependencias `pdf-lib` y `pdfjs-dist` quedan fijadas en `package.json` y `package-lock.json`. PDF.js requiere Node >= 22.13; el entorno local Node 22.19 y las imágenes Node 22 del proyecto cumplen ese requisito. No se requiere un servicio adicional ni modificar el renderizador de reportes.

## Validación de fases anteriores (incluía planilla)

- `npm test -- --runInBand verificador-documental`: 330 pruebas HTTP, de extracción, clasificación, normalización, comparación y validación particular. Incluyen cinco contra uno, empates, mayorías relativas, contradicciones internas, copias y páginas repetidas, fechas ambiguas e inválidas, nombres compuestos y conservación de originales.
- `npm run test:verificador` en `Frontend`: 31 pruebas del estado presentado, historial, mayoría, empate, insuficiencia y protección frente a éxito sin evidencias.
- Prueba en navegador de los tres estados y las tarjetas, carga real con documento faltante y página ilegible, persistencia, vista móvil y evidencia secundaria cerrada por defecto. El estado satisfactorio se prueba con un fixture de presentación, sin aprobar firmas ni modificar registros reales.
- Compilación de frontend y backend; lint de los archivos del módulo y chequeo focalizado de TypeScript.
- Prueba automatizada en navegador con NestJS y PostgreSQL reales en un esquema temporal: carga unificada, clasificación, rangos, PDF individuales y paquete alterado con faltante, duplicado, desorden y páginas ajenas, sin texto y ambiguas. El esquema de prueba se elimina al finalizar.
- Comparación con navegador, proxy, NestJS y PostgreSQL: paquete real sin falsas diferencias, ejemplo cinco contra uno, nueve documentos con diferencias de nombre, número, tipo, nacimiento y lugar, empate 2–2, fuente única, fecha ambigua y contradicción multipágina.
- Reglas particulares probadas con los nueve documentos reales, PDF unificado y separados, cambio de año, planilla alterada y declaración incompleta; navegador y PostgreSQL reales con esquema temporal eliminado.
- Envío de un PDF de más de 12 MB a través del proxy real de Next.js, recibido íntegro por NestJS y PostgreSQL.
- Los veinte PDF de las carpetas de ejemplo pasaron por el validador real, sin modificar sus originales.

El chequeo global de tipos de las pruebas antiguas del backend presenta errores ajenos a este módulo, ya identificados en la primera fase; este trabajo no modifica esos archivos.

## Auditoría histórica — 2026-11-25 (alcance anterior de nueve documentos)

| Área                                    | Resultado comprobado                                                                                                                                                                                                                     |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Carga unificada e individual            | Extensión/MIME/contenido/estructura, tamaño individual y total durante recepción, veinte archivos, duplicados y eliminación previa al envío. Carga de más de 12 MB íntegra por proxy, backend y PostgreSQL.                              |
| Nueve tipos, faltantes, orden y páginas | Pruebas de encabezados, reglas, segmentación, duplicados, faltantes, orden unificado, páginas ajenas y clasificación incierta. Los nombres de archivo no deciden la clasificación.                                                       |
| Extracción textual                      | PDF.js real, originales conservados, página física y fallos parciales identificados. Veinte PDF reales aceptados por el parser estructural aislado.                                                                                      |
| OCR                                     | **No implementado**. Un PDF que solo contiene imágenes permanece SIN_TEXTO/NO_RECONOCIDO y requiere OCR; no se generan datos ni se declara éxito. La prueba confirma detección y bloqueo, no reconocimiento óptico.                      |
| Nombres, apellidos y ortografía         | Normalización, nombres compuestos, orden explícito apellidos/nombres y distancia de edición. No se inventan partes del nombre.                                                                                                           |
| Identificación y consenso               | Ceros iniciales y originales preservados, un voto por tipo, cinco contra uno, empate, mayoría relativa, fuente única y contradicciones internas.                                                                                         |
| Fechas                                  | Emisión/consulta propia, fecha personal separada, fechas ambiguas, imposibles, contradictorias, posteriores a solicitud y vigencia impresa. No se presuponen plazos legales.                                                             |
| Seguridad social                        | Aportante separado de cotizantes y NIT de administradoras; salud/pensión separadas, mes anterior dinámico, enero/diciembre, pago y total a pagar separado de total de nómina.                                                            |
| Resultado e ilegibilidad                | Tres estados, tarjetas accionables, originales y páginas, escritorio/móvil. Ausencias, ilegibilidad y pendientes impiden éxito en procesamiento, lectura de API, historial y pantalla.                                                   |
| Datos y permisos                        | Sesión obligatoria, LEER/CREAR según rol, denegación incluso con modo permisivo, no-store y errores internos sin argumentos personales. El catálogo de permisos es idempotente y no asigna permisos al rol no autorizado.                |
| Persistencia y temporales               | Transacción real, reintento idempotente, dos envíos concurrentes sin duplicados, rollback real después de guardar archivos y antes de guardar documentos. No hay temporales documentales en disco. El esquema QA se elimina al terminar. |
| Integración                             | Compilan backend completo y frontend completo. Las rutas, navegación, Prisma, guardias, proxy e historial funcionan. Los cambios de seguridad están limitados al verificador.                                                            |

Correcciones de auditoría: permisos estrictos propios del módulo, política no-store, límite agregado durante la recepción, aislamiento del parser estructural, sanitización de errores internos y revisión conservadora del estado histórico también en API. Ninguna requiere migración nueva.

Resultados automatizados: 330 pruebas del módulo backend y 31 del frontend aprobadas. La suite global del backend tiene 595 pruebas aprobadas y 2 fallidas (597 en total): ambas son de `prestamos-docentes.service.spec.ts`, sobre ocupación del aula y registro de profesor externo sin proyecto. Los archivos de ese módulo no fueron modificados por este desarrollo. No se cambiaron sus reglas de negocio para ocultar los fallos. El chequeo global de tipos informa 15 errores en pruebas/helpers ajenos al verificador; el chequeo focalizado de este módulo y ambas compilaciones pasan. ESLint global del frontend: cero errores y quince advertencias en pantallas existentes; el módulo no presenta errores de lint.

La integración se ejercitó con NestJS, proxy Next.js y PostgreSQL reales en un esquema temporal. La identidad JWT del usuario de QA se suministra como fixture: no se presenta esa prueba como una validación del proveedor de identidad de producción. El estado exitoso de la interfaz se ejercita con un fixture de presentación, sin aprobar firmas reales. El fallo 500 del rollback se provoca deliberadamente y se comprueba que no revele el detalle interno al cliente.

Pendientes reales:

- OCR para escaneos/fotografías y validación especializada de firmas. No existe todavía un flujo para resolver/cerrar manualmente hallazgos. Una firma pendiente conserva INCOMPLETA aunque los demás datos coincidan.
- Consultas oficiales de autenticidad, habilitación jurídica y reglas de vigencia no impresas: fuera del motor textual actual.
- Aplicar las cuatro migraciones del módulo en la base habitual y asignar permisos desde Administración. `prisma migrate status` también detecta tres migraciones ajenas pendientes; no se ejecutó un despliegue general ni seed durante la auditoría.
- Política de retención/borrado del historial y verificación de cifrado, TLS y backups en el despliegue: no están acreditados por estas pruebas locales. Los originales y textos se conservan en PostgreSQL; no se afirma que estén cifrados por la aplicación.
- Corregir por separado los dos fallos funcionales y los errores de tipado de pruebas ajenos al módulo. Por ello el repositorio completo no queda declarado como totalmente aprobado.
