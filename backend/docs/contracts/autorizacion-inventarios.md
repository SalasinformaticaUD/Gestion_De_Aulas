# Consulta de autorización para Inventarios

`GET /integraciones/inventarios/usuarios/:id/autorizacion` acepta el UUID del autor y un Bearer de servicio dedicado. Configurar `COSMOS_INVENTARIOS_SERVICE_TOKEN` con el mismo secreto aleatorio de al menos 32 caracteres en los dos backends. Usar HTTPS en el entorno desplegado. La respuesta no se almacena en caché.

Devuelve `{ id, permisos, roles, aulas }` para una cuenta activa. Las aulas corresponden a la asignación vigente de responsable, excluyen aulas eliminadas y aplican la lectura de aulas de Cosmos. El ámbito de la bodega única se deriva en Inventarios de sus cuatro permisos de bodega.

El 401 indica credencial de servicio inválida. El 403 indica autor inactivo o inexistente. El 503 indica credencial de servicio sin configurar. Los errores de infraestructura se tratan como indisponibilidad.

La migración `20261113100000_inventarios_permissions` instala el módulo y los permisos de Inventarios. Se asignan a los roles elegidos mediante la administración de permisos de Cosmos.
