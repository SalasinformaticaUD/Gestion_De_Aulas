# Informe Plan de Integración 37 - Ajustes visuales, responsividad y control de roles

FECHA: 22/09/2026  
AUTORES: Ivan Felipe Prado Blanco y Carol Stefanya Velasco Rodriguez  

## TURNOS DE TRABAJO

* **Ivan Felipe Prado Blanco:** 6:00 a. m. - 10:00 a. m.
* **Carol Stefanya Velasco Rodriguez:** 6:00 a. m. - 12:00 p. m.

## OBJETIVO DE LA JORNADA

Dar continuidad al Informe 36 mediante la consolidación de los ajustes visuales y responsivos realizados en el software de Gestión de Monitores, junto con las correcciones de integración relacionadas con perfiles, dependencias, autenticación y cambio entre aplicaciones. La jornada se enfocó principalmente en mejorar la experiencia desde celular, conservar la coherencia entre modo claro y modo oscuro y reforzar el control de acceso por rol.

## ALCANCE Y REGLA DE TRABAJO

* Los cambios se realizaron en ambiente local de desarrollo.
* El trabajo se concentró en Gestión de Monitores y en los puntos de integración necesarios con Gestión de Aulas.
* No se realizó despliegue institucional ni se modificaron datos productivos.
* Las validaciones técnicas se ejecutaron mediante compilación del frontend, compilación del backend central y comprobaciones de sintaxis del backend Django de Monitores.

## TRABAJO REALIZADO

### Dashboard y horario semanal

* Se corrigió la escala inicial del calendario para que la distancia entre 06:00 y 07:00 fuera equivalente a la de las franjas siguientes.
* Se ajustó la línea de hora actual y el tamaño de su etiqueta.
* En modo claro, la hora de la línea actual se muestra en negro; en modo oscuro se muestra en blanco.
* Se aumentó la legibilidad de los nombres de monitores, la información dentro de los bloques horarios y la barra de notificaciones.
* Se corrigió la etiqueta final de la escala para que 22:00 no quedara cortada en el borde inferior del calendario.
* Se conservaron la selección individual de monitor, los colores por monitor y la lectura compatible con ambos temas.

### Menús desplegables y formularios

* Se unificó la presentación de los menús desplegables del aplicativo con fondo blanco, opción activa contrastada y franja roja a la izquierda.
* Se corrigieron menús que se salían de la pantalla en celular, incluidos semestre, proyecto curricular, dependencia y filtros de distintos módulos.
* El menú de proyecto curricular permite visualizar sus opciones al abrirse, incluso cuando sobrepasa el cuadro de edición, conservando tamaños y colores.
* Se aplicó el mismo comportamiento al seleccionar proyecto curricular al editar un horario.
* En el Perfil, las secciones de Módulos y Permisos se convirtieron en listas desplegables para celular, evitando una vista excesivamente larga.
* En Usuarios se eliminó el degradado de la cabecera, se corrigió el recorte de los selectores Perfil y Dependencia y se armonizó el cuadro de restablecimiento urgente de contraseña en modo oscuro.

### Monitores y reglas de dependencia

* El Directorio de monitores se reorganizó en bloques para celular, sin obligar a desplazar horizontalmente cada registro.
* Se ajustó la posición de los botones de acción para que quedaran alineados dentro del bloque.
* El reenvío de correos de activación muestra ahora un mensaje de éxito o error.
* Se revisó el flujo de eliminación para que los errores de contraseña o de operación no queden silenciosos.
* Se habilitó la creación de monitores por parte de líderes en la API, conservando la validación de servidor que limita cada creación a la dependencia propia del líder.
* En el formulario de creación, el líder recibe su dependencia preestablecida y no puede seleccionar otra dependencia.
* La solicitud de creación fuerza la dependencia del perfil y el backend vuelve a validarla para evitar alteraciones directas de la petición.

### Horarios

* Se reforzaron las líneas y fondos de las filas de horarios para que la división entre registros sea más visible, especialmente en celular.
* Se mantuvo el estilo visual de bloques y la adaptación responsiva del módulo.
* Se identificó como pendiente la regla que actualmente impide registrar dos monitores de la misma dependencia con la misma franja horaria, aunque ambos puedan realizar sus monitorías simultáneamente.

### Horas extra, Registros y Conciliación

* Se corrigió el recorte del selector de fecha de Horas extra en vista móvil.
* Los registros de Horas extra se reorganizaron como bloques completos, sin desplazamiento horizontal.
* Registros, Históricos y el detalle por monitor se ajustaron para conservar la lectura completa de la información en pantallas pequeñas.
* En Conciliación se corrigieron los selectores de monitor y la distribución de las acciones dentro de las tarjetas móviles.
* Se revisó la distribución de la visualización de jornada; queda pendiente validar específicamente el nivel 3, que todavía puede verse incompleto o cortado.

### Memorandos, Actas y estados

* Memorandos se adaptó a una presentación móvil por bloques, con filtros y tablas organizados dentro de un contenedor único.
* Se corrigieron menús que se cortaban al cambiar el filtro de dependencia.
* Actas recibió ajustes de contraste en modo oscuro, manteniendo estados legibles y evitando el verde no solicitado para actas aceptadas.
* Se corrigieron las pestañas Gestión actual e Historial para conservar la visibilidad del círculo y del contador en modo claro y oscuro.
* El contador de Gestión actual se mantiene al entrar a Historial.
* Los módulos superiores de colores se dispusieron horizontalmente en pantallas amplias, siguiendo la referencia visual de Memorandos, y se adaptaron a la distribución móvil.

### Anotaciones, Inconsistencias y Excepciones

* Anotaciones se reorganizó en móvil: los filtros Tipo y Acción tienen tamaños equivalentes y el historial se presenta por bloques completos.
* Inconsistencias dejó de usar el degradado que no correspondía al estilo del aplicativo.
* Se aplicaron colores sólidos por estado en modo claro y modo oscuro.
* Las métricas de Inconsistencias se organizan en dos columnas y tres filas en celular.
* El listado de inconsistencias se adaptó a tarjetas completas, sin desplazamiento horizontal.
* Excepciones registradas se reorganizó para que monitor, usuarios, fechas, bloques, estado y acciones queden distribuidos de forma legible en celular.
* Queda pendiente revisar de forma integral los permisos y la visualización de Excepciones para cada rol.

### Integración entre aplicaciones y perfiles

* Se restringió el botón Cambiar a Gestión de Aulas al Administrador de Monitores y al Líder de Aulas de Software.
* En el backend central se ajustó el cálculo de aplicaciones autorizadas para que esos perfiles reciban acceso a Aulas.
* La detección del líder contempla el rol o el cargo y valida la dependencia Aulas de Software.
* Se identificó que las aplicaciones autorizadas quedan almacenadas en la sesión al iniciar sesión; después de cambiar un perfil se debe cerrar sesión y volver a entrar para recibir la autorización actualizada.
* Se mantuvo la sincronización de la identidad central con el usuario local de Monitores para aplicar el rol y la dependencia al solicitar operaciones protegidas.

## VALIDACIÓN TÉCNICA Y DE CALIDAD

* Se ejecutó la compilación de producción del frontend mediante `npm run build`.
* El frontend compiló correctamente, completó la verificación de TypeScript y generó 38 rutas.
* Se ejecutó `npm run build` en el backend central y la compilación Nest finalizó correctamente.
* Se verificó la sintaxis del módulo Django de Monitores después de permitir la creación acotada por dependencia para líderes.
* Se comprobó estructuralmente el contenido del Informe 37 antes de reemplazar el formato Word por Markdown.
* Quedan pendientes pruebas manuales con cuentas reales o de prueba para validar el cambio a Gestión de Aulas, la creación de monitores por líderes, la persistencia de dependencias y los módulos operativos completos.

## PRÓXIMOS PASOS

1. Un administrador de monitores debe poder filtrar todo por dependencia, ya que en Dashboard le debe salir el horario con monitores de una sola dependencia. Debe poder elegir la dependencia en Dashboard, Monitores, Horarios, Registros, Conciliación y Anotaciones.
2. Al registrar el horario de un monitor, revisar la restricción que impide crear un horario igual para otro monitor de la misma dependencia porque informa que ya existe un ID en ese horario. Debe permitirse que varios monitores de una misma dependencia cumplan monitorías en la misma franja.
3. Arreglar la visualización de jornada de Registros, ya que el nivel 3 se ve incompleto o cortado.
4. Revisar que en el módulo Excepciones los permisos y la visualización de los registros se apliquen correctamente desde los diferentes roles.
5. Iniciar sesión como monitor con datos de prueba y verificar cada módulo.
6. Confirmar puntualmente que solo los líderes de Aulas de Software y los administradores pueden acceder al botón Cambiar a Gestión de Aulas, ya que en una prueba previa el botón no apareció para un perfil líder de Aulas.
7. Verificar que al crear o editar un líder se guarde correctamente la dependencia a la que pertenece. En algunos casos los registros de la dependencia no aparecen hasta que un administrador vuelve a editar y seleccionar la dependencia.

## ESTADO FINAL

La jornada dejó una interfaz más coherente, legible y adaptable para Gestión de Monitores, con mejoras en móviles, modo oscuro, selectores, tablas, tarjetas y calendario. También se avanzó en la integración de perfiles: el acceso a Gestión de Aulas y la creación de monitores por líderes quedaron regulados por rol y dependencia. Antes de cualquier despliegue se deben completar las validaciones manuales indicadas en los próximos pasos, especialmente con sesiones de líder, administrador y monitor.