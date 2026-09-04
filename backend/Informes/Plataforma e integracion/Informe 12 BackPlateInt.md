# Informe 12 - Plataforma e Integración

FECHA: 03/09/2026  
TURNO: 4pm-8pm
AUTOR(ES): Juan Esteban Cañon Solorza

## OBJETIVO DE LA JORNADA

Continuar los pendientes establecidos en el Informe 11, priorizando el módulo
de Multas y el desarrollo funcional y visual del módulo de Limpieza. Se buscó
consolidar el control de aseo mensual por aula, reforzar las validaciones para
imponer multas y conservar las reglas de negocio ya implementadas sin modificar
localhost, puertos, URLs ni configuraciones de conexión.

## AVANCES REALIZADOS

### Módulo de Multas

* Se ajustó la consulta de estudiantes para que el módulo valide si la persona
  tiene una práctica libre activa antes de permitir establecer una multa. La
  búsqueda por código se conserva como el identificador operativo principal.
* Se incorporó un campo visible de **Multa sugerida** dentro del formulario de
  imposición, ubicado debajo de la descripción. Este campo sirve como apoyo
  para quien registra la multa y no reemplaza el motivo ni la descripción.
* Se retiró del texto sugerido la frase fija “No entregó el aula”, ya que la
  recomendación debe ser neutral y ajustable a cada caso.
* Se implementó la búsqueda masiva de estudiantes con multa a partir de un
  archivo Excel y se habilitó la descarga de su plantilla institucional con las
  columnas `Código` y `Nombre`.
* La importación de búsqueda masiva verifica la estructura esperada de la
  plantilla. El código prevalece para localizar a cada estudiante y el nombre
  actúa como información de contraste para la revisión del resultado.

### Módulo de Limpieza

* Se transformó la matriz mensual en el elemento principal del módulo. Cada
  fila corresponde a un aula y cada columna a un día del mes seleccionado,
  evitando registrar la limpieza por horas.
* Se eliminaron de la matriz y de los filtros los campos de tipo de aula, de
  acuerdo con el formato operativo solicitado.
* Se establecieron los tres estados visibles para una celda de la matriz:
  **Realizado (R)**, **Sin registro (°)** y **Con novedad (N)**. El estado por
  defecto es Sin registro; no se mantiene un estado Pendiente.
* Se implementaron filtros de matriz por todas las aulas, realizadas, con
  novedad y sin registro, junto con una leyenda visual de los estados.
* Se rediseñó la interfaz para aproximarla al formato de referencia: indicadores
  mensuales, matriz central con desplazamiento horizontal, panel lateral de
  aulas recomendadas y un botón principal de registro.
* El panel lateral prioriza las aulas disponibles que llevan aproximadamente dos
  o más días sin limpieza. También informa las aulas sin historial y conserva
  la alerta de cierre mensual sobre aulas que no registraron limpieza durante
  el mes.
* Se retiraron elementos que no aportaban al flujo principal, entre ellos el
  botón independiente de actualizar, la pestaña de observaciones y el registro
  inferior redundante de salas.
* El botón **Registrar aseo de hoy** ahora activa el modo de edición de la
  matriz. En ese modo se pueden seleccionar varias celdas y, para cada una,
  indicar Realizado o Con novedad y agregar una observación opcional. El botón
  cambia a **Aceptar registros** para guardar el conjunto completo de cambios.
* Se conservó la restricción de edición: solo se permite registrar o modificar
  celdas del día actual o del día anterior. Las fechas con dos o más días de
  antigüedad, así como fechas futuras, se consultan en modo de solo lectura.
* Las celdas guardadas muestran su estado al pasar el cursor y, al hacer clic
  fuera del modo de edición, abren una ventana de consulta con el estado y la
  observación correspondiente.
* Se habilitó la descarga de la matriz mediante la opción de impresión/guardar
  como PDF, para conservar el registro mensual solicitado.

### Trazabilidad de observaciones de limpieza

* Se corrigió una ambigüedad de datos: anteriormente el sistema interpretaba
  que cualquier limpieza con observación era automáticamente una novedad. Esto
  impedía registrar una limpieza realizada con nota informativa.
* Se creó el estado persistente de limpieza `REALIZADA` y `NOVEDAD` en la base
  de datos. De esta forma, estado y observación quedan separados y trazables.
* Una celda marcada como **Realizada** puede ahora conservar y mostrar una
  observación al pasar el cursor o al consultar su detalle, sin que se convierta
  visualmente en Novedad.
* La migración `20260903213000_add_estado_limpieza` fue aplicada. Para no perder
  información previa, los registros históricos que ya contenían una observación
  fueron preservados como Novedad; los nuevos registros se clasifican con el
  estado seleccionado por el usuario.

## RESTRICCIONES Y REGLAS CONSERVADAS

* La multa mantiene como requisito que el estudiante exista en el sistema y se
  consulta su práctica libre activa antes de usar la imposición contextual.
* La búsqueda masiva de Multas no crea estudiantes ni modifica prácticas; solo
  permite localizar múltiples personas a partir de la plantilla validada.
* Limpieza no permite editar registros históricos con dos o más días de
  antigüedad. Esta regla protege la trazabilidad del control diario.
* Las observaciones de limpieza son opcionales para Realizado y se solicitan
  como detalle de apoyo cuando se registra una Novedad.
* Los cambios de Limpieza no modifican las reglas de disponibilidad, préstamos,
  prácticas libres, aulas ni horarios.
* No se modificaron localhost, puertos, URLs locales ni la configuración de
  conexión del aplicativo.

## VALIDACIONES EJECUTADAS

* Se verificó que la API de Limpieza recibe y devuelve el estado explícito de
  cada registro, además de la observación opcional.
* Se aplicó la migración de estado de limpieza y se confirmó que el esquema de
  base de datos quedó actualizado mediante `prisma migrate status`.
* Se ejecutó `npm run build` en el backend correctamente.
* Se ejecutó la prueba del servicio de Limpieza: **8 de 8 pruebas aprobadas**.
* Se compiló el frontend con `npm run build` y pasó la comprobación de tipos.
  Persisten advertencias preexistentes de dependencias en `useEffect` y una
  advertencia CSS en Prácticas Libres, sin errores asociados a esta jornada.

## SEGUIMIENTO DE PENDIENTES DE INFORMES ANTERIORES

1. **Multas:** quedaron implementadas la consulta de práctica libre activa, la
   sugerencia visible y la búsqueda masiva. Falta ejecutar pruebas manuales con
   el Excel institucional y comprobar los resultados con estudiantes que tengan
   y no tengan una práctica activa.
2. **Limpieza:** quedó implementada la matriz mensual, el registro interactivo,
   los filtros, las recomendaciones laterales, las restricciones de edición y
   la descarga a PDF. Falta validarla con usuarios operativos y datos reales de
   un mes completo para ajustar prioridades y mensajes si es necesario.
3. **Préstamos Docentes:** continúa pendiente la prueba funcional integral de
   docente por documento, opción de otro profesor, software requerido,
   disponibilidad estricta de aulas sin clase, encargado autenticado y bloques
   pasados o con menos de 30 minutos disponibles.
4. **Módulo de Usuarios:** falta comprobar con cuentas administradora y no
   administradora el acceso exclusivo, y completar los cargos disponibles:
   asistente, monitor, técnico y profesional; además de desactivación,
   eliminación y asignación automática del cargo Monitor.
5. **Tareas Operativas:** sigue pendiente reflejar su regla de negocio en el
   dashboard, conservar la asignación original cuando una tarea no es aceptada
   y generar el informe de lo realizado y pendiente para tareas inconclusas.
6. **Prácticas Libres:** continúa pendiente configurar y probar el envío real
   del correo de confirmación con `EMAIL_WEBHOOK_URL`.
7. **Gestión temporal de Estudiantes y Docentes:** las pantallas deben retirarse
   del acceso administrativo cuando finalice la validación y se asignen los
   permisos definitivos para su gestión.

## SIGUIENTE PASO PRIORITARIO

Realizar pruebas manuales de extremo a extremo en **Préstamos Docentes** antes
de ampliar otros módulos: identificar al docente por documento, usar la opción
de otro profesor, validar software solicitado, confirmar que solo se presten
aulas completamente libres y verificar el encargado autenticado. En paralelo,
se recomienda realizar una prueba operativa de la matriz de Limpieza y de la
búsqueda masiva de Multas con archivos institucionales reales.

## ESTADO ACTUAL

El sistema cuenta ahora con una matriz de limpieza mensual interactiva y
trazable, donde las tareas realizadas pueden guardar observaciones sin ser
confundidas con novedades. El módulo de Multas dispone de controles adicionales
para prácticas activas y de una búsqueda masiva por Excel. El siguiente foco de
calidad funcional debe concentrarse en las pruebas completas de Préstamos
Docentes y en la validación real de los flujos recién implementados.
