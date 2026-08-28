# Informe 8 - Frontend: Gestión de Monitores

FECHA: 27/08/2026  
TURNO: 8:00 a.m. a 10:00 a.m.  - 12:00pm - 2:00pm
MONITOR: Ivan Felipe Prado Blanco

## OBJETIVO DEL AVANCE

Continuar la implementación posterior al Informe 7 con mejoras de identidad visual, experiencia de ingreso, contraste en la navegación de los dos aplicativos y conexión funcional del flujo de revisión de Horas Extra.

Además, se incorporó una base reutilizable de notificaciones visuales para informar errores de autorización sin bloquear al usuario ni cerrar la sesión cuando el backend responda con acceso denegado.

## AVANCES

* Se reemplazó el logo anterior de COSMOS por la nueva identidad visual suministrada para el proyecto.
* Se incorporó una versión PNG con transparencia real para fondos claros y una variante para fondos oscuros, manteniendo las dimensiones y posiciones definidas previamente por las clases del frontend.
* Se corrigió la variante utilizada dentro de Gestión de Aulas y Gestión de Monitores. La barra lateral oscura usa ahora una imagen con canal alfa verificado y texto institucional de contraste claro, sin el rectángulo blanco que se mostraba sobre el fondo negro.
* Se confirmó técnicamente que el recurso de navegación tiene transparencia en el fondo mediante la validación del canal alfa del archivo. Esto evita depender únicamente de la apariencia previa del visor o del navegador.
* Se agregaron rutas de recurso diferenciadas para evitar que el navegador o el optimizador de imágenes de Next.js reutilicen una variante anterior almacenada en caché.
* Se ajustó la pantalla de login de ambos aplicativos: el logo de COSMOS se muestra centrado en la cabecera, sin el logo institucional ubicado anteriormente a su lado.
* Se agregó un logo institucional de la Universidad Distrital reducido en la parte inferior del formulario de credenciales. Este recurso conserva su transparencia y funciona como firma visual del acceso sin competir con el logo principal de COSMOS.
* Se revisó el inventario de rutas de Gestión de Monitores y el mapeo de endpoints disponibles para priorizar implementaciones que puedan conectarse sin inventar contratos de backend.
* Se conectó la ruta activa de Horas Extra con el servicio de Monitores. La vista deja de depender exclusivamente de un arreglo local para cargar las sesiones pendientes cuando el modo demo está desactivado.
* La acción de aprobar o rechazar horas extra utiliza el endpoint documentado `POST /api/v1/sessions/:id/review-overtime/` en integración real.
* Se mantuvo un comportamiento equivalente en modo demo: la decisión actualiza localmente el estado de la sesión para facilitar la demostración sin depender de una API activa.
* Se preservó el enlace “Ver registro” desde cada fila de horas extra hacia el detalle del monitor y la fecha correspondiente.
* La revisión de horas extra valida la anotación obligatoria al rechazar, permite seleccionar la penalización y deshabilita la acción mientras se procesa la solicitud.
* Se creó un sistema global de notificaciones breves reutilizables para estados de información, éxito y error.
* Se reemplazó el aviso persistente de acceso denegado por una notificación visual no bloqueante. Al recibir un `403`, el usuario conserva la sesión, vuelve a su dashboard autorizado y recibe el mensaje de acceso denegado.
* Las notificaciones se muestran en una región accesible, permiten cierre manual y se eliminan automáticamente después de cinco segundos.

## TRABAJO REALIZADO SOBRE APIS

* Se validó que el flujo de Horas Extra cuenta con un contrato documentado para consultar sesiones y revisar horas extra.
* La carga de sesiones utiliza `GET /api/v1/sessions/` a través del servicio centralizado de Monitores cuando se desactiva el modo demo.
* La decisión de horas extra utiliza `POST /api/v1/sessions/:id/review-overtime/` con la decisión, la anotación opcional o requerida y la opción de penalización.
* En modo demo, el servicio simula la respuesta de revisión y actualiza el estado de la sesión de pendiente a aprobada o rechazada. Esto permite probar el flujo completo de interfaz sin enviar solicitudes reales.
* Se conservó el manejo centralizado de `401` y `403`: el `401` expira la sesión y lleva al login; el `403` conserva la sesión y redirige al área autorizada.
* No se inventaron endpoints para Memorandos, descarga de PDF, reenvío de correo, importación masiva de horarios o gestión avanzada de cuentas. Esas acciones requieren contratos de backend antes de una conexión real.

## FUNCIONA EN MODO DEMO

Para probar el cambio entre aplicativos y las vistas protegidas se puede usar:

```text
Usuario: demo-cambio-aplicativos
Contraseña: demo-cambio-aplicativos
```

En el modo demo se pueden verificar los siguientes cambios:

* La navegación lateral de Gestión de Aulas y Gestión de Monitores con el logo de COSMOS sobre fondo oscuro, sin fondo blanco superpuesto.
* El logo de COSMOS centrado en la pantalla de login y el logo institucional reducido al final del formulario.
* La revisión de Horas Extra en `/gestion-monitores/horas-extra`.
* El enlace “Ver registro” de cada sesión pendiente.
* La aprobación de una hora extra y su eliminación del listado de pendientes.
* El rechazo de una hora extra con anotación obligatoria y opción de penalización.

Al recargar la vista en modo demo se restauran los datos de prueba iniciales.

## PARTES FALTANTES DEL FRONTEND

* Conectar las acciones reales de Memorandos: consulta, generación o descarga de PDF y reenvío de correo. El frontend ya cuenta con la vista, pero no debe crear rutas ficticias sin especificación de backend.
* Completar la conexión real de operaciones masivas de monitores y horarios cuando los endpoints se encuentren disponibles fuera de Django Admin.
* Continuar la migración de las variantes restantes de las plantillas del aplicativo antiguo de monitores, revisando cada estado, filtro y acción disponible con credenciales de administrador.
* Aplicar el sistema nuevo de notificaciones a los formularios que aún usan avisos locales, priorizando anotaciones, excepciones, conciliación, carga de asistencia y administración de monitores.
* Incorporar pruebas automatizadas para la sesión compartida, la redirección ante `401` y `403`, el cambio de aplicativo y la revisión de horas extra.
* Realizar revisión visual en navegador en anchos de escritorio intermedio, tableta y móvil para confirmar que las tablas, logos y notificaciones conservan legibilidad.

## ANOTACIÓN DE CONTINUIDAD ENTRE APLICATIVOS

Los cambios visuales de logos, selector de aplicativo, rutas protegidas y notificaciones son responsabilidad de la interfaz. La autenticación y autorización efectiva continúan siendo responsabilidad de los backends de NestJS y Python.

El sistema de notificaciones no sustituye la respuesta de seguridad: únicamente comunica el resultado al usuario. Un `403` no otorga acceso, conserva una sesión válida y devuelve al usuario al aplicativo autorizado; un `401` sigue invalidando la sesión local.

Para completar la migración funcional se recomienda seguir consultando el aplicativo antiguo de monitores en [http://10.20.160.66:8000](http://10.20.160.66:8000) con credenciales de administrador. También se debe conservar como referencia el código de la versión final en:

```text
C:\Users\MONITORES\Documents\SoftwareMonitoresV2.0\SoftwareHorasMonitores-version-2.0
```

## POSIBLES MEJORAS

* Reutilizar el sistema de notificaciones globales para reemplazar los mensajes locales repetidos en los formularios de Gestión de Monitores.
* Agregar niveles de prioridad, iconos y acciones opcionales a las notificaciones, evitando que sean invasivas para operaciones frecuentes.
* Añadir pruebas de interfaz que verifiquen que los recursos de marca tienen transparencia real y que la variante oscura se carga en las barras laterales.
* Consolidar la documentación de endpoints y marcar, en una matriz de migración, qué acciones ya están conectadas, cuáles funcionan solo en demo y cuáles esperan definición de backend.
* Limpiar, luego de la validación visual definitiva, los recursos de logo reemplazados que ya no sean usados por el componente central de COSMOS.

## REVISIÓN LOCAL

* Se ejecutó `npm run lint` después de los cambios de marca, login, Horas Extra y notificaciones globales.
* Se ejecutó `npm run build` y el frontend compiló correctamente con verificación de tipos satisfactoria.
* Se verificó el archivo de logo claro destinado a las barras laterales y se confirmó un canal alfa transparente en las esquinas del recurso.
* Se revisaron las rutas `/login`, `/gestion-monitores/horas-extra`, `/gestion-monitores/registros/:id` y los layouts compartidos de Gestión de Aulas y Gestión de Monitores.
