# Informe 7 - Plataforma e Integración

FECHA: 01/09/2026  
AUTOR: Esteban Bautista  

## OBJETIVO DE LA JORNADA

Continuar el desarrollo posterior al Informe 6, atendiendo los requerimientos de
Disponibilidad, Prácticas Libres, gestión temporal de Estudiantes y Docentes,
Préstamos Docentes y Préstamos Audiovisuales. Los cambios se realizaron respetando
las reglas de negocio existentes, las validaciones de backend y la integración entre
frontend, API y base de datos.

## AVANCES REALIZADOS

### Módulo de Disponibilidad

* Se mejoró la presentación visual del módulo para facilitar la lectura del estado
  de cada aula, sus restricciones y los bloques disponibles.
* Se corrigieron problemas de contraste, superposición y corte de texto en las
  tarjetas, especialmente en modo oscuro y en aulas con nombres extensos.
* La disponibilidad considera la asistencia registrada para las clases programadas.
* Se conserva la regla automática: si transcurren 20 minutos desde la fecha y hora
  programada de una clase sin registrar asistencia, se interpreta como
  **inasistencia** para el cálculo de disponibilidad.
* La validación se realiza con la fecha, hora y bloque programado, para evitar que
  una clase pendiente deje información inconsistente sobre la ocupación del aula.

### Módulo de Prácticas Libres

* Se incorporó el flujo para solicitar al estudiante el software requerido antes
  de sugerir una sala.
* Las recomendaciones se generan únicamente con aulas disponibles que cuentan con
  el software solicitado.
* Al seleccionar una sala se solicita el código estudiantil y se valida el
  estudiante antes de continuar con el préstamo.
* El backend vuelve a validar estudiante, software instalado, disponibilidad,
  multas activas y posibles cruces de horario antes de guardar una práctica libre.
* Cuando el estudiante no existe, se habilitó un flujo de creación rápida desde el
  proceso de práctica libre, sujeto a los permisos definidos para estudiantes.
* Se mantuvo el control de reglas de negocio para impedir el préstamo cuando exista
  una multa activa o pendiente que lo restrinja.
* Se preparó la gestión de prácticas con información de estado, registros activos e
  historial, conservando la estructura operativa del módulo de préstamos docentes.

### Gestión temporal de Estudiantes y Docentes

* Se habilitaron operaciones de crear, consultar, modificar y eliminar estudiantes
  y docentes en el frontend de administración, únicamente como apoyo temporal para
  validar el flujo de Prácticas Libres y Préstamos Docentes.
* Se añadieron permisos independientes para la gestión de estudiantes y para la
  gestión de docentes, con validación en backend.
* Se mantuvo la separación entre las entidades de estudiantes/docentes y los
  usuarios del sistema; no se asumen como la misma entidad.
* **Pendiente de retiro:** estas opciones se muestran temporalmente al administrador.
  Cuando se termine la validación funcional y se asigne la gestión a los usuarios
  con los permisos correspondientes, se deben retirar del menú y del acceso directo
  del administrador.

### Módulo de Préstamos Docentes

* Se mantuvo la lista de docentes y se agregó la búsqueda e identificación por
  número de documento o cédula.
* Al generar una solicitud, el sistema asigna automáticamente como encargado al
  usuario autenticado que la creó.
* Se actualizó el modelo de datos y la migración correspondiente para almacenar la
  relación con el encargado del préstamo.
* Se conservaron las validaciones existentes de disponibilidad, docente, aula y
  estado de la solicitud.

### Módulo de Préstamos Audiovisuales

* Se incorporó el acceso de **Préstamos Audiovisuales** en el menú principal.
* La vista principal ahora muestra los préstamos actuales por defecto y permite
  aplicar un filtro para consultar el historial completo.
* Se habilitó el inventario audiovisual con acciones para agregar, modificar y
  eliminar equipos; no se permite eliminar un equipo prestado o con historial que
  pueda afectar la trazabilidad.
* El registro de un préstamo guarda responsable del préstamo (monitor, técnico o
  asistencial), profesor responsable, cédula del profesor, placa o código del
  videobeam/equipo, fecha y hora automática de salida, elementos adicionales
  (HDMI, extensión VGA u otros), salón escrito como texto libre y hora estimada de
  devolución.
* En la devolución se registra quién recibe el equipo, las observaciones y el
  estado funcional de los elementos para liberar el equipo o enviarlo a
  mantenimiento.
* Se agregó el formulario modal **“Agregar equipo audiovisual”**. Solicita placa o
  código de inventario, nombre, tipo, estado inicial y observaciones, con
  validaciones de campos obligatorios y mensajes de éxito o error.
* Se conservaron la auditoría, el control de estados del equipo y las validaciones
  de disponibilidad antes de registrar un préstamo.

### Estabilidad de ejecución

* Se revisaron los errores de inicio de sesión ocasionados por procesos duplicados
  y una caché de compilación dañada de Next.js.
* Se restableció la ejecución local dejando el frontend en el puerto `3000` y el
  backend en el puerto `3001`.
* Se verificó la respuesta del frontend, el endpoint de salud del backend y la
  compilación de los módulos intervenidos.

## RESTRICCIONES Y REGLAS CONSERVADAS

* La disponibilidad no se calcula únicamente por el horario: también considera la
  asistencia, la inasistencia automática después de 20 minutos y los bloqueos del
  aula.
* Una práctica libre no se guarda si el estudiante no es válido, tiene multa que
  impide el préstamo, el software no está instalado o existe un cruce de
  disponibilidad.
* Las operaciones de estudiantes y docentes requieren permisos independientes en
  la API.
* En préstamos docentes, el encargado se obtiene del usuario autenticado y no se
  selecciona manualmente de forma arbitraria.
* Los equipos audiovisuales no se eliminan si se encuentran prestados o si la
  eliminación afecta la trazabilidad de préstamos existentes.
* Se mantienen los controles de autenticación, permisos y auditoría en las acciones
  administrativas incorporadas.

## VALIDACIONES EJECUTADAS

* Se ejecutó el lint del frontend después de implementar los cambios de interfaz y
  formularios, finalizando correctamente.
* Se compiló el backend con `npm run build` después de actualizar los modelos,
  DTO, servicios y controladores de préstamos docentes y audiovisuales.
* Se aplicaron las migraciones de base de datos requeridas para el encargado de
  préstamos docentes y los datos manuales de préstamos audiovisuales.
* Se verificó la página de audiovisuales y la respuesta del frontend en
  `http://localhost:3000/audiovisuales`.
* Se comprobó el endpoint de salud del backend en `http://localhost:3001/health`.

## PENDIENTES Y SIGUIENTES PASOS

1. **Software Instalado:** definir el formato institucional del Excel para software
   instalado por aula, validar encabezados, campos obligatorios, aulas existentes,
   software duplicado y formatos de datos antes de guardar. Esta carga debe
   alimentar únicamente la relación de software instalado por aula y no modificar
   la información base importada desde el archivo “capacidad aulas”.
2. **Módulo de Credenciales:** solicitar contraseña para consultar una credencial;
   permitir que el administrador defina el nombre, descripción, estado activo o
   inactivo y los usuarios autorizados para verla; permitir que cada usuario
   autorizado agregue sus propias contraseñas; y eliminar el uso de categorías.
3. **Módulo de Usuarios:** mantener el acceso exclusivamente para el administrador;
   impedir el registro de contraseñas desde este módulo; permitir seleccionar los
   cargos asistente, monitor, técnico o profesional; gestionar la activación o
   eliminación de cargos disponibles; y asignar automáticamente el cargo monitor
   cuando se cree un usuario monitor.
4. **Módulo de Limpieza:** al registrar limpieza, permitir seleccionar las salas a
   limpiar, mostrar la matriz conforme al formato manejado en Excel y continuar con
   la lógica de negocio definida en el documento correspondiente.
5. **Módulo de Tareas Operativas:** mostrar en el dashboard la regla de negocio
   definida. Si una tarea no es aceptada, debe continuar asignada al responsable
   inicial; si queda en proceso y no se completa, debe generar un informe de lo
   realizado y de lo pendiente.
6. **Prácticas Libres:** completar y verificar el envío de correo de confirmación
   con las reglas de uso; al finalizar, informar si se cumplió sin multa o redirigir
   al módulo de multas con la recomendación y los datos necesarios para registrar
   la novedad. También se debe terminar el mini dashboard y la separación final de
   gestión actual e historial.
7. **Gestión temporal de Estudiantes y Docentes:** retirar las pantallas temporales
   del administrador una vez sean validadas y se habilite el acceso solo a los
   usuarios que tengan los permisos específicos de crear, modificar o eliminar.

## ESTADO ACTUAL

Después del Informe 6 se avanzó en Disponibilidad, Prácticas Libres, Estudiantes y
Docentes temporales, Préstamos Docentes y Préstamos Audiovisuales. Los módulos
intervenidos cuentan con validaciones de interfaz y backend, persistencia de los
nuevos datos y controles de permisos. El siguiente frente prioritario es el Módulo
de Software Instalado con su Excel independiente, seguido por Credenciales,
Usuarios, Limpieza y Tareas Operativas.
