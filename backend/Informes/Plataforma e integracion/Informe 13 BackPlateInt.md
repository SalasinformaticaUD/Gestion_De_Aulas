# Informe 13 - Plataforma e Integración

FECHA: 03/09/2026  
TURNO: 8:00 p. m. - 10:00 p. m.
AUTORES: Kaleth Molina Diaz y Carol Stefanya Velasco Rodriguez  


## OBJETIVO DE LA JORNADA

Corregir las reglas de frecuencia y los mensajes operativos del módulo de
Limpieza, asegurando que la matriz, las recomendaciones y la API respondan de
forma coherente al intervalo mínimo entre aseos. Adicionalmente, mejorar la
navegación global del aplicativo mediante un panel de módulos retráctil, sin
modificar la funcionalidad interna de Software Instalado ni configuraciones de
conexión.

## AVANCES REALIZADOS

### Módulo de Limpieza

* Se amplió la restricción de frecuencia: no se permite registrar una nueva
  limpieza para un aula si esta fue atendida hoy, hace un día o hace dos días.
* La regla se validó tanto en la interfaz como en el backend. Por lo tanto, no
  se puede omitir mediante solicitudes directas a la API.
* Cuando se intenta seleccionar una celda bloqueada por esa condición, el
  sistema ya no indica incorrectamente que no existe limpieza registrada. En
  su lugar, muestra una ventana con el aviso: la sala fue atendida uno o dos
  días antes y todavía no puede registrarse de nuevo.
* Se diferenciaron los mensajes de fecha: al intentar registrar una limpieza en
  una fecha futura, la matriz muestra un aviso claro y el backend rechaza la
  operación con el mensaje correspondiente.
* Se ajustó el panel de **Aulas recomendadas**. Las recomendaciones ya no se
  descartan por clases, préstamos u otras condiciones de disponibilidad del
  momento, pues su propósito es priorizar el seguimiento de aseo.
* Ahora solo se recomiendan aulas operativas con dos o más días sin limpieza o
  sin historial. Se ordenan de mayor a menor número de días sin atención, de
  forma que las más atrasadas aparecen primero.
* Se añadió la opción **Quitar estado** para corregir registros accidentales de
  limpieza, tanto Realizado como Con novedad. El flujo solicita confirmación,
  devuelve la celda al estado Sin registro y conserva la auditoría de la
  eliminación.
* El retiro se limita a fechas editables: día actual o día anterior, preservando
  la trazabilidad de los registros históricos.
* Se incorporó el botón **Cancelar** debajo de **Aceptar registros** en el modo
  de registro de aseo. Este descarta las selecciones pendientes y desactiva el
  modo sin guardar cambios en la matriz.

### Navegación global del aplicativo

* Se restauró la vista interna de Software Instalado exactamente como estaba:
  las pestañas Catálogo e Instalación por aulas no fueron modificadas.
* Se implementó el botón hamburguesa en la barra superior global para retraer o
  mostrar el panel lateral de módulos del aplicativo completo.
* En escritorio el panel lateral puede ocultarse completamente para ampliar el
  espacio de trabajo y volver a mostrarse con el mismo botón.
* En dispositivos móviles se conserva el comportamiento de menú superpuesto,
  incluyendo su apertura, cierre y capa de fondo.

## RESTRICCIONES Y REGLAS CONSERVADAS

* La matriz conserva los únicos estados operativos definidos: Realizado, Sin
  registro y Con novedad.
* Se mantiene la edición de registros solo para la fecha actual y el día
  anterior; no se habilitan modificaciones históricas ni futuras.
* El intervalo de dos días no impide consultar los registros previos, solo evita
  crear una nueva limpieza dentro de ese periodo.
* La opción de retirar un estado se audita y no elimina información de otros
  módulos ni de las aulas.
* El cambio de navegación no afecta rutas, permisos, formularios ni la lógica
  de Catálogo e Instalación por aulas.
* No se modificaron localhost, puertos, URLs locales ni la configuración de
  conexión del aplicativo.

## VALIDACIONES EJECUTADAS

* Se compiló el backend correctamente con `npm run build`.
* Se ejecutaron las pruebas del servicio de Limpieza con resultado de **10 de 10
  pruebas aprobadas**.
* Se compiló el frontend con `npm run build` y pasó la comprobación de tipos.
* Se mantienen advertencias preexistentes de dependencias de `useEffect` y una
  advertencia CSS en Prácticas Libres, sin errores de construcción asociados a
  los cambios de esta jornada.

## PENDIENTES Y SIGUIENTES CAMBIOS PARA PRÓXIMOS MONITORES

1. **Pruebas operativas de Limpieza:** validar con usuarios reales la frecuencia
   de dos días, el retiro de registros y las recomendaciones durante un ciclo
   mensual completo.
2. **Préstamos Docentes:** realizar pruebas de extremo a extremo para docente
   por documento, otro profesor, software requerido, disponibilidad estricta,
   encargado autenticado y control de bloques no disponibles.
3. **Módulo de Usuarios:** verificar el acceso exclusivo de administrador y
   completar la gestión de cargos disponibles, desactivación/eliminación y
   asignación automática de Monitor.
4. **Tareas Operativas:** implementar la lógica de aceptación, conservación de
   responsable e informe de tareas realizadas y pendientes.
5. **Prácticas Libres:** configurar y probar el envío real del correo de
   confirmación mediante `EMAIL_WEBHOOK_URL`.
6. **Multas:** realizar pruebas manuales de la búsqueda masiva con Excel y de
   las validaciones vinculadas a prácticas libres activas.

## ESTADO ACTUAL

El módulo de Limpieza ahora aplica de manera consistente el intervalo de dos
días para evitar registros repetidos, informa con claridad las restricciones y
permite corregir registros accidentales dentro de la ventana autorizada. El
aplicativo cuenta además con un panel lateral global retráctil, mientras que el
módulo de Software Instalado conserva intacta su navegación interna.
