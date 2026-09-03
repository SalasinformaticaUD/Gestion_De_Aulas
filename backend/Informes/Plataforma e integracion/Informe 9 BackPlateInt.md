# Informe 9 - Plataforma e Integración

FECHA: 02/09/2026  
AUTOR: Edwin Alejandro Orjuela Olarte  
TURNO: 6:00 a. m. - 10:00 a. m.

## OBJETIVO DE LA JORNADA

Continuar el desarrollo y la validación del Módulo de Software Instalado, con
énfasis en la importación masiva desde Excel, la integridad de las asociaciones
con aulas y la facilidad de consulta. Adicionalmente, se inició el cierre del
Módulo de Usuarios implementando la restricción exclusiva para el administrador,
sin afectar las reglas de negocio de los demás módulos.

## AVANCES REALIZADOS

### Módulo de Software Instalado

* Se corrigió la numeración de errores reportados durante la importación masiva.
  El número mostrado ahora corresponde a la fila real del archivo Excel,
  considerando la fila de encabezados. Por ejemplo, un error en la fila 6 se
  reporta como fila 6 y no como fila 5.
* Se refactorizó la importación masiva para aplicar una lógica de actualización o
  inserción por aula y nombre de software. Cuando una misma aula ya tiene un
  programa registrado y el Excel trae otra versión, se reemplaza la asociación
  anterior por la versión nueva, evitando que queden dos versiones del mismo
  software instaladas en el mismo salón.
* Se conservó la lógica de reemplazo integral del inventario cuando el archivo no
  contiene errores, así como el reporte parcial cuando existen filas inválidas.
* Se agregó un buscador en la sección **Búsqueda combinada / Aulas por software**.
  Permite filtrar los programas por nombre o versión mientras se escribe,
  facilitando la selección de uno o varios requisitos sin recorrer manualmente
  todo el catálogo.
* El buscador muestra la cantidad de coincidencias, mantiene las selecciones ya
  realizadas y comunica cuando no hay programas que coincidan con el texto
  ingresado.
* Se limpiaron de forma controlada el catálogo de software y las asociaciones
  aula-software para realizar nuevas pruebas de importación. Se conservaron las
  aulas y el historial de importaciones.

### Módulo de Usuarios

* Se implementó una validación específica de rol administrativo basada en el rol
  institucional `ADMINISTRADOR`.
* El backend ahora protege las operaciones de Usuarios, Cargos y Roles con esta
  validación, sin depender del modo permisivo de los permisos generales.
* Se ocultó la opción **Usuarios** del menú lateral para sesiones que no cuenten
  con el rol `ADMINISTRADOR`.
* Se agregó la verificación en la ruta `/usuarios`: un usuario no administrador
  es redirigido al inicio y recibe el aviso de acceso denegado.
* El acceso directo mediante URL o llamadas a la API queda bloqueado con respuesta
  HTTP 403 para usuarios que no sean administradores.

## RESTRICCIONES Y REGLAS CONSERVADAS

* La importación de software continúa aceptando únicamente archivos Excel con
  extensión `.xlsx` o `.xls`.
* Cada fila de importación debe contener Aula, Software y Software Versión.
* Las asociaciones permanecen vinculadas únicamente a aulas existentes y activas.
* Un error en una fila no impide procesar las demás filas válidas; el resultado se
  informa como parcial y se detalla la causa de cada error.
* El reemplazo de inventario anterior se ejecuta solamente cuando el archivo no
  presenta errores, preservando los datos existentes ante cargas parciales.
* La actualización de versión no elimina el software de otras aulas que aún lo
  tengan asociado.
* El acceso al Módulo de Usuarios se restringe por rol en backend y frontend; no
  basta con ocultar una opción del menú para obtener acceso.
* No se modificaron las reglas funcionales de los demás módulos.

## VALIDACIONES EJECUTADAS

### Software Instalado

1. **Validación de formato y tipo de archivo (Frontend y Backend)**

   * **Prueba ejecutada:** Se verificó el comportamiento del selector de archivos
     al intentar adjuntar documentos.
   * **Lo que demostró:** El sistema restringe la selección exclusivamente a
     archivos Excel y rechaza formatos no permitidos mostrando un mensaje de
     error. Esto protege al sistema de archivos incompatibles antes de iniciar
     el procesamiento.

2. **Prueba de volumen y procesamiento masivo (archivos extensos)**

   * **Prueba ejecutada:** Se cargó un archivo Excel válido con el formato
     institucional **soft**, con más de 3.000 filas.
   * **Lo que demostró:** El backend procesa grandes volúmenes de datos en una
     única transacción sin errores de tiempo de espera, caídas del servidor ni
     bloqueos de rendimiento, completando la importación automáticamente.

3. **Asociación lógica con aulas existentes**

   * **Prueba ejecutada:** Se verificó la vinculación de programas con los
     salones después de la importación masiva.
   * **Lo que demostró:** El algoritmo interpreta correctamente la columna Aula
     del Excel y crea la asociación relacional con el aula registrada, asegurando
     que cada software se asigne al espacio físico correspondiente.

4. **Detección de campos nulos (integridad de datos)**

   * **Prueba ejecutada:** Se evaluó la respuesta ante celdas vacías en columnas
     obligatorias del Excel.
   * **Lo que demostró:** El sistema detecta las omisiones de Aula, Software o
     Software Versión e impide que se creen registros incompletos o fantasma en
     la base de datos.

5. **Manejo de filas con error**

   * **Prueba ejecutada:** Se validó el procesamiento de archivos con filas que
     contienen datos inválidos o inconsistencias estructurales.
   * **Lo que demostró:** La aplicación informa los errores por fila con la
     numeración real de Excel y continúa procesando las filas válidas, evitando
     que una inconsistencia puntual corrompa toda la importación.

6. **Actualización de versión por aula**

   * **Prueba ejecutada:** Se importó un software ya asociado a un aula con una
     versión diferente.
   * **Lo que demostró:** La asociación anterior se reemplaza por la nueva versión
     del mismo software, evitando duplicados de versiones dentro de una misma
     aula.

### Integración y compilación

* Se ejecutaron 11 pruebas unitarias del servicio de Software, incluyendo la
  actualización de versión de una instalación existente.
* Se ejecutaron las pruebas unitarias del servicio de Usuarios.
* Se compiló correctamente el backend con `npm run build`.
* Se compiló correctamente el frontend con `npm run build`.
* Se reinició el backend y se verificó que quedara activo en el puerto 3001.

## PENDIENTES Y SIGUIENTES PASOS

1. **Módulo de Usuarios:** comprobar inicialmente, con una cuenta administradora
   y otra no administradora, que la restricción exclusiva recién implementada
   funcione en menú, ruta y API. Posteriormente completar los demás requisitos:
   retirar la gestión de contraseñas del módulo, limitar los cargos a asistente,
   monitor, técnico y profesional, permitir desactivar o eliminar cargos y asignar
   automáticamente el cargo Monitor al crear un monitor.
2. **Módulo de Limpieza:** permitir seleccionar salas, mostrar la matriz conforme
   al formato institucional de Excel y aplicar las reglas de negocio previstas.
3. **Módulo de Tareas Operativas:** reflejar la regla de negocio en el dashboard,
   conservar la asignación original y generar el informe de actividades realizadas
   y pendientes cuando una tarea no se complete.
4. **Prácticas Libres:** completar el envío real de correo, la finalización con
   confirmación de cumplimiento sin multa y la integración con el Módulo de Multas.
5. **Gestión temporal de Estudiantes y Docentes:** retirar las pantallas temporales
   del administrador al finalizar la validación correspondiente.

## ESTADO ACTUAL

El Módulo de Software Instalado cuenta con importación masiva validada para
archivos institucionales extensos, asociación con aulas existentes, control de
campos obligatorios, reporte de errores con fila real de Excel, actualización de
versiones por aula y búsqueda combinada más ágil por nombre o versión.

En el Módulo de Usuarios ya se incorporó la restricción técnica exclusiva del rol
`ADMINISTRADOR`. El siguiente paso prioritario es comprobarla con usuarios de
distintos roles y continuar el resto de requisitos de Usuarios antes de avanzar
con Limpieza, Tareas Operativas y los pendientes de Prácticas Libres.
