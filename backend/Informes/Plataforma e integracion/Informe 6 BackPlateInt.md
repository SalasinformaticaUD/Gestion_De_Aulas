# Informe 6 - Plataforma e Integración

FECHA: 01/09/2026  
AUTORES: Ivan Felipe Prado Blanco y Carol Stefanya Velasco Rodriguez  

## TURNOS DE TRABAJO

* **Ivan Felipe Prado Blanco:** 6:00 a. m. - 10:00 a. m.
* **Carol Stefanya Velasco Rodriguez:** 6:00 a. m. - 12:00 p. m.

## OBJETIVO DE LA JORNADA

Se leyó el documento **“Correcciones y Requerimientos del Sistema”** y se
desarrollaron los módulos de Horarios y Aulas de acuerdo con lo descrito en dicho
documento. También se incorporaron ajustes adicionales considerados pertinentes
para el funcionamiento operativo, como el control de asistencia por fecha y bloque,
sin alterar las reglas de negocio ni los flujos existentes de otros módulos.

## AVANCES REALIZADOS

### Módulo de Horarios

* Se implementó la carga masiva mediante Excel conservando el formato que se maneja
  actualmente en el archivo **“horarios”**, con las columnas: `Periodo`, `Dia`,
  `Hora`, `Cap`, `Salon`, `Grupo`, `Asignatura`, `Proyecto`, `id`, `Docente` e
  `Inscritos2`.
* El importador interpreta el día, la hora o bloque, el aula, el grupo, la
  asignatura, el proyecto curricular, el docente y la cantidad de inscritos.
* Se agregaron validaciones antes de guardar para detectar columnas obligatorias
  ausentes, datos inválidos, aulas inexistentes, bloques incorrectos, duplicados y
  conflictos de horario.
* Se mantuvo la regla de reemplazo: cuando se carga nuevamente un archivo, el
  contenido del periodo seleccionado se actualiza y se reemplazan las clases que
  ya no aparecen en el archivo, evitando duplicados.
* Se conservó la vista de consulta de horarios y se mejoró la alineación de sus
  columnas para mostrar día, hora, sala, grupo, asignatura, proyecto, docente y
  asistencia de forma consistente.
* Se mantuvo la vista general de aulas organizada por día y bloque horario.
* El conteo de semanas se maneja por semestre y reinicia en semana 1 al comenzar
  cada semestre.
* Las opciones **“Crear periodo”** y **“Agregar clase”** permanecen disponibles
  únicamente para administradores. La restricción se aplica en frontend y también
  se valida en backend.
* En el formulario de **“Agregar clase”** se retiró el campo **“Estado de la
  clase”** y se conservaron las validaciones de datos obligatorios y formato.

### Asistencia de clases

* Se habilitó el registro de **“Asistió”** y **“No asistió”** para clases cuyo
  registro todavía está pendiente.
* Solo se permite modificar la asistencia del día anterior y del día actual.
* Para el día actual, únicamente se permite registrar hasta el bloque horario que
  está transcurriendo; los bloques futuros permanecen bloqueados.
* No se permite modificar asistencia de semanas anteriores, aunque el usuario
  seleccione manualmente una semana diferente.
* Las clases fuera del plazo muestran su estado únicamente de forma informativa y
  conservan los botones deshabilitados.
* Si pasa el día siguiente al permitido y la asistencia continúa pendiente, el
  sistema la registra automáticamente como **“No asistió”**.
* La interfaz representa el estado de forma excluyente: en pendiente ningún botón
  aparece relleno; en “Asistió” se rellena el check verde; y en “No asistió” se
  rellena la X roja. El comportamiento se mantiene en modo claro y oscuro.

### Módulo de Aulas / Gestión de Aulas 2

* Se implementó la carga masiva mediante Excel conservando el formato institucional
  actual del archivo **“capacidad aulas”**, con las columnas: `Aula de software`,
  `Capacidad`, `Proyecto`, `Año`, `Marca y modelo`, `Caracteristica` y
  `Necesita Renovación`.
* Se agregó el botón **“Subir aulas masivamente”** y se mantuvo la opción de crear
  un aula individual mediante formulario.
* El formulario individual utiliza los mismos campos y estructura del archivo
  Excel.
* Se eliminó el desplegable **“Pisos”** y se retiraron las opciones de
  **“Audiovisuales”** y **“Prácticas libres”** de la gestión de aulas.
* La carga valida encabezados, campos obligatorios, capacidad numérica, valores de
  renovación, códigos duplicados y registros repetidos.
* Si el aula ya existe, la carga actualiza su información; si no existe, la crea.
  Las aulas que no aparecen en el archivo se reemplazan según la regla definida,
  evitando mantener información duplicada o desactualizada.
* Se conserva el campo **Equipo base** para edición manual desde el frontend. Este
  dato no se solicita en el Excel porque no pertenece al formato institucional de
  “capacidad aulas”.
* El campo **Necesita renovación** se puede modificar desde el formulario mediante
  una selección entre **Sí** y **No**.
* La plantilla descargable se genera con las aulas actualmente registradas, en lugar
  de utilizar datos genéricos.
* Se ajustaron los estilos de los botones en modo claro y oscuro. “Crear aula” se
  muestra en rojo, mientras que la carga masiva y la descarga usan el mismo tono
  gris y cambian a rojo al pasar el mouse.
* En modo oscuro se mejoró el contraste del aula seleccionada y del encabezado
  grande del detalle del aula.

### Relación con Software Instalado

Al cargar aulas mediante el archivo **“capacidad aulas”** todavía no se guardan los
softwares instalados de cada aula. Esto es intencional: el Excel de aulas no contiene
esa información y los softwares instalados se administran mediante otro archivo y
otro flujo, que debe ser recibido por el **Módulo de Software Instalado**. La carga
de aulas sí conserva correctamente la información propia de capacidad, proyecto,
año, marca y modelo, característica y necesidad de renovación.

## RESTRICCIONES Y REGLAS CONSERVADAS

* Las acciones de creación de periodos y clases requieren permisos de administrador
  tanto en la interfaz como en la API.
* No se guardan clases duplicadas para la misma aula, día y bloque.
* No se aceptan aulas o bloques inexistentes ni conflictos de horario.
* La carga masiva reemplaza la información del periodo seleccionado y evita
  duplicados.
* La asistencia no puede registrarse para bloques futuros ni modificarse fuera de
  la ventana autorizada.
* Las aulas relacionadas con otros registros no se eliminan de forma insegura si
  esto pudiera romper préstamos, prácticas, horarios u otras relaciones.
* Los cambios se limitaron a los módulos intervenidos y a las integraciones
  necesarias, sin modificar funcionalidades no relacionadas.

## VALIDACIONES EJECUTADAS

* Se verificó la compilación y el lint del frontend después de los ajustes visuales
  y funcionales: `npm run lint` finalizó correctamente.
* Se verificó que frontend y backend quedaran ejecutándose en los puertos locales
  configurados: frontend en `3000` y backend en `3001`.
* Se revisaron los mapeos de las columnas de los archivos “horarios” y “capacidad
  aulas” contra los modelos de datos y los servicios de importación.
* Se comprobaron las reglas de permisos, reemplazo de cargas, actualización de
  aulas existentes y bloqueo de asistencia fuera de la ventana permitida.

## PENDIENTES Y SIGUIENTE PASO

Como siguiente paso se debe continuar con los módulos y requerimientos descritos
en el documento:

1. **Módulo de Disponibilidad:** actualizar la interfaz para mejorar su presentación
   visual y hacer que la disponibilidad tenga en cuenta la asistencia o inasistencia
   de la clase después de los 20 minutos siguientes a su hora de inicio.
2. **Módulo de Prácticas Libres:** solicitar el software que necesita el estudiante
   y recomendar únicamente las salas disponibles que lo tengan instalado. Al elegir
   una sala se debe solicitar y validar el código estudiantil, revisar las reglas de
   negocio y bloquear el préstamo si el estudiante tiene una multa que lo impida.
3. **Confirmación y finalización de Prácticas Libres:** enviar un correo de
   confirmación con los datos de la práctica y sus reglas; al presionar “Finalizar”,
   confirmar si el estudiante cumplió sin multa y, si incumplió, dirigir al módulo de
   Multas con la multa recomendada y los datos restantes para completarla.
4. **Gestión de Prácticas Libres:** incorporar un mini dashboard, separar la gestión
   actual del historial siguiendo el modelo de Préstamos Docentes y registrar
   responsable del préstamo (monitor, técnico o asistencial), aula, estudiante,
   software solicitado, fecha de inicio, fecha de fin y estado.
5. **Módulo de Préstamos Docentes:** identificar al docente mediante su número de
   cédula y asignar automáticamente como encargado al usuario que genere cada
   solicitud.
6. **Software Instalado:** definir y validar el Excel independiente que alimentará
   la relación de software instalado por aula.

## ESTADO ACTUAL

Los módulos de Horarios y Aulas cuentan con carga masiva mediante los archivos
institucionales **“horarios”** y **“capacidad aulas”**, validaciones de datos,
actualización y reemplazo de registros, permisos administrativos y ajustes de
asistencia. La información de softwares instalados queda pendiente del flujo propio
del Módulo de Software Instalado. El desarrollo debe continuar con Disponibilidad,
Prácticas Libres y los ajustes de Préstamos Docentes, manteniendo las reglas de
negocio ya establecidas.


}