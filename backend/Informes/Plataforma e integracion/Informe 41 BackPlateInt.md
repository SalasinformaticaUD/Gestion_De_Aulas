# Informe Plan de Integración 41 - Validación de contratos, pruebas de regresión y comunicación de inconsistencias

FECHA: 25/09/2026  
AUTORES: Edwin Alejandro Orjuela Olarte  

## TURNOS DE TRABAJO

* **Edwin Alejandro Orjuela Olarte:** 6:00 a. m. a 10:00 a. m. del viernes 25/09/2026.

## OBJETIVO DE LA JORNADA

Validar los pendientes técnicos asociados a autenticación, estadísticas e inconsistencias de asistencia; alinear las pruebas automatizadas con el contrato vigente de la API; y mejorar la comunicación del flujo de resolución e invalidación de marcaciones en Gestión de Monitores.

## ALCANCE Y REGLA DE TRABAJO

* La revisión se concentró en los flujos de autenticación, consulta de monitor, estadísticas de inconsistencias e invalidación de marcaciones.
* Se contrastó el comportamiento expuesto por la API, la documentación de integración y el flujo implementado en el frontend antes de cambiar expectativas de pruebas.
* La invalidación de una marcación requiere motivo y confirmación explícita en la interfaz; la anotación se conserva como mecanismo independiente para documentar o ajustar horas.
* Se preservaron las reglas de autorización: una solicitud sin credenciales recibe `401`; una identidad autenticada sin permisos recibe `403`.

## TRABAJO REALIZADO

### Dependencias y pruebas del backend

* Se verificó que `bcrypt` ya se encuentra instalado y disponible en el entorno virtual local, en la versión `5.0.0`.
* Se ejecutaron las pruebas focalizadas de horarios, actas y flujos de API, con resultado de **19 pruebas aprobadas**.
* Se ejecutó la batería completa inicial, identificando cinco expectativas desactualizadas frente al contrato actual.
* Se actualizó la prueba de estadísticas de inconsistencias para incluir `pending_by_type`, campo que la API ya entrega con el desglose de tipos pendientes.
* Se actualizaron las pruebas de solicitudes anónimas de `/api/v1/auth/me/` y de consulta de monitor para esperar `401`, de acuerdo con la autenticación requerida por la API.
* Se revisaron las reglas de invalidación de inconsistencias y se confirmó que una marcación puede invalidarse directamente con un motivo, sin requerir una anotación previa.
* Se ajustaron las pruebas de marcación sin pareja y par corto para validar la invalidación directa: el registro queda rechazado, la inconsistencia resuelta y no se crea una anotación de solución.
* Se ejecutó nuevamente la batería completa del backend con resultado de **110 pruebas aprobadas**.

### Comunicación del flujo de inconsistencias

* Se revisó el flujo existente de Gestión de Inconsistencias y se diferenciaron visualmente sus dos decisiones funcionales:
  * **Resolver con anotación:** registra una explicación o ajuste de horas y conserva la marcación original.
  * **Invalidar marcación:** rechaza la marcación y cierra la inconsistencia sin crear un ajuste de horas.
* Se renombraron los controles para reflejar esas decisiones y reducir ambigüedad para administradores y líderes.
* Se agregó un mensaje contextual dentro del modal para explicar el efecto de cada decisión antes de enviarla a la API.
* Se agregó confirmación explícita para invalidar: además del motivo obligatorio, la persona debe marcar que confirma el rechazo de la marcación. El botón permanece deshabilitado hasta completar ambas condiciones.
* Se mejoró el mensaje de error cuando una marcación ya generó una sesión: la interfaz informa que debe invalidarse primero la sesión derivada.
* Se incorporó un estilo contextual para que las explicaciones del modal mantengan legibilidad en los temas claro y oscuro.

### Revisión de cambios y responsive

* Se revisaron los cambios efectuados en backend y frontend, verificando que las reglas de interfaz correspondan con el contrato de la API.
* Se revisaron los flujos establecidos para operación normal y responsive: acciones de resolver con anotación, invalidar marcación, confirmación, mensajes de resultado y presentación del modal en pantallas reducidas.
* La compilación de producción del frontend finalizó correctamente después de los ajustes de comunicación y confirmación.
* Se intentó realizar la comprobación visual interactiva en vista normal y en los dispositivos disponibles en la interfaz Developers de Chrome. La automatización local se bloqueó por el error de Windows `CryptUnprotectData`; por ello queda pendiente una verificación manual en Chrome antes de declarar aprobada la revisión visual responsive.

## VALIDACIÓN TÉCNICA

* `python -m pytest apps/schedules/tests.py apps/reports/tests.py tests/api/test_migrated_backend_flows.py -q` finalizó con **19 pruebas aprobadas**.
* `python -m pytest tests/api/test_platform_authentication.py tests/api/test_public_lookup.py tests/api/test_attendance_inconsistencies.py -q` finalizó con **12 pruebas aprobadas**.
* `python -m pytest tests/attendance/test_pairing_services.py -q` finalizó con **9 pruebas aprobadas**.
* `python -m pytest -q` finalizó con **110 pruebas aprobadas**.
* `npm run build` del frontend finalizó correctamente con compilación, validación de TypeScript y generación de rutas completadas.

## COSAS PENDIENTES

1. Realizar manualmente en Chrome la verificación visual del módulo Inconsistencias en escritorio y en los perfiles de dispositivo disponibles en Developers, incluyendo la apertura de ambos modales, el estado deshabilitado del botón de invalidación y su comportamiento al confirmar.
2. Validar los flujos integrados con datos reales y cuentas de administrador, líder y monitor.
3. Contrastar Dashboard, Registros, Anotaciones, Actas y Notificaciones con datos del periodo académico vigente, incluyendo llegadas tarde y cálculos de horas.
4. Confirmar que una marcación que ya generó una sesión conduzca al flujo de invalidación de sesión correspondiente desde la interfaz.

## ESTADO FINAL

Los contratos de autenticación, estadísticas e invalidación quedaron reflejados en las pruebas automatizadas y la batería completa del backend finalizó sin fallos. El flujo de inconsistencias comunica ahora con claridad cuándo resolver mediante anotación y cuándo invalidar una marcación, incorporando confirmación explícita para la operación de rechazo. La comprobación visual manual en los distintos dispositivos de Chrome queda pendiente debido al bloqueo de automatización local.