# Informe Plan de Integracion 28 - Migracion e Integracion de Gestion de Monitores

FECHA: 15/09/2026  
AUTORES: Juan Esteban Cañon Solorza y Edwin Alejandro Orjuela 

## OBJETIVO DE LA JORNADA

Migrar la API de Gestion de Monitores desde la rama `Api-gestion-monitores` del proyecto `SoftwareHorasMonitores` a la rama `gestion-monitores` de `Software Monitorias`. La migracion incluyo la integracion con el frontend actual, el proxy de Aulas y el proceso de autenticacion centralizado.

La rama `version-2.0` se utilizo solo como referencia. No se modifico ni se realizaron commits, merges, rebases o pushes sobre ella.

## CONTROL DE RAMAS

* La API se tomo de la rama `Api-gestion-monitores`.
* Los cambios se prepararon en la rama `gestion-monitores`.
* La rama `version-2.0` permanecio sin modificaciones.
* No se realizo commit durante esta jornada.
* No se migraron las plantillas, formularios, vistas HTML ni el frontend Django antiguo.

## CAMBIOS MIGRADOS

Se incorporo la API de Gestion de Monitores con sus modelos, servicios, selectores, migraciones, pruebas, generacion de documentos y endpoints REST. La logica que dependia de pantallas Django se conserva mediante contratos REST para el frontend general de Software Monitorias.

### Conciliacion y asistencia

* Se ampliaron las etiquetas reconocidas para dependencias de Fisica y Laboratorios.
* Las inconsistencias se limitan al semestre academico activo.
* Los lideres pueden consultar pendientes de su dependencia.
* La asignacion manual de registros de asistencia a un monitor esta restringida a administradores, tanto en la logica como en el endpoint REST.

```http
POST /api/v1/attendance/pending-reconciliation/{registroId}/assign-monitor/
Authorization: Bearer <token>
Content-Type: application/json

{
  "monitor_id": "<uuid-monitor>"
}
```

### Excepciones de horarios

* Las excepciones pueden dirigirse a uno o varios monitores y bloques de horario.
* Se incluyo la opcion `all_semester` para aplicar automaticamente las fechas del semestre activo.
* Se valida que cada bloque pertenezca a los monitores seleccionados.
* Los lideres solo pueden operar sobre monitores de su propia dependencia.
* Se incorporo la migracion `schedules/0011_scheduleexception_targeting_and_semester.py`.

### Actas de compromiso

* Se actualizaron los contenidos de las actas por dependencia.
* Se agregaron los estados `pending`, `accepted` y `rejected`.
* Se creo el modelo `CommitmentActSubmission` para archivos firmados, revision y motivo de rechazo.
* Se adaptaron los flujos HTML anteriores a contratos REST para consultar, cargar, aceptar, rechazar y descargar actas.

```http
GET /api/v1/reports/commitment-acts/me/
POST /api/v1/reports/commitment-acts/me/
POST /api/v1/reports/commitment-acts/{monitorId}/review/
GET /api/v1/reports/commitment-acts/{monitorId}/signed-pdf/
```

## INTEGRACION CON EL FRONTEND ACTUAL

El selector de Monitores y la ruta de mantenimiento se ajustaron para enviar al flujo de inicio de sesion central:

```text
/login?app=monitores
```

Se elimino el reenvio al portal anterior de monitorias. El frontend general utiliza ahora las siguientes rutas proxy:

```text
/api/aulas/:path*      -> Gestion de Aulas
/api/monitores/:path*  -> API Gestion de Monitores
```

Para evitar el conflicto con el backend de Aulas, el frontend local se dejo en el puerto `3002`. El frontend Docker se mantiene en `http://localhost:3001`.

## CORRECCION DE CONEXION Y AUTENTICACION

El ciclo que devolvia al usuario al login no era un fallo de la pantalla de autenticacion. El frontend obtenia sesion central, pero el control de acceso de Monitores rechazaba la validacion posterior del token.

Se identificaron dos causas:

1. El secreto JWT de Gestion de Aulas no coincidia con `PLATFORM_JWT_SECRET` de Monitores.
2. La API de Monitores no tenia un perfil local vinculado a la identidad externa de `admin`.

Se realizaron las siguientes correcciones:

* Se sincronizo el secreto de validacion JWT entre ambos servicios.
* Se creo y vinculo unicamente el usuario local `admin` con su identidad central.
* No se ejecuto la semilla completa, porque podia crear usuarios de ejemplo y modificar contraseñas locales.
* Se agrego `host.docker.internal` a `ALLOWED_HOSTS` de Monitores para permitir el reenvio desde el frontend Docker.
* Se reiniciaron los servicios Django de Monitores en los puertos `8000` y `8002` para cargar la configuracion actualizada.

## INTEGRACION CON LA BASE DE DATOS COMPARTIDA

La API de Monitores utiliza la misma instancia PostgreSQL de Gestion de Aulas. Las tablas administradas por Prisma permanecen en el esquema `public` y las migraciones de Django agregan las tablas propias de Monitores sin eliminar ni modificar las tablas existentes de Aulas.

La configuracion de `DATABASE_URL` se adapto para que Django interprete correctamente el parametro `schema=public` utilizado por Prisma. El valor se traduce a `search_path=public`, que es compatible con `psycopg`.

## VALIDACIONES REALIZADAS

Se ejecutaron las siguientes comprobaciones:

```powershell
python manage.py check --settings=config.settings.test
python manage.py makemigrations --check --dry-run --settings=config.settings.test
python -m pytest -q
python manage.py migrate --noinput
python manage.py runserver 127.0.0.1:8002 --noreload
```

Resultados:

* `manage.py check`: aprobado sin problemas del sistema.
* Suite automatizada: **62 pruebas aprobadas**.
* `GET /health`: respuesta `200 OK` despues del reinicio.
* `GET /api/v1/platform/me/`: respuesta `200 OK` para el usuario `admin` vinculado.
* El proxy Docker hacia Monitores responde `401` JSON cuando no se envian credenciales. Esta es la respuesta esperada y confirma que ya no retorna HTML ni bloquea el host.
* La ruta de autenticacion de Aulas responde JSON desde el proxy correcto.
* `version-2.0` permanece sin modificaciones.

## ADVERTENCIAS NO BLOQUEANTES

* Pytest puede informar problemas de escritura en `.pytest_cache` por permisos de Windows sin afectar el resultado de las pruebas.
* El esquema OpenAPI conserva advertencias sobre autenticacion JWT personalizada, UUID y vistas sin serializador declarado.
* La configuracion JWT debe mantenerse sincronizada en cada ambiente donde se despliegue Aulas y Monitores.

## PENDIENTES

* Probar el inicio de sesion en navegador con credenciales reales de cada rol.
* Validar los permisos de administrador, lider y monitor desde el frontend general.
* Confirmar el flujo completo de carga, aceptacion, rechazo y descarga de actas.
* Confirmar la politica de respaldo y despliegue de migraciones Django sobre la base compartida antes de produccion.
* Completar las anotaciones faltantes del esquema OpenAPI.

## RECOMENDACIONES FINALES

Se recomienda revisar el sistema modulo por modulo antes de autorizar el commit o el despliegue. Cada revision debe recorrer el flujo completo desde el frontend general, la ruta proxy, el endpoint REST y la validacion de permisos en Monitores.

1. **Autenticacion y acceso:** iniciar sesion con administrador, lider y monitor; comprobar redireccion, sesion y acceso denegado cuando corresponda.
2. **Monitores y perfiles:** consultar, crear o actualizar segun el rol y confirmar el vinculo con el usuario central.
3. **Horarios y excepciones:** crear una excepcion dirigida, validar sus bloques y comprobar el alcance por dependencia.
4. **Asistencia y conciliacion:** consultar pendientes, importar registros y comprobar que solo un administrador pueda asignar manualmente.
5. **Sesiones y horas:** registrar y calcular horas, incluyendo aprobacion de horas extra.
6. **Actas e informes:** cargar, revisar, rechazar y descargar un PDF firmado respetando el alcance de cada rol.
7. **Notificaciones y auditoria:** verificar los eventos, historiales y mensajes generados por los flujos anteriores.

## ESTADO FINAL

La API de Gestion de Monitores quedo migrada a la rama `gestion-monitores` e integrada con el frontend actual. La conexion de proxy y autenticacion central se corrigio para el usuario administrativo de prueba. La rama `version-2.0` no fue modificada.

El siguiente paso es realizar la revision funcional modulo por modulo. Si los resultados son conformes, se puede aprobar el commit de los cambios preparados en `gestion-monitores`.
