# Informe 8 - Plataforma e Integración

FECHA: 01/09/2026  
AUTOR: Juan esteban Cañon Solorza 

FECHA: 01/09/2026  
AUTOR:  Edwin Alejandro Orjuela 

## OBJETIVO DE LA JORNADA

Continuar el desarrollo a partir de los pendientes establecidos en el Informe 7,
priorizando el Módulo de Credenciales. Se implementó el control de acceso
reforzado, la administración de autorizaciones por usuarios y roles, y la gestión
sin categorías, conservando autenticación, permisos, auditoría y reglas de negocio.

## AVANCES REALIZADOS

### Módulo de Credenciales

* Se implementó una ventana de seguridad al ingresar al módulo. El usuario debe
  confirmar la contraseña de su sesión antes de visualizar las credenciales.
* El desbloqueo queda vigente durante 15 minutos en el backend. Durante ese tiempo,
  consultar una credencial no solicita nuevamente la contraseña.
* El administrador puede consultar todas las credenciales bajo su rol administrativo,
  sin depender de una autorización individual.
* Se permite crear y modificar el nombre, la descripción y el estado ACTIVA o
  INACTIVA de la credencial.
* Se eliminó el uso de categorías en DTO, filtros, modelo y vista.
* Se agregó el registro de una contraseña propia para cada usuario autorizado.
  Las contraseñas se almacenan cifradas y no se exponen en la consulta general.
* Se agregó la administración de autorizaciones individuales, incluyendo permisos
  para consultar y administrar accesos.
* Se agregó la autorización mediante selección múltiple de roles.
* Se conserva la información de los estados de autorización al actualizar un usuario.
* Se agregó el botón de eliminación con confirmación, permisos y auditoría.
* Los errores de autorización o validación se muestran dentro del módulo y no
  redirigen innecesariamente al usuario a la página de inicio.

### Backend, base de datos e integración

* Se creó la estructura SecretoCredencial para guardar la contraseña de cada usuario.
* Se creó la relación CredencialRol para permitir autorizaciones asociadas a varios roles.
* Se aplicaron las migraciones de base de datos correspondientes.
* Se integró la validación de la contraseña actual mediante AuthService.
* Se mantuvieron los permisos CREDENCIALES_LEER, CREDENCIALES_VER_SECRETO,
  CREDENCIALES_ACTUALIZAR y CREDENCIALES_ELIMINAR.
* Se mantuvo la auditoría de creación, actualización, consulta y eliminación.

### Estabilidad de ejecución

* Se revisó el error EADDRINUSE del puerto 3001.
* Se identificó que ocurre al iniciar una segunda instancia del backend mientras
  otra ya está ejecutándose.
* Se dejó una única instancia activa del backend en el puerto 3001.
* El frontend continúa en el puerto 3000 y apunta al backend mediante
  http://localhost:3001.
* Se agregó un mensaje específico para distinguir un puerto ocupado de un error
  funcional del módulo.

## RESTRICCIONES Y REGLAS CONSERVADAS

* Las credenciales no se muestran antes de confirmar la contraseña de la sesión.
* El desbloqueo de seguridad tiene una duración limitada de 15 minutos.
* El administrador puede visualizar todas las credenciales; los demás usuarios
  solo acceden a las autorizadas individualmente o por alguno de sus roles.
* Una credencial puede ser autorizada para varios roles simultáneamente.
* Cada usuario autorizado administra su propia contraseña.
* Las contraseñas permanecen cifradas en la base de datos.
* Las operaciones administrativas continúan protegidas por autenticación, permisos
  y auditoría.
* La eliminación requiere el permiso correspondiente y mantiene la integridad de
  las relaciones de autorizaciones y secretos.
* No se modificaron las reglas funcionales de los demás módulos.

## VALIDACIONES EJECUTADAS

* Se generó nuevamente el cliente Prisma después de modificar el esquema.
* Se aplicaron correctamente las migraciones de secretos por usuario y roles.
* Se compiló el backend con npm run build.
* Se ejecutaron las pruebas unitarias del servicio de Credenciales.
* Se ejecutó el lint y la compilación del frontend.
* Se verificó el inicio de sesión del administrador.
* Se verificó http://localhost:3001/health, con respuesta HTTP 200.
* Se verificó el endpoint de Credenciales con el administrador, obteniendo HTTP 200
  y la consulta de todas las credenciales.
* Se verificó que el backend actualizado quedara activo en el puerto 3001.

## PENDIENTES Y SIGUIENTES PASOS

1. **Módulo de Software Instalado:** validar integralmente el Excel institucional,
   asociación con aulas existentes, archivos extensos, filas con error y reemplazo
   de la información anterior.
2. **Módulo de Usuarios:** mantener acceso exclusivo para el administrador,
   seleccionar cargos, gestionar cargos disponibles y asignar automáticamente el
   cargo monitor cuando corresponda.
3. **Módulo de Limpieza:** seleccionar salas y mostrar la matriz conforme al Excel
   institucional, aplicando las reglas de negocio definidas.
4. **Módulo de Tareas Operativas:** mostrar la regla de negocio en el dashboard,
   conservar la asignación original y generar el informe de actividades realizadas
   y pendientes cuando una tarea no se complete.
5. **Prácticas Libres:** completar el envío real del correo, la finalización con
   confirmación de cumplimiento sin multa y la integración con Multas.
6. **Gestión temporal de Estudiantes y Docentes:** retirar las pantallas temporales
   del administrador cuando finalice la validación.
7. **Seguridad de Credenciales:** evaluar un token de desbloqueo persistido o
   distribuido si el sistema se despliega en varias instancias.

## ESTADO ACTUAL

El Módulo de Credenciales cuenta con acceso protegido al ingresar, gestión de
metadata, autorización individual y por múltiples roles, contraseñas independientes
por usuario, consulta sin solicitudes repetitivas, eliminación y validaciones de
backend. El backend y el frontend fueron compilados y verificados.

El siguiente frente prioritario es validar integralmente Software Instalado y
continuar con Usuarios, Limpieza y Tareas Operativas, además de cerrar los
pendientes de Prácticas Libres y retirar la gestión temporal de Estudiantes y
Docentes cuando finalice su validación.
