# Informe 3 - Frontend

FECHA: 19/08/2026  
TURNO: 6:00 p. m. - 10:00 p. m.  
MONITOR: Carol Stefanya Velasco Rodriguez

## AVANCES

* Se revisó el diseño del módulo de equipos audiovisuales incluido en el prototipo de Figma Make y se adaptó a la estructura actual del frontend en Next.js, React y TypeScript.
* Se revisaron el Informe 3 de Backend y el Informe 4 de Módulos Paralelos para mantener correspondencia con los modelos, estados y operaciones definidos en el backend.
* Se implementó la nueva ruta `/audiovisuales` dentro del aplicativo Gestión de Aulas.
* Se desarrolló la vista principal de Equipos Audiovisuales conservando las fuentes, colores, componentes y estilos utilizados en los Informes 1 y 2 del frontend.
* Se incorporaron indicadores para visualizar el total del inventario y la cantidad de equipos disponibles, prestados y en mantenimiento.
* Se implementó el listado de equipos audiovisuales con código de inventario, nombre, tipo, estado, horas de uso, número de préstamos, responsable y acciones disponibles.
* Se agregaron filtros por tipo y estado, además de búsqueda por código, nombre o tipo de equipo.
* Se implementaron estados visuales compatibles con el backend: `DISPONIBLE`, `PRESTADO`, `MANTENIMIENTO` y `FUERA_DE_SERVICIO`.
* Se desarrolló una vista independiente para consultar los préstamos registrados y sus estados: solicitado, aprobado, activo, devuelto, cancelado y vencido.
* Se implementó el formulario visual para registrar préstamos con uno o varios equipos, docente responsable, aula de destino y fecha estimada de devolución.
* Se implementó el formulario de devolución con selección del estado funcional individual de cada equipo.
* Se agregó la acción de cancelación de préstamos y la actualización visual del estado de los equipos involucrados.
* Se incorporó una recomendación visual para distribuir el uso de los videobeams y evitar el desgaste concentrado en un solo equipo.
* Se conectó la acción Audiovisuales del detalle de un aula con la nueva vista, conservando el aula seleccionada como contexto inicial del préstamo.
* Se mantuvo la sección Software instalado dentro del detalle de las aulas, de acuerdo con las operaciones documentadas en el Informe 4 de Módulos Paralelos.
* Se crearon estructuras de datos y tipos reutilizables para equipos audiovisuales y préstamos, preparadas para la integración posterior con la API.
* Se adaptó la vista para escritorio, tableta y móvil mediante tablas desplazables, filtros reorganizables, indicadores responsivos y formularios ajustables.
* Se verificó el código del frontend mediante compilación de producción y ESLint, sin errores.

## FUNCIONA

* Navegación al módulo de Audiovisuales desde el menú principal.
* Acceso a Audiovisuales desde el detalle de un aula, conservando el aula seleccionada.
* Visualización de los indicadores generales del inventario audiovisual.
* Búsqueda de equipos por código, nombre o tipo.
* Filtros por tipo y estado del equipo.
* Consulta del inventario y del historial visual de préstamos.
* Registro visual de préstamos con múltiples equipos disponibles.
* Cambio del estado de los equipos a prestado después de registrar un préstamo.
* Registro visual de devoluciones con estado individual por equipo.
* Cambio del estado del equipo a disponible o mantenimiento según la condición registrada durante la devolución.
* Cancelación visual de préstamos activos o vencidos.
* Actualización de indicadores, inventario y préstamos durante la sesión actual.
* Diseño responsivo para escritorio, tableta y móvil.
* Compilación de producción y validación de ESLint sin errores.

## NO FUNCIONA

* Los datos de equipos y préstamos todavía son datos de demostración almacenados en el frontend.
* Los cambios realizados en préstamos, devoluciones y cancelaciones no persisten al recargar la página.
* La vista aún no consume los endpoints reales del módulo `prestamos-audiovisuales`.
* La creación, devolución y cancelación de préstamos todavía no ejecutan transacciones en la base de datos.
* La selección de docentes y aulas utiliza información de demostración y no consultas reales del backend.
* No se aplican todavía permisos por rol para registrar, devolver o cancelar préstamos.
* No se muestran aún estados de carga, errores de API o confirmaciones provenientes del backend.
* La integración definitiva depende de completar los servicios y endpoints indicados como pendientes en el Informe 3 de Backend.

## SIGUIENTE PASO

* Generar la interfaz o vista de Aulas en el frontend, manteniendo los estilos, fuentes, colores y diseño responsivo definidos para el sistema.
* Integrar la vista de Audiovisuales con los endpoints reales del backend cuando se complete la lógica del módulo P06.
* Reemplazar los datos de demostración por consultas reales de equipos, préstamos, docentes y aulas.
* Conectar los formularios de préstamo, devolución y cancelación con la API.
* Implementar estados de carga, mensajes de error y confirmaciones para las operaciones del módulo.
* Aplicar permisos de usuario según el rol autenticado.
* Validar mediante pruebas funcionales el flujo completo desde el registro del préstamo hasta la devolución de todos los equipos.

## REVISIÓN LOCAL

Ejecutar desde la carpeta Frontend:

```bash
cd "C:\Users\MONITORES\Documents\Software Monitorias\Frontend"
npm install
npm run dev
```

Luego abrir:

* http://localhost:3000/audiovisuales
* http://127.0.0.1:3000/audiovisuales

> Importante: la información del módulo es temporal y se reinicia al recargar la página hasta que se complete la integración con la API.
