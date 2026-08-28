# Informe 5 - BackPlateInt

FECHA: 27/08/2026  
TURNO: 4:00 p. m. - 8:00 p. m.
MONITOR: Juan Esteban Cañon Solorza
TURNO: 6:00 p. m. - 10:00 p. m.
MONITOR: Carol Stefanya Velasco Rodríguez

## AVANCES

* Se tomó como punto de partida el Informe 4 y se continuó con la implementación del
  módulo de reportes, que permanecía pendiente dentro de Plataforma e Integración.
* Se conservaron las rutas REST públicas para generar reportes de prácticas libres,
  préstamos audiovisuales y asistencia SIGUD.
* Se mantuvo NestJS como responsable de la autenticación, consulta de datos y lógica
  de negocio de los reportes.
* Se creó un renderizador interno en FastAPI con el endpoint `POST /render/xlsx`.
  Este recibe el nombre de la plantilla y los valores que se deben insertar.
* El renderizador trabaja con copias temporales de las plantillas XLSX y utiliza
  LibreOffice en modo headless para convertirlas a PDF.
* Se conservaron en `backend/templates/reportes` las plantillas `SIGUD.xlsx`,
  `Ficha - Practicas libres.xlsx` y `Ficha SIGUD audiovisuales.xlsx`.
* Para evitar la pérdida de imágenes, el renderizador modifica directamente el XML
  de las celdas del XLSX y conserva las partes originales `xl/media`, `xl/drawings`,
  estilos y relaciones.
* Se corrigió el mapeo de la primera fila de registros de prácticas libres. La fila
  19 conserva los encabezados `ENTREGA` y `DEVOL`, y la fila 20 recibe cantidad,
  descripción, número interno y horas.
* En prácticas libres, `ENTREGA` utiliza la hora de solicitud y `DEVOL` utiliza la
  hora de fin estimada.
* El campo `USUARIO` muestra el nombre del estudiante solicitante y `ATENDIDO POR`
  muestra el `nombreUsuario` autenticado, como `admin`.
* El controlador de reportes devuelve el PDF como archivo binario mediante
  `Content-Type`, `Content-Disposition` y `Content-Length`.
* Se retiró `pdf-lib`, ya que la generación dejó de realizarse mediante superposición
  directa de texto sobre una plantilla PDF.
* Se documentó el arranque del renderizador Python con un entorno virtual y la
  configuración de `PDF_RENDERER_URL`, `PDF_RENDERER_TIMEOUT_MS` y `SOFFICE_PATH`.

## FUNCIONA

* El reporte de prácticas libres fue verificado funcionalmente desde la creación del
  aula y la práctica hasta la generación y descarga del PDF.
* La práctica libre utiliza correctamente el estudiante solicitante y el usuario
  autenticado para los campos posteriores del formato.
* Los datos de cantidad, descripción, interno, entrega y devolución se escriben en
  la misma primera fila de la tabla.
* La plantilla XLSX original no se modifica; cada solicitud utiliza una copia
  temporal para generar el documento.
* La API NestJS compila correctamente.
* `python -m py_compile python-renderer/app/main.py` finaliza correctamente.
* Las pruebas automatizadas del backend finalizan con **112 pruebas aprobadas en 25
  suites**.

## NO FUNCIONA

* Los reportes de préstamos audiovisuales y asistencia SIGUD todavía no han sido
  verificados funcionalmente de extremo a extremo.
* Aún no se ha confirmado visualmente en esos dos reportes la ubicación de todos los
  datos, imágenes, docentes, aulas, horarios y campos específicos de cada formato.
* La conversión real requiere que el entorno virtual Python tenga instaladas las
  dependencias del renderizador y que FastAPI esté ejecutándose en el puerto `8001`.
* Si FastAPI no está disponible o LibreOffice no se encuentra en la ruta configurada,
  NestJS devuelve un error `503` de servicio no disponible.
* La versión gratuita de Thunder Client no permite trabajar cómodamente con
  respuestas PDF binarias; para las pruebas se recomienda Postman con `Send and
  Download`.

## NO MODIFICAR

* No modificar directamente las plantillas XLSX originales durante la generación.
* No reemplazar el flujo XLSX + FastAPI por superposición directa sobre PDF sin una
  validación visual y una decisión explícita.
* No cambiar las celdas de la tabla de prácticas libres sin revisar la estructura de
  la plantilla: la fila 19 contiene encabezados y la fila 20 contiene el primer
  registro.
* No eliminar las partes `xl/media`, `xl/drawings` ni sus relaciones al modificar
  las plantillas, porque contienen las imágenes institucionales.
* No exponer públicamente el endpoint interno de FastAPI; debe permanecer accesible
  únicamente desde el backend NestJS o la red interna autorizada.
* No versionar secretos ni depender de una ruta local de LibreOffice específica para
  todos los ambientes; cada entorno debe configurar `SOFFICE_PATH`.
* No modificar los Informes 1 a 4 para registrar estos avances.

## SIGUIENTE PASO

* Instalar las dependencias de `backend/python-renderer/requirements.txt` en el
  entorno virtual de ejecución.
* Ejecutar FastAPI, NestJS y la base de datos simultáneamente para realizar el smoke
  test real.
* Verificar el reporte de préstamos audiovisuales: equipos, clase, docente,
  proyecto, salón, horarios, observaciones, firma e imágenes.
* Verificar el reporte de asistencia SIGUD: fecha, aulas, horas, docentes, filas de
  entrada/salida e imágenes.
* Confirmar mediante Postman la creación de datos, generación de los tres reportes y
  descarga correcta de cada PDF.
* Revisar si `ATENDIDO POR` debe mostrar siempre `nombreUsuario` o si la política
  institucional requiere `nombreCompleto`.
