FECHA: 07/09/2026
TURNO: 4:00 p. m. - 10:00 p. m.
MONITOR: Julian Dario Romero Buitrago - Juan Esteban Cañon Solorza



AVANCES:

* Se inspeccionó módulo por módulo el panel de Administrador para identificar inconsistencias visuales, de permisos, formularios, botones, temas claro/oscuro y comportamiento general antes del despliegue.
* Se corrigieron estilos de botones secundarios en Usuarios, especialmente “Limpiar” y “Nuevo”, para que sean visibles y legibles en modo claro y oscuro.
* Se sustituyó el selector nativo de fecha y hora en Observaciones por campos separados: calendario para la fecha y entrada manual para la hora en formato HH:mm.
* Se añadió validación de formato de hora en Observaciones, evitando guardar valores inválidos.
* Se aplicó el mismo ajuste en el registro de préstamos audiovisuales: la hora estimada de devolución ahora se digita manualmente como HH:mm, sin desplegar la lista numérica del navegador.
* Se validó que la hora de devolución audiovisual tenga un formato válido y sea posterior a la hora actual.
* Se mantuvieron las validaciones existentes de docente, aula de destino, responsable de entrega, accesorios y equipos audiovisuales.
* Se verificó la compilación de producción del frontend después de cada ajuste.

FUNCIONA:

* Los botones secundarios de Usuarios conservan contraste y visibilidad en ambos temas.
* Las restricciones de Observaciones permiten seleccionar fecha y escribir horas como 14:30.
* El registro audiovisual permite escribir directamente la hora estimada de devolución.
* Los campos de hora invalidan formatos incorrectos, como valores incompletos o fuera del rango de 24 horas.
* La validación evita registrar préstamos audiovisuales cuya hora estimada de devolución sea anterior o igual a la hora actual.
* npm run build del frontend finaliza correctamente, incluyendo compilación, TypeScript y generación estática de las rutas.

NO FUNCIONA:

* No se identificaron errores de compilación en los cambios realizados.
* Falta una validación manual final en navegador de los formularios ajustados, usando modo claro, oscuro y pantalla móvil.

NO MODIFICAR:

* No eliminar las validaciones de formato HH:mm ni la comprobación de que la devolución audiovisual sea posterior a la hora actual.
* No volver a usar controles datetime-local o time en estos formularios si generan selectores poco prácticos para el usuario.
* No modificar la lógica de estados de préstamos audiovisuales ni la disponibilidad de equipos al registrar o devolver préstamos.
* No alterar las reglas de vigencia de restricciones en Observaciones.
* No eliminar las validaciones de docente, responsable, aula, accesorios o equipos requeridos en préstamos audiovisuales.

SIGUIENTE PASO:

* Realizar prueba manual de creación y edición de Observaciones con restricciones.
* Probar el registro audiovisual con diferentes horas válidas e inválidas.
* Revisar visualmente los formularios en modo claro, oscuro y diseño responsive.
* Continuar corrigiendo inconsistencias visuales o de usabilidad identificadas durante la inspección del panel de Administrador.
* Ejecutar pruebas previas al despliegue después de cada cambio adicional.
Estado: inspección del panel de Administrador y ajustes de usabilidad completados; frontend compilado correctamente y pendiente de validación manual integral.
