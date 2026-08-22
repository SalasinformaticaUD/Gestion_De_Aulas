# Informe 2 - Backend

FECHA: 18/08/2026  
AUTORES: Esteban Bautista

## AVANCES

* Se revisó el plan de Plataforma e Integración, junto con sus contratos e informes correspondientes.
* Se configuró la infraestructura base de NestJS, incluyendo la gestión de entorno con `@nestjs/config`, un filtro global de excepciones, la habilitación de CORS y la validación global de datos mediante `ValidationPipe`.
* Se creó el módulo y servicio compartidos de Prisma (`PrismaModule` y `PrismaService`) para centralizar el acceso a la base de datos.
* Se definieron convenciones comunes de API, estandarizando la paginación, el uso de ISO 8601 para fechas y respuestas de error (400 a 500).
* Se implementaron los módulos transversales de `dependencias`, `modulos`, `permisos` y `roles`, generando sus respectivos seeds.
* Se completó el CRUD de `usuarios` con contraseñas encriptadas, filtros de búsqueda, asignación de roles y desactivación lógica.
* Se estructuró la autenticación centralizada mediante JWT y bcrypt, protegiendo las rutas con `JwtAuthGuard` y `PermissionsGuard`.
* Se preparó la base para la auditoría transversal que registra operaciones críticas sin exponer datos sensibles.
* Se confirmó que los sistemas de Aulas y Monitores conservan bases de datos independientes y se comunican exclusivamente por HTTP, sin conectar directamente a la base de datos ajena.
* Se revisó la implementación del backend central de Aulas, creando un módulo de `integraciones` con el cliente `MonitoresClientService` que consume `MONITORES_API_URL`.
* En el sistema de Monitores, se añadió el campo `usuario_externo_id` (tipo UUID, único y opcional) al modelo `Monitor` mediante la migración `monitors.0010_add_external_user_id`.
* Se implementó el endpoint `GET /health` en Monitores, el cual es compatible con la ruta de estado consumida por Aulas.
* Se implementó el endpoint `GET /usuarios/{usuarioExternoId}` en Monitores, respondiendo con un error 404 en caso de no existir un vínculo.
* Se documentaron las rutas de integración en el README y los contratos en la carpeta de documentación del backend.
* Se añadieron pruebas de integración específicas para los nuevos flujos.

## ESTRUCTURA FUNCIONAL

Los componentes transversales implementados sientan las bases para el resto de los frentes:

* `prisma`: Gestión centralizada de la base de datos.
* `auth`: Autenticación, JWT y login.
* `usuarios`: Gestión de identidades y credenciales.
* `roles` y `permisos`: Autorización de acciones.
* `dependencias`: Organización jerárquica de recursos.
* `auditoria`: Trazabilidad de operaciones.
* `integraciones`: Comunicación HTTP con Gestión de Monitores.

## FUNCIONA

* El cliente de Aulas consume correctamente la configuración `MONITORES_API_URL`.
* El endpoint de usuarios devuelve el contrato exacto acordado: `{ "id", "usuarioExternoId", "nombre", "estado" }`.
* El backend arranca correctamente con la conexión de base de datos compartida y resuelve los endpoints de salud del sistema.
* La verificación estricta de tipos (`npx tsc --noEmit --incremental false`) pasa sin errores.
* Se ejecutó la suite completa de pruebas arrojando 138 pruebas aprobadas.

## PENDIENTE

* Definir e implementar en Aulas un endpoint autenticado para crear o vincular un usuario central desde Monitores. Este endpoint debe:
  * Devolver el UUID central.
  * Ser idempotente para evitar duplicidad.
  * Operar sin exigir una contraseña local de Monitores.
* Especificar el contrato de dicho endpoint: ruta, método, datos mínimos de identidad, credenciales de servicio requeridas y reglas de vinculación.
* Consumir el nuevo endpoint desde el flujo de creación y edición de Monitores, guardando la respuesta en `Monitor.usuario_externo_id`.
* Definir las reglas de sincronización ante cambios de identidad, desactivaciones y eliminaciones de usuarios.
* Asegurar que se usen identificadores externos cada vez que se necesite una relación lógica en la base de datos.
* Integrar el servicio de auditoría manualmente en las operaciones críticas del MVP y crear su prueba E2E.
* Revisar el checklist de endurecimiento: validar que todos los módulos funcionales importan `PrismaModule`, eliminar DTOs vacíos, comprobar que el CORS permite el frontend local y probar que las migraciones corren desde cero.
* Completar la documentación técnica (flujo de migraciones y configuración del usuario admin inicial).

## SIGUIENTE PASO

* Configurar `MONITORES_API_URL` en el entorno de Aulas con la URL real desplegada de la aplicación.
* Realizar pruebas de integración real entre ambos servicios en vivo, reemplazando las pruebas aisladas y el servicio mockeado.
* Evaluar y decidir el alcance para una posible fase de inicio de sesión único (SSO), aclarando que no forma parte del requerimiento actual.
* Ejecutar un "smoke test" manual sobre todos los flujos base (login, aulas, horarios, etc.) y correr todas las suites con `npm test -- --runInBand` y `npm run test:e2e` para cerrar la fase de endurecimiento.

## VERIFICACIÓN LOCAL

Ejecutar desde el directorio del backend:

```powershell
npm run build
npm test -- --runInBand
npx tsc --noEmit --incremental false