## Informe 6 - Modulos paralelos_Backend

FECHA: 22/08/2026
TURNO: 6:00 a. m. - 10:00 a. m.
MONITOR: Kaleth Molina Diaz

## AVANCES:

* Se continuó con el desarrollo del módulo Multas, correspondiente a la Semana 5 del plan de módulos paralelos.
* Se completó el punto 3.1 - Contratos, correspondiente a la definición de los endpoints principales del módulo.
* Se establecieron los siete contratos correspondientes:

    * GET /multas?estado=&estudianteId=&codigo=
    *GET /multas/:id
    * POST /multas
    * PATCH /multas/:id/cumplir
    * PATCH /multas/:id/anular
    * GET /multas/motivos
    * POST /multas/motivos

* Se ajustó multas.controller.ts para eliminar las rutas no contempladas en el contrato, específicamente PATCH /multas/:id y DELETE /multas/:id.
* Se incorporaron filtros de consulta para la búsqueda de multas mediante estado, estudianteId y codigo.
* Se incorporó validación UUID para los parámetros :id.
* Se reorganizaron las rutas relacionadas con motivos para evitar conflictos con las rutas dinámicas del controlador.
* Se ajustó multas.service.ts con las firmas temporales necesarias para soportar los contratos definidos, sin implementar todavía la lógica de negocio.
* Se completó el punto 3.2 - DTOs del módulo de Multas.
* Se creó create-motivo-multa.dto.ts para validar la creación de motivos de multa.
* Se estableció nombre como campo obligatorio, validando que sea texto no vacío y con un máximo de 160 caracteres.
* Se estableció descripcion como campo opcional, aplicando validación cuando sea enviada y limitándola a 2000 caracteres.
* Se creó y completó create-multa.dto.ts.
* Se estableció la posibilidad de identificar al estudiante mediante estudianteId o codigoEstudiante, exigiendo al menos una de las dos formas de identificación.
* Se incorporó la validación de motivoId como UUID obligatorio.
* Se incorporó la validación de la descripción de la multa como campo opcional.
* Se implementó el recorte de espacios en los textos antes de realizar las validaciones correspondientes.
* Se creó update-multa.dto.ts para controlar las actualizaciones administrativas de una multa.
* Se limitó la actualización genérica de una multa a los campos motivoId y descripcion.
* Se evitó permitir mediante actualización genérica la modificación del estudiante o del estado de una multa.
* Se tipó el endpoint POST /multas/motivos utilizando CreateMotivoMultaDto.
* Se revisó la estructura necesaria para continuar posteriormente con la implementación de las reglas de negocio y persistencia del módulo.
* Se identificó que el servicio actual de multas continúa siendo temporal y requiere ser reemplazado posteriormente por una implementación utilizando Prisma.
* Se dejó preparada la estructura necesaria para continuar con la implementación de MultasService.
* Se identificaron como siguientes componentes del servicio la gestión de transiciones de estado, auditoría y validación de tieneMultaActiva.
* Se identificó la necesidad de integrar posteriormente PrismaModule y AuditoriaModule dentro de MultasModule.
* Se identificó el uso de CurrentUser en el controlador como mecanismo para registrar el responsable de las operaciones realizadas sobre las multas.
* Se realizaron validaciones técnicas durante el desarrollo para verificar que los cambios realizados no generaran errores de compilación o lint.
* Se ejecutó npm run build correctamente desde la carpeta backend.
* Se ejecutó ESLint en modo diagnóstico sobre el módulo de Multas sin aplicar correcciones automáticas.
* Se ejecutó git diff --check para verificar que no existieran errores de espacios o formato en los cambios realizados.
* Se mantuvo sin modificaciones el schema.prisma, debido a que la implementación de persistencia y las reglas de negocio aún no han sido completadas.
* Se mantuvieron los cambios correspondientes a los puntos 3.1 y 3.2 separados mediante commits para conservar un historial organizado del desarrollo.

## FUNCIONA:

* El módulo Multas cuenta con los siete contratos definidos para la Semana 5.
* El controlador de Multas cuenta con los endpoints establecidos en el punto 3.1.
* Los filtros de consulta de multas se encuentran definidos.
* La validación UUID para los identificadores de multas se encuentra implementada.
* Los DTOs correspondientes al punto 3.2 se encuentran creados y validados.
* La creación de multas cuenta con validaciones para identificar al estudiante mediante estudianteId o codigoEstudiante.
* La creación de multas valida el motivoId como UUID.
* La creación de motivos cuenta con validaciones de longitud y contenido.
* La actualización administrativa de multas se encuentra restringida a los campos definidos.
* POST /multas/motivos utiliza el DTO correspondiente.
* npm run build finaliza correctamente.
* ESLint del módulo de Multas finaliza sin errores.
* git diff --check finaliza sin errores.

## NO FUNCIONA:

* El MultasService todavía utiliza implementaciones temporales y no realiza operaciones reales sobre la base de datos.
* No se ha implementado todavía la persistencia de multas mediante Prisma.
* No se han implementado las transiciones reales de estado de las multas.
* No se ha implementado todavía la auditoría de las operaciones realizadas sobre las multas.
* No se ha implementado completamente tieneMultaActiva.
* No se ha integrado todavía PrismaModule dentro de MultasModule.
* No se ha integrado todavía AuditoriaModule dentro de MultasModule.
* No se ha implementado todavía el uso de CurrentUser para registrar responsables de las operaciones.
* No se han realizado cambios en schema.prisma para soportar la implementación pendiente.
* No se han realizado pruebas funcionales completas mediante Postman o Swagger.

## NO MODIFICAR:

* No modificar ni eliminar los siete contratos definidos para el módulo sin revisar previamente el punto 3.1.
* No permitir nuevamente endpoints no contemplados como PATCH /multas/:id o DELETE /multas/:id sin autorización.
* No eliminar las validaciones implementadas en los DTOs.
* No permitir que una actualización genérica modifique directamente el estudiante o el estado de la multa.
* No eliminar la validación que permite identificar al estudiante mediante estudianteId o codigoEstudiante.
* No implementar cambios en schema.prisma sin revisar previamente las relaciones y estructuras existentes.
* No reemplazar el servicio temporal por una implementación de Prisma sin revisar previamente el modelo correspondiente en el schema.
* No modificar módulos ajenos a Multas salvo que sea estrictamente necesario y esté previamente validado.
* No realizar cambios destructivos sobre la base de datos.
* IMPORTANTE: no realizar git push sin autorización del equipo.

## SIGUIENTE PASO:

* Revisar el apartado 3.3 del plan de desarrollo de Multas y determinar las reglas de negocio que deben implementarse.
* Revisar el modelo correspondiente a multas en schema.prisma.
* Reemplazar progresivamente la implementación temporal de MultasService por la implementación real con Prisma.
* Implementar las reglas de transición de estado de las multas.
* Implementar la validación de tieneMultaActiva.
* Integrar PrismaModule y AuditoriaModule en MultasModule.
* Incorporar CurrentUser en el controlador para identificar al responsable de las operaciones.
* Implementar la auditoría correspondiente a la creación, cumplimiento y anulación de multas.
* Realizar las validaciones de compilación y lint antes de marcar como completados los puntos pendientes.
* Ejecutar pruebas funcionales de los endpoints mediante Swagger o Postman una vez implementada la lógica de negocio.