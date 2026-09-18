# Informe Plan de Integración 32 - Separación y estabilización de Gestión de Monitores

FECHA: 17/09/2026  
AUTOR: Kevin Rincón

## OBJETIVO DE LA JORNADA

Restablecer la arquitectura correcta de Gestión de Monitores: una API Django y una base de datos propias, consumidas por el frontend de `Software Monitorias`, sin duplicar ni trasladar el proyecto de Horas de Monitores dentro de Gestión de Aulas.

## ALCANCE Y REGLA OBLIGATORIA DE TRABAJO

* El proyecto fuente y único de la API es `SoftwareHorasMonitores`, en su rama `Api-gestion-monitores`.
* `Software Monitorias` conserva únicamente el frontend compartido y el backend propio de Gestión de Aulas; no debe contener una copia de `api-monitores`, Django, migraciones ni archivos operativos de Monitores.
* No se deben crear duplicados, mover código de Monitores a `Software Monitorias` ni trabajar su lógica desde ese repositorio. Toda corrección de API, base de datos, migración o prueba de Monitores debe realizarse exclusivamente en `SoftwareHorasMonitores`.
* El frontend puede consumir ambas aplicaciones mediante sus proxies locales, manteniendo los proyectos y bases de datos separados.

## TRABAJO REALIZADO EN SOFTWAREHORASMONITORES

* Se separaron las bases de datos: Gestión de Aulas opera sobre `Aulas` y Monitores sobre `monitores`.
* Se eliminó del proyecto de Aulas la copia indebida de `api-monitores` y sus componentes Django, preservando el frontend de Monitores que la consume.
* Se configuró autenticación local por sesión para Monitores. Los monitores y líderes usan exclusivamente la base `monitores`; el usuario `admin` quedó disponible en ambas bases para el acceso administrativo temporal.
* Se corrigieron los orígenes CSRF locales para el frontend en `http://localhost:3002`.
* Se agregó la confirmación local de contraseña para acciones sensibles, como eliminar monitores.
* Se aplicaron las migraciones pendientes de Monitores, incluyendo las tablas necesarias para excepciones de horarios y actas firmadas.
* Se corrigió la eliminación de monitores con historial: ahora devuelve una respuesta JSON explicativa y conserva la trazabilidad mediante desactivación cuando existen registros asociados.
* Se habilitaron y validaron las cargas masivas de Excel de Monitores y Horarios mediante sus rutas REST propias.
* Se revisó el módulo de Actas: generación de PDF por dependencia, cargue de acta firmada, descarga, aceptación, rechazo y control de permisos están implementados en la API de Monitores.

## VALIDACIONES REALIZADAS

* Inicio de sesión local, sesión, CSRF y validación de contraseña mediante el proxy del frontend.
* Creación y eliminación controlada de un registro temporal por API (`204` al eliminar).
* Importación de monitores y horarios desde Excel.
* Pruebas automatizadas de autenticación, monitores, horarios y actas ejecutadas correctamente.
* Compilación de producción del frontend completada correctamente con `npm run build`.

## PRÓXIMOS PASOS

1. Revisar cada módulo de Monitores uno por uno con datos reales y roles de administrador, líder y monitor.
2. Usar como referencia funcional el sistema actualmente operativo **Control de horas de monitores**, no copias antiguas ni proyectos duplicados.
3. Identificar lo faltante por módulo, validar el flujo completo y corregirlo únicamente dentro de `SoftwareHorasMonitores`.
4. Validar especialmente Actas con firmas reales, actualización de estados y permisos por rol antes de realizar un commit o despliegue.

## ESTADO FINAL

La integración quedó orientada a una arquitectura separada: Gestión de Aulas y Monitores comparten únicamente el frontend cuando corresponde, pero cada una conserva su proyecto, API y base de datos. La continuidad del trabajo debe concentrarse exclusivamente en `SoftwareHorasMonitores` para todo lo relacionado con Gestión de Monitores.
