# Informe 11 - Plataforma e Integración

FECHA: 03/09/2026  
TURNO: Por confirmar  
AUTOR(ES): Por confirmar  

## OBJETIVO DE LA JORNADA

Verificar el estado de las cargas masivas de Estudiantes y Docentes, corregir
las restricciones que impedían importar la información institucional y finalizar
el enlace entre la devolución de Prácticas Libres y el registro de Multas. Los
ajustes se realizaron sin modificar localhost, puertos, URLs ni reglas ajenas a
los módulos intervenidos.

## AVANCES REALIZADOS

### Verificación de datos institucionales

* Se consultó directamente la base de datos para validar los registros de
  Estudiantes y Docentes.
* Se confirmó que Docentes cuenta con **404 registros**, sin documentos vacíos,
  sin nombres vacíos y sin documentos duplicados.
* Se identificó que Estudiantes no tenía registros cargados al momento de la
  revisión. Por ello, sigue pendiente ejecutar nuevamente la carga institucional
  de estudiantes y validarla desde la interfaz.

### Módulo de Estudiantes

* Se eliminó la restricción que solo permitía letras y espacios en el nombre
  durante la carga masiva. El nombre se conserva tal como llega en Excel, con
  caracteres especiales, números, tildes, símbolos o escritura institucional
  irregular.
* Se mantiene como regla obligatoria únicamente que el nombre no esté vacío y
  que el código sea numérico y único.
* Se identificó que el mensaje **“Ya existe un recurso con esos datos únicos”**
  provenía de la restricción única del correo cuando dos estudiantes distintos
  compartían la misma dirección dentro del Excel.
* Se actualizó el modelo de datos para que el correo de Estudiante pueda
  repetirse. El código estudiantil permanece como único identificador operativo.
* Se creó y aplicó la migración
  `20260903200203_permitir_correos_repetidos_estudiantes`, que eliminó el índice
  único de correo sin alterar el índice único de código.
* Se amplió el tiempo de transacción de la importación masiva a dos minutos,
  reduciendo el riesgo de errores internos al procesar archivos extensos.

### Módulo de Docentes

* Se corrigió el tratamiento de filas vacías incluidas por formato o rango de
  Excel. Estas filas ya no se interpretan como docentes inválidos.
* La importación conserva la referencia del número físico de fila del archivo.
  Si se detecta un error real, el mensaje indicará la fila correcta y no una
  posición calculada a partir de las filas procesadas.
* Se amplió igualmente a dos minutos el tiempo de transacción para cargas
  masivas extensas de Docentes.
* Se conservaron las reglas previas: `ID` y `NOMBRE` son las columnas
  requeridas, el proyecto se omite en la importación y los IDs repetidos del
  mismo archivo se procesan una sola vez.

### Módulos de Prácticas Libres y Multas

* Se revisó el motivo por el cual no era posible imponer multas al finalizar una
  práctica. El catálogo solo contenía un motivo de prueba sin multas asociadas,
  por lo que se reemplazó por los motivos operativos solicitados:

  - Entrego el aula tarde.
  - Ingresos sin autorizacion.
  - Uso indebido del aula.
  - No entrego el aula.
  - Otro (Observaciones).

* Los motivos quedan además garantizados por el servicio de Multas cuando se
  consulta el catálogo, evitando que una base nueva inicie sin opciones válidas.
* Al finalizar una práctica libre de un estudiante y seleccionar que el aula fue
  devuelta tarde, el sistema abre Multas con el estudiante ya seleccionado, el
  motivo **Entrego el aula tarde** y una descripción inicial de la situación.
* Cuando se indica que el aula no fue devuelta, se abre Multas con el mismo
  estudiante preseleccionado y el motivo **No entrego el aula**.
* El modal de Multas ya no solicita nuevamente el código estudiantil cuando la
  multa proviene de una práctica libre; solo permite revisar o cambiar el motivo
  y registrar la descripción antes de imponerla.
* Se corrigió la carga asíncrona del catálogo de motivos dentro de ese modal,
  evitando que el botón **Imponer multa** quede bloqueado por no tener un motivo
  seleccionado al llegar desde Prácticas Libres.

## RESTRICCIONES Y REGLAS CONSERVADAS

* El código de Estudiante continúa siendo único y se usa como identificador para
  préstamos, prácticas y multas.
* Permitir correos repetidos no altera la identificación del estudiante ni el
  envío de correos; el correo sigue siendo un dato de contacto.
* El módulo de Multas solo puede imponer multas a estudiantes existentes. El
  flujo desde Prácticas Libres conserva la persona previamente validada para no
  pedirla por segunda vez.
* Las multas siguen bloqueando nuevas prácticas libres mientras se encuentren
  activas.
* No se eliminaron registros de estudiantes, docentes, prácticas ni multas. Se
  eliminó únicamente el motivo de prueba `ppp`, previamente verificado sin
  multas asociadas.
* No se modificaron localhost, puertos, URLs de conexión ni configuración de
  despliegue local.

## VALIDACIONES EJECUTADAS

* Se verificó la integridad de Docentes en base de datos: 404 registros, cero
  identificaciones vacías y cero identificaciones duplicadas.
* Se confirmó que el índice de correo único ya no existe en la tabla de
  Estudiantes y que el índice único de código se conserva.
* Se comprobó que el catálogo de Multas contiene los cinco motivos operativos
  solicitados.
* Se compiló el backend correctamente mediante `npm run build`.
* El frontend compiló y pasó la comprobación de tipos. Se mantienen advertencias
  preexistentes de dependencias de `useEffect` y una advertencia de compatibilidad
  CSS, sin errores de construcción relacionados con esta jornada.

## PENDIENTES Y SIGUIENTES CAMBIOS PARA PRÓXIMOS MONITORES

1. **Validar la carga real de Estudiantes:** iniciar el backend actualizado,
   cargar el Excel institucional completo y confirmar desde la interfaz el
   número de registros creados/actualizados. Actualmente la tabla estaba vacía
   durante la revisión.
2. **Validar la carga real de Docentes:** probar el archivo institucional que
   reportó una fila inexistente y confirmar que las filas vacías de formato se
   omiten y que cualquier error restante señale la fila física correcta.
3. **Probar Multas de extremo a extremo:** con un estudiante existente, crear
   una práctica libre, finalizarla por entrega tardía y por aula no devuelta, y
   confirmar que el estudiante y el motivo aparecen precargados y que la multa
   se impone con éxito.
4. **Verificar permisos de Multas:** comprobar con los perfiles de monitor,
   técnico y asistencial que quienes deban registrar una multa cuenten con
   `MULTAS_CREAR`; en caso contrario, definir y asignar el permiso de acuerdo
   con la política funcional.
5. **Préstamos Docentes:** continuar las pruebas funcionales pendientes sobre
   docente por documento, otro profesor, software requerido, disponibilidad
   estricta de aulas sin clase, encargado autenticado y restricción de bloques
   pasados o con menos de 30 minutos disponibles.
6. **Módulo de Usuarios:** verificar con cuentas administradora y no
   administradora el acceso exclusivo, y completar la gestión de cargos
   disponibles, desactivación/eliminación y asignación automática del cargo
   Monitor.
7. **Módulos pendientes:** continuar con Limpieza y Tareas Operativas según los
   requerimientos documentados; además, configurar y probar el envío real de
   correos de Prácticas Libres mediante `EMAIL_WEBHOOK_URL`.

## ESTADO ACTUAL

La importación masiva cuenta con mayor tolerancia a datos institucionales y
archivos extensos, manteniendo código e identificación como claves operativas.
El flujo de multas ya queda enlazado con la devolución de prácticas libres, sin
duplicar la identificación del estudiante y con motivos específicos para entrega
tardía o aula no devuelta. El siguiente paso inmediato es realizar las pruebas
manuales de carga y de multas con el backend reiniciado.
