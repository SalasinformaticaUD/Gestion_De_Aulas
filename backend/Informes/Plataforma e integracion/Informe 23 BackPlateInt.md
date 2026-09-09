# Informe 23 - Pruebas Docker de la plataforma e integración

FECHA: 08/09/2026  
AUTOR: Edwin Alejandro Orjuela Olarte y Juan Esteban Cañon Solorza 

## OBJETIVO

Validar el funcionamiento de los servicios Docker de Software Monitorías, con énfasis en disponibilidad, comunicación entre contenedores, autenticación y manejo de errores de los endpoints.

## AVANCES REALIZADOS

* Se levantó y recreó el stack Docker de la plataforma con sus servicios `backend`, `frontend`, `db` y `pdf-renderer`.
* Se verificó que todos los contenedores quedaran activos y saludables.
* Se probaron los endpoints de salud, autenticación, autorización, rutas inexistentes y renderización PDF.
* Se validó la comunicación entre backend y renderizador PDF, además de frontend y backend.
* Se comprobó la disponibilidad de PostgreSQL y la aplicación de migraciones.
* Se integró parcialmente el aplicativo antiguo de Gestión de Monitores en el selector de aplicativos de la plataforma principal.
* Se marcó Gestión de Monitores como **en mantenimiento** mientras finaliza el ajuste del aplicativo interno.
* Se configuró la redirección temporal al aplicativo legado mediante `http://10.20.160.66:8000/login/`, evitando que los usuarios ingresen a un módulo incompleto.
* Se dejó preparada la comunicación Docker entre los servicios mediante la red interna compartida y los nombres de servicio configurados en Compose.
* Se ejecutaron las pruebas automatizadas del backend: **27 suites y 151 pruebas aprobadas**.
* Se ejecutaron las pruebas E2E: **50 pruebas aprobadas**; una prueba quedó desactualizada porque intenta finalizar una práctica futura, comportamiento que actualmente debe rechazarse.

## FUNCIONA

* Backend, frontend, PostgreSQL y renderizador PDF quedan saludables en Docker.
* `/health` responde `200`.
* Las solicitudes sin autenticación responden `401` en rutas protegidas.
* Los datos de login inválidos responden `400` o `401` según el caso.
* Las rutas inexistentes responden `404` sin producir errores internos.
* El renderizador responde `422` ante una plantilla ausente y genera correctamente un PDF válido ante una solicitud completa.
* La comunicación entre contenedores funciona correctamente.
* PostgreSQL acepta conexiones y no existen migraciones pendientes.
* El selector de aplicativos informa correctamente el estado de mantenimiento y conserva el acceso temporal al sistema antiguo.

## NO FUNCIONA / HALLAZGOS

* Una prueba E2E debe actualizarse para reflejar la restricción de no finalizar prácticas futuras; no representa un fallo del contenedor.
* Las imágenes de runtime no incluyen las pruebas automatizadas, ya que `tests/` está excluido por `.dockerignore`; las pruebas deben ejecutarse en CI o en una imagen de validación.
* El backend registra advertencias de OpenAPI sobre serializers y autenticadores no inferidos. No afectan el funcionamiento de los endpoints, pero deben corregirse para dejar el esquema completamente limpio.
* No se reprodujo ningún error `500`, fallo de conexión ni rechazo incorrecto durante las pruebas.
* La integración del aplicativo antiguo es temporal y parcial; no sustituye la implementación definitiva del módulo interno de Gestión de Monitores.

## NO MODIFICAR

* No exponer secretos de las variables de entorno.
* No eliminar los controles de autenticación ni validaciones de entrada.
* No incluir pruebas, secretos o archivos temporales en las imágenes de producción.
* No cambiar contratos de endpoints sin actualizar documentación y pruebas.

## SIGUIENTE PASO

* Ejecutar el smoke test extremo a extremo entre Plataforma/Aulas y Monitores con variables reales de staging.
* Actualizar la prueba E2E de finalización de prácticas futuras.
* Corregir las advertencias de serializers y autenticadores del esquema OpenAPI.
* Crear una etapa CI que ejecute las pruebas antes de construir y publicar las imágenes.
* Probar endpoints autenticados con perfiles y permisos mínimos, incluyendo tokens expirados y usuarios no vinculados.
* Completar la migración funcional de Gestión de Monitores y retirar la redirección temporal cuando el módulo interno esté terminado y validado.

## ESTADO ACTUAL

La plataforma principal funciona correctamente en Docker y sus servicios mantienen comunicación y controles de seguridad operativos. La integración con Gestión de Monitores está disponible de forma parcial mediante aviso de mantenimiento y redirección al aplicativo legado. Los pendientes son de endurecimiento de la automatización, limpieza de OpenAPI, validación integrada con staging y finalización del módulo interno; no se identificó un fallo funcional que requiriera modificación inmediata.
