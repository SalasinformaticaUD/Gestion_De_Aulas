# Contrato de integración con Gestión de Monitores

Gestión de Aulas conserva identidad, autenticación y permisos. Gestión de Monitores
conserva sus datos funcionales (monitor, vinculación, horas y novedades). Las bases de
datos nunca se consultan entre sí.

## Aulas → Monitores

El cliente de Aulas consume la URL configurada en `MONITORES_API_URL` con un timeout
de `MONITORES_API_TIMEOUT_MS`.

| API de Monitores esperada | Uso desde Aulas |
| --- | --- |
| `GET /health` | Estado mediante `GET /integraciones/monitores/estado`. |
| `GET /usuarios/:usuarioExternoId` | Consulta puntual mediante `GET /integraciones/monitores/usuario/:usuarioExternoId`. |

La respuesta esperada para usuario usa `{ id, usuarioExternoId, nombre, estado }`.
Un `404` significa que no hay monitor asociado; no es un error de integración.

## Acceso compartido

El seed crea el módulo `MONITORES` y sus permisos. Un usuario puede acceder a la
aplicación de Monitores cuando tiene al menos un permiso de ese módulo; el login de
Aulas lo informa como `aplicaciones.puedeAccederMonitores`.

## Monitores → Aulas

Antes de crear un monitor, Monitores crea o vincula la identidad central mediante:

| Método y ruta | Autenticación | Cuerpo |
| --- | --- | --- |
| `POST /integraciones/monitores/usuarios` | `X-Monitores-Service-Token` | `nombreCompleto`, `nombreUsuario`, `correo`, `dependenciaId` opcional |

El token se compara de forma segura y nunca llega al navegador. La respuesta es
`{ id, creado, estado }`. La operación es idempotente por nombre de usuario o correo;
si ambos identifican usuarios centrales distintos responde `409`.

Una identidad creada desde Monitores queda `INACTIVA`, sin roles y con contraseña
aleatoria no expuesta. Un administrador de Aulas debe activarla y asignarle permisos
del módulo `MONITORES` antes de que pueda acceder al aplicativo.
