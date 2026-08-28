# Informe 7 - Frontend: Gestión de Monitores

FECHA: 28/08/2026  
TURNO: 6:00 a.m. a 10:00 a.m.  
MONITOR: Alejandro Orjuela

## OBJETIVO DEL AVANCE

Consolidar el frontend del aplicativo de Gestión de Monitores para mejorar la experiencia de cambio entre aplicativos, mantener una única sesión autenticada, responder visualmente a los aplicativos autorizados por el backend y continuar la migración visual y estructural de los módulos provenientes de la versión final del aplicativo antiguo.

También se buscó estabilizar las vistas principales del aplicativo: dashboard, administración de monitores, carga masiva, consulta de registros, horas extra y memorandos.

## AVANCES

* Se ajustó el estado global de sesión para conservar el token de acceso, los datos del usuario, el aplicativo activo y la lista de aplicativos autorizados después del inicio de sesión centralizado.
* Se incorporó una verificación reutilizable para consultar si el usuario tiene acceso a Gestión de Aulas o Gestión de Monitores, evitando asumir permisos por defecto mientras la sesión se está cargando.
* Se eliminó el segundo inicio de sesión que anteriormente podía requerirse para abrir Gestión de Monitores. El mismo token obtenido en el acceso central se utiliza para las peticiones hacia las APIs de destino.
* Se actualizaron los botones de cambio de aplicativo para que solo se rendericen cuando el usuario tenga autorizado el aplicativo de destino. La ocultación se mantiene como apoyo de experiencia de usuario; la validación real sigue siendo responsabilidad exclusiva del backend.
* Se añadió el usuario de demostración `demo-cambio-aplicativos` con contraseña `demo-cambio-aplicativos`. Este usuario autoriza ambos aplicativos y permite comprobar visualmente el cambio entre Gestión de Aulas y Gestión de Monitores. Los demás accesos demo no vacíos conservan acceso únicamente al aplicativo seleccionado.
* Se ajustaron las rutas protegidas para bloquear la entrada manual por URL a un aplicativo no autorizado y devolver al usuario al dashboard del aplicativo que tiene activo.
* Se configuró el manejo de errores de autorización en el cliente HTTP: un error `401` limpia la sesión y redirige al login; un error `403` conserva la sesión, informa acceso denegado y redirige al dashboard del aplicativo activo.
* Se simplificó el menú lateral de ambos aplicativos: se retiró el botón redundante “Volver al inicio” y se conservó “Salir” como única acción de cierre. Esta acción limpia exclusivamente el estado local de sesión y redirige a la pantalla pública, sin ejecutar un logout adicional contra las APIs.
* Se refactorizó el dashboard de monitores en bloques visuales independientes: consulta por código, horas por monitor, tarjetas de seguimiento e historial reciente. El componente principal quedó como orquestador de la vista.
* Se estabilizó la grilla central del dashboard para que las tarjetas de horas extra, notificaciones y anotaciones compartan una altura uniforme. Las listas extensas usan desplazamiento interno y los estados vacíos mantienen el volumen visual de cada tarjeta.
* Se corrigió la alineación de encabezados, columnas y botones en las tablas del dashboard. En particular, los títulos de la tabla “Horas por monitor” ahora disponen de anchos definidos, salto de línea controlado y desplazamiento horizontal cuando el espacio disponible no es suficiente, evitando el solapamiento de palabras.
* Se reorganizó la sección Administración / Monitores en componentes de cabecera, métricas, formulario manual, carga masiva y listado. Esto separa responsabilidades y facilita el mantenimiento de cada bloque.
* Se corrigió el solapamiento entre el formulario de registro manual y la carga masiva. Ambos formularios conservan su contenido dentro de su contenedor, sin posicionamiento fijo que invada el bloque siguiente.
* Se ajustó la carga masiva de monitores para respetar la referencia visual: requisitos y opcionales legibles, selector de archivo contenido, confirmación de repetición de monitorías y botón de procesamiento centrado y de ancho consistente.
* Se centraron y unificaron las acciones principales de los formularios de registro manual y carga masiva, evitando variaciones de alineación entre ambos apartados.
* Se refactorizó la vista de “Ver registros” en componentes de ficha del monitor y registros por día. La pantalla presenta información académica, resumen de seis métricas, paginación, detalle expandible por fecha y un estado vacío estructural cuando no existen registros.
* Se revisó la estructura de la versión final del aplicativo antiguo de monitores y se tomaron como referencia sus plantillas de Horarios, Horas Extra y Memorandos para orientar la migración del frontend actual.
* Se adaptó la vista de Horas Extra para acercarla al flujo de revisión del aplicativo anterior: filtros, listado paginado, acceso al registro asociado y acciones de decisión, anotación o penalización desde la interfaz.
* Se creó la vista de Gestión de Memorandos dentro del aplicativo nuevo, con indicadores, filtros por búsqueda, estado y dependencia, listado de monitores, estado de envío y acciones visuales de consulta, PDF y reenvío.

## TRABAJO REALIZADO SOBRE APIS

* El cliente HTTP de Monitores incorpora automáticamente el token de sesión en la cabecera `Authorization: Bearer ...` para las solicitudes autenticadas hacia las APIs de Monitores y Aulas.
* El cambio de aplicativo modifica el contexto activo del cliente sin solicitar nuevas credenciales, por lo que el tránsito entre aplicativos usa la sesión central ya existente.
* Los interceptores del cliente distinguen errores de autenticación y autorización. El frontend comunica el resultado mediante la interfaz, pero no sustituye ninguna regla de seguridad del backend.
* Se conservó la autenticación demo local para facilitar la validación visual del frontend. La prueba demo no concede acceso real a recursos protegidos si el backend rechaza el token o los permisos.
* La migración de las plantillas antiguas se concentró en componentes, estructura visual y flujos de interacción. No se copiaron mecanismos de autorización desde el aplicativo anterior, pues la seguridad está centralizada en los backends actuales.

## FUNCIONA EN MODO DEMO

Para probar el cambio de aplicativos, ingresar con:

```text
Usuario: demo-cambio-aplicativos
Contraseña: demo-cambio-aplicativos
```

Con estas credenciales se autorizan Gestión de Aulas y Gestión de Monitores, por lo que el menú muestra el botón de cambio hacia el otro aplicativo. La navegación conserva la sesión y no presenta un segundo formulario de inicio de sesión.

También se encuentran disponibles en modo demo los flujos visuales de:

* Dashboard de Gestión de Monitores, consulta por código, horas por monitor, tarjetas y historial reciente.
* Administración de monitores, registro manual, carga masiva, filtros, acciones de cuenta y listado paginado.
* Consulta detallada de registros por monitor, resumen de horas y registros agrupados por día.
* Gestión de horarios, revisión de horas extra y gestión de memorandos.

## PARTES FALTANTES DEL FRONTEND

* Completar la migración de todas las secciones y variantes visuales disponibles en la versión final del aplicativo antiguo de monitores.
* Conectar y validar contra los endpoints definitivos las acciones que aún se muestran como flujo demo o interfaz de transición, especialmente envío de memorandos, descarga de PDF, decisiones de horas extra y operaciones masivas.
* Confirmar con pruebas integradas los permisos entregados por el backend para cada perfil, incluyendo respuestas `401` y `403` reales en ambos aplicativos.
* Incorporar pruebas automatizadas para la sesión compartida, los guards de ruta, la visibilidad del selector de aplicativos y los estados vacíos de las tablas y tarjetas.
* Revisar en navegador los tamaños intermedios y móviles de las nuevas grillas y tablas, especialmente cuando existan dependencias con nombres largos o listados extensos.

## ANOTACIÓN DE CONTINUIDAD ENTRE APLICATIVOS

La ocultación de botones y los guards del frontend son mecanismos de navegación y experiencia de usuario. La autorización efectiva de rutas, recursos y acciones debe seguir verificándose en los backends de NestJS y Python.

Se recomienda continuar con la migración completa desde el [aplicativo antiguo de monitores](http://10.20.160.66:8000), solicitando el acceso desde el usuario admin al técnico o asistencial disponible. Para revisar todos los módulos, estados y acciones protegidas se deben solicitar credenciales de administrador; sin ellas no es posible validar visualmente el alcance completo del aplicativo en funcionamiento.

Como apoyo para acelerar la migración, se debe consultar el código final disponible en:

```text
C:\Users\MONITORES\Documents\SoftwareMonitoresV2.0\SoftwareHorasMonitores-version-2.0
```

En esa carpeta se identificaron las plantillas de Horarios, Horas Extra y Memorandos. La recomendación es continuar sección por sección, comparando cada template antiguo con el componente del aplicativo nuevo, conservando los contratos de las APIs actuales y trasladando únicamente la estructura, los flujos y los estados visuales necesarios.

## POSIBLES MEJORAS

* Centralizar los mensajes visuales de error y acceso denegado en un sistema de notificaciones reutilizable.
* Consolidar componentes compartidos de tablas, paginación, filtros, tarjetas de métricas y estados vacíos para evitar duplicación entre dashboard, monitores, horarios, horas extra y memorandos.
* Definir un catálogo tipado de aplicativos, rutas y permisos para simplificar la evolución del selector de aplicativos.
* Añadir pruebas de regresión visual para prevenir nuevos solapamientos en tablas, formularios y tarjetas.
* Elaborar una matriz de migración que relacione cada template del aplicativo antiguo con su ruta, componente y estado de integración en el aplicativo nuevo.

## REVISIÓN LOCAL

* Se ejecutaron las validaciones de lint y compilación del frontend después de los cambios realizados.
* Se revisó la consistencia de los cambios de código y no se identificaron errores de espacios o marcadores de conflicto.
* Las rutas principales revisadas son: `/gestion-monitores`, `/gestion-monitores/monitores`, `/gestion-monitores/horarios`, `/gestion-monitores/horas-extra`, `/gestion-monitores/memorandos` y el detalle `/gestion-monitores/registros/:id`.
