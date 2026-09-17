# Informe Plan de Integracion 29 - Validacion de roles y pruebas de Gestion de Monitores

FECHA: 16/09/2026  
AUTORES: Edwin Alejandro Orjuela Olarte  
HORARIO: 6:00 a.m. a 8:00 a.m.

## OBJETIVO DE LA JORNADA

Ejecutar comprobaciones de la integracion entre Gestion de Aulas, el frontend general y la API de Gestion de Monitores. La jornada incluyo el arranque de los servicios locales, la verificacion de salud y proxy, la creacion de perfiles de prueba para los roles de lider y monitor, y la ejecucion de pruebas automatizadas relacionadas con los puntos definidos en el Informe 28.

## CONTROL DE RAMAS

* Las comprobaciones se realizaron sobre la integracion disponible en la rama `gestion-monitores`.
* No se modifico la rama `version-2.0`.
* No se realizaron commits, merges, rebases ni pushes durante la jornada.
* Los cambios realizados en datos corresponden exclusivamente a cuentas y perfiles locales de prueba para validar roles.

## SERVICIOS EJECUTADOS

Se iniciaron y comprobaron los servicios necesarios para la integracion local:

| Componente | Direccion | Resultado |
| --- | --- | --- |
| Backend Gestion de Aulas | `http://localhost:3000/health` | `200 OK` |
| Frontend Docker | `http://localhost:3001` | Disponible |
| API Gestion de Monitores | Puertos `8000` y `8002` | `200 OK` en `/health` |
| Proxy Aulas | `/api/aulas/health` | `200 OK` |
| Proxy Monitores | `/api/monitores/healthz` | `200 OK` |

La ruta protegida `/api/monitores/api/v1/platform/me/` responde `401` en formato JSON cuando no recibe token. Este resultado es esperado y confirma que el proxy alcanza la API de Monitores sin devolver una pagina HTML ni bloquear el host del frontend Docker.

## USUARIOS Y PERFILES DE PRUEBA

Antes de la jornada solo se encontraba vinculado el usuario administrativo. Para ejecutar pruebas por rol se crearon cuentas centrales con acceso al modulo Monitores y se vincularon con perfiles locales de la API.

| Usuario | Perfil local en Monitores | Dependencia | Estado de validacion |
| --- | --- | --- | --- |
| `admin` | Administrador | No aplica | Existente y validado |
| `lider.pruebas` | Lider | Fisica | Creado y validado |
| `monitor.pruebas` | Monitor activo | Fisica | Creado y validado |

Los perfiles de prueba utilizan credenciales temporales y deben cambiarse antes de utilizarlos fuera de las comprobaciones locales. No se modificaron las credenciales ni los datos del usuario `admin` ni del usuario central `monitor` existente.

## VALIDACION DE AUTENTICACION POR ROL

Se ejecutaron inicios de sesion reales mediante el proxy de Aulas para `lider.pruebas` y `monitor.pruebas`. En ambos casos, Gestion de Aulas autorizo el acceso al modulo Monitores y la API de Monitores reconocio el perfil local vinculado.

Resultados:

```text
lider.pruebas   | login=200 | accesoMonitores=True | perfil=leader
monitor.pruebas | login=200 | accesoMonitores=True | perfil=monitor
```

Esta comprobacion valida que el JWT emitido por Gestion de Aulas se reenvia correctamente por el proxy y que la API de Monitores identifica al usuario por su UUID externo.

## PRUEBAS AUTOMATIZADAS EJECUTADAS

Se ejecutaron las siguientes pruebas de la API migrada:

```powershell
python -m pytest `
  tests/api/test_migrated_backend_flows.py `
  tests/api/test_platform_authentication.py `
  tests/monitors/test_platform_integration.py `
  -q
```

Resultado:

```text
12 passed in 2.96s
```

Las pruebas cubrieron los siguientes puntos del Informe 28:

* Autenticacion de un JWT central con un perfil local vinculado.
* Rechazo de una identidad central que no tiene usuario vinculado en Monitores.
* Configuracion CORS para el frontend general.
* Excepciones de horario dirigidas a monitores y bloques especificos.
* Consulta de conciliaciones por un lider y prohibicion de asignacion manual para ese rol.
* Carga de acta de compromiso por un monitor y revision administrativa.
* Listado de monitores sin envio de acta.
* Ruta de salud compatible con Gestion de Aulas.
* Consulta de un monitor por UUID externo y respuesta `404` cuando no existe vinculo.
* Creacion de monitor desde la plataforma y repeticion segura de la misma solicitud.

Las pruebas automatizadas utilizan una base de datos temporal; no alteran los usuarios y perfiles creados para la integracion local.

## PENDIENTES

* Ejecutar el flujo completo desde el frontend en navegador: selector de Monitores, inicio de sesion, redireccion a `gestion-monitores` y carga del perfil autenticado.
* Validar visualmente las pantallas y acciones disponibles para `admin`, `lider.pruebas` y `monitor.pruebas`.
* Recorrer modulo por modulo el flujo de monitores, horarios, excepciones, asistencia, conciliacion, sesiones, actas, informes y notificaciones desde la interfaz web.
* Confirmar en el frontend que los mensajes de error, redirecciones y restricciones de permisos corresponden al rol autenticado.
* Cambiar o desactivar las credenciales temporales una vez finalicen las pruebas funcionales.

## ESTADO FINAL

Los servicios locales de Aulas, frontend y Monitores quedaron disponibles para pruebas. Se cuenta con perfiles funcionales de administrador, lider y monitor para validar la autorizacion por rol. La integracion de autenticacion y proxy fue comprobada con resultados exitosos, y las 12 pruebas automatizadas seleccionadas finalizaron sin errores.

El pendiente principal es realizar el flujo funcional completo desde el frontend y revisar modulo por modulo antes de aprobar un commit o despliegue.
