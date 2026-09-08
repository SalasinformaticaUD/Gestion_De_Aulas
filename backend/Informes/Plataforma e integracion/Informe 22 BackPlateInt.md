# Informe 21 - Plataforma e Integración

**FECHA:** 08/09/2026  
AUTORES: Ivan Felipe Prado Blanco y Carol Stefanya Velasco Rodriguez  

## TURNOS DE TRABAJO

* **Ivan Felipe Prado Blanco:** 6:00 a. m. - 10:00 a. m.
* **Carol Stefanya Velasco Rodriguez:** 6:00 a. m. - 12:00 p. m.

## OBJETIVO DE LA JORNADA

Continuar la preparación técnica y visual de la plataforma posterior a la definición del proceso de *staging*, corrigiendo hallazgos de interfaz, consistencia de estados, generación de PDF y navegación. Mantener como criterio de cierre la compilación satisfactoria de frontend y backend, junto con pruebas funcionales de los puntos intervenidos.

## AVANCES

### 1. Preparación para staging e integración

* Se revisó el estado de la arquitectura Docker y la guía de despliegue heredada del informe 20: backend, frontend standalone, migraciones, PostgreSQL y el renderizador PDF continúan separados por servicio.
* Se mantuvo la validación de configuración segura para staging: el despliegue completo requiere secretos reales, no valores de ejemplo ni credenciales por defecto.
* Se verificaron nuevamente las compilaciones de producción del backend NestJS y del frontend Next.js después de los cambios de la jornada.
* Se mantuvo el aumento del tiempo de proxy del frontend para permitir la generación mensual de archivos ZIP/PDF sin que Next.js cancele solicitudes extensas antes de que responda el backend.

### 2. Reportes PDF y renderizador XLSX

* Se investigó y corrigió el error `503` del renderizador de fichas audiovisuales causado por una plantilla XLSX reserializada con rutas internas inválidas (`xl/xl/worksheets/sheet2.xml`).
* Se restauró la estructura válida de la plantilla institucional y se confirmó que el endpoint local del renderizador vuelve a responder `HTTP 200` generando una ficha audiovisual de prueba.
* Se ajustó la ficha SIGUD de préstamos audiovisuales para que el campo **Nombre** muestre el nombre del docente al que se realizó el préstamo, en lugar del nombre de un equipo o del usuario que entrega.
* Se ajustó el renderizador para que día, mes y año de la ficha audiovisual se impriman en negro conservando la alineación de la plantilla.
* Se conservó el flujo mensual de generación en ZIP para Horarios, Prácticas Libres y Audiovisuales, incluyendo la generación histórica que corresponde a los registros del mes.
* El mensaje de confirmación de fichas de asistencia generadas en ZIP ahora desaparece automáticamente después de 10 segundos. Se mantiene el mismo patrón de cierre temporal en los avisos de generación mensual ya ajustados.

### 3. Tareas operativas y seguimiento

* Se revisó la diferencia entre el total mostrado de tareas y las tarjetas visibles. La causa era la visualización heredada de grupos de aulas, que condensaba varias tareas existentes en una sola tarjeta.
* Se modificó el tablero para mostrar una tarjeta por cada tarea, incluso para registros históricos que aún tengan un identificador de grupo. De esta forma, los indicadores, los contadores de columna y el contenido visible representan el mismo número de tareas.
* Se ajustó el contraste de los campos de fecha **Desde** y **Hasta** del historial de tareas en modo claro y oscuro.
* Los avisos exitosos del módulo de tareas operativas se cierran automáticamente tras 10 segundos, sin cerrar mensajes de error antes de que el usuario pueda leerlos.
* Se conservaron los flujos de aceptación, responsables múltiples, informe de seguimiento, finalización y cancelación individuales por aula.

### 4. Interfaz, navegación y temas

* Se hicieron correcciones de contraste en modo oscuro para disponibilidad, prácticas libres, modales de tareas y elementos de formularios que no tenían legibilidad suficiente.
* Se ajustaron los paneles principales del dashboard para utilizar fondos, bordes y acentos de color asociados a su estado: disponibilidad, clases en curso, prácticas libres y audiovisuales prestados. El comportamiento se conserva en modo claro y oscuro.
* El logo de la barra lateral fue ampliado para mejorar su visibilidad y ahora lleva directamente a `/gestion-aulas`, correspondiente al dashboard operativo principal.
* El logo COSMOS de la pantalla de inicio de sesión fue ampliado y se configuró el cambio de variante para modo oscuro.
* En el selector de gestión, el logo COSMOS cambia a la variante clara cuando se activa el tema oscuro.
* Se corrigió el tamaño del logo de Universidad Distrital en el formulario de ingreso para que permanezca contenido dentro de su recuadro, tanto en modo claro como oscuro.

### 5. Seguimiento de aseo

* Se verificó la semántica de los indicadores: **Registros de hoy** cuenta registros de limpieza creados durante el día, mientras **Aulas atendidas** cuenta aulas únicas; pueden diferir si una misma aula tiene más de un registro.
* Se aclararon los textos visibles de ambos indicadores para evitar que se interpreten como la misma métrica.
* Se verificó que **Con observación** solo cuenta registros cuya observación contiene texto. Cuando no se suministra una observación, el backend la mantiene vacía o nula; no se almacena automáticamente el texto “Sin observación”.

## FUNCIONA

* El renderizador de fichas audiovisuales genera nuevamente documentos PDF válidos mediante el endpoint local probado con respuesta `HTTP 200`.
* La ficha audiovisual muestra el docente solicitado en el campo Nombre y la fecha tiene contraste negro.
* Los reportes mensuales continúan descargándose como ZIP y los avisos de asistencia generada se ocultan a los 10 segundos.
* Las tareas antiguas que estaban visualmente condensadas se muestran de manera individual en el tablero, manteniendo sus estados y responsables.
* El dashboard, sidebar, selector de gestión e inicio de sesión responden a los temas claro y oscuro con logos y colores de contraste adecuados.
* `npm run build` del backend finaliza correctamente.
* `npm run build` del frontend finaliza correctamente, incluyendo TypeScript y generación de rutas estáticas.

## NO FUNCIONA / PENDIENTE DE VALIDAR

* No se ha levantado todavía la pila completa de staging con secretos reales; continúa pendiente reemplazar los valores de ejemplo por credenciales seguras y propias del entorno.
* Falta realizar una validación manual integral desde navegador de los últimos cambios de PDF, tablero de tareas, logos y tarjetas del dashboard en modo claro, oscuro y tamaños móvil/tablet.
* La actualización del código del renderizador PDF requiere que el proceso o contenedor correspondiente se reinicie o se redespliegue en cada entorno para tomar la versión nueva.

## NO MODIFICAR

* No reserializar las plantillas XLSX institucionales con herramientas que alteren sus relaciones internas, imágenes o rutas de hojas. El renderizador debe modificar únicamente las celdas y estilos requeridos dentro de una copia temporal.
* No volver a mostrar agrupaciones visuales de tareas si esto hace que los contadores de estado difieran del número real de tareas individuales.
* No eliminar los controles de permisos, autenticación, healthchecks, variables de entorno y validación de secretos definidos para staging.
* No sustituir las variantes institucionales de logos por imágenes únicas que pierdan visibilidad en alguno de los temas.
* No registrar observaciones de aseo predeterminadas cuando el usuario no haya proporcionado texto.

## SIGUIENTES PASOS

* Seguir revisando módulo por módulo los estilos visuales, contraste, textos, botones, modales y comportamiento responsive en modo claro y oscuro.
* Continuar realizando pruebas manuales y automatizadas de los flujos intervenidos, especialmente generación de PDF, navegación, tareas operativas, dashboard y formularios.
* Preparar las credenciales reales de staging y, una vez disponibles, levantar la pila completa para comprobar healthchecks, migraciones, autenticación, renderer PDF y acceso web de extremo a extremo.

**Estado:** se consolidaron correcciones de integración, PDF, navegación, métricas y estilo visual posteriores al inicio de staging. Backend y frontend compilan correctamente; el despliegue completo de staging queda condicionado a la configuración segura de secretos y a la validación integral en navegador.
