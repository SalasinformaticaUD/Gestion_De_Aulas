# Informe 17 - Plataforma e Integración

FECHA: 05/09/2026  
TURNO: 6:00 a. m. - 12:00 m.  
AUTOR: Kaleth Molina Diaz

## OBJETIVO DE LA JORNADA

Realizar una revisión visual integral del aplicativo en modo claro y modo
oscuro, mejorando el contraste, los fondos, los bordes, los separadores, la
distribución del menú lateral y la adaptación de los componentes. Los cambios
se enfocaron en la presentación de los módulos, sin modificar reglas de
negocio, datos ni funcionalidades operativas.

## AVANCES REALIZADOS

### Contraste y estados visuales

* Se mejoró el contraste del selector de semana y fecha consultada en el
  módulo de **Horarios** cuando se utiliza el modo oscuro.
* Se aplicaron fondos suaves y bordes diferenciados a los indicadores de
  estado del módulo de **Disponibilidad**, respetando los estados Disponible,
  Ocupada, Reservada, Mantenimiento y Bloqueada.
* Se incorporaron fondos degradados por estado en los indicadores de
  **Prácticas Libres**, **Préstamos Docentes**, **Software Instalado**,
  **Observaciones**, **Tareas Operativas**, **Multas**, **Limpieza** y
  **Préstamos Audiovisuales**.
* En modo oscuro, los recuadros de resumen conservan fondos oscuros tintados
  según el estado, con bordes verdes, azules, amarillos, rojos, violetas o
  neutros para facilitar la lectura.
* Los indicadores de audiovisuales quedaron alineados con el estilo visual de
  Préstamos Docentes: inventario neutro, disponibles en verde, prestados en
  amarillo y no disponibles en rojo.

### Tablas, tarjetas y formularios

* Se añadieron líneas horizontales entre los registros de las tablas de
  **Prácticas Libres**, **Préstamos Docentes** y **Préstamos Audiovisuales**.
* Se reforzaron los contornos del buscador y de los recuadros de gestión en
  modo claro para que se distingan del fondo.
* Se ajustaron los fondos de Gestión actual, Historial y Registro permanente
  del módulo de **Tareas Operativas** en modo oscuro, incluyendo la tabla y el
  mensaje de ausencia de registros.
* En **Limpieza**, se corrigieron los fondos claros que permanecían visibles en
  modo oscuro y se separó el título “Matriz mensual de aseo” del borde superior
  para mejorar su legibilidad.
* Se ajustaron los nombres largos del software instalado para que se ajusten
  dentro de sus tarjetas sin desbordar el margen ni desplazar la etiqueta de
  estado.

### Menú lateral y barra superior

* La sidebar quedó fija a la izquierda y se impidió su desplazamiento vertical
  durante la navegación.
* Se conservaron tamaños cómodos y se reorganizó el espacio vertical para que
  todos los módulos, incluido **Multas**, sean visibles junto con las acciones
  inferiores.
* Se corrigió la distribución del contenido principal para que no se comprima
  ni quede superpuesto cuando la sidebar está abierta o contraída.
* El botón hamburguesa se ubicó dentro de la sidebar visible, separado del
  nombre “Aulas de Software”, y al contraerla queda fijo en la parte superior
  izquierda.
* El botón utiliza el rojo institucional y mantiene el comportamiento de
  mostrar y ocultar el menú.
* Se separó el periodo académico de la hamburguesa para evitar que el año
  quede cubierto.

### Acceso protegido de Credenciales

* Se permitió cerrar el aviso de acceso protegido sin ingresar la contraseña,
  dejando disponible la navegación hacia los demás módulos.
* Cuando el módulo permanece bloqueado, se muestra un estado protegido que
  permite volver a abrir la solicitud de contraseña posteriormente.
* La contraseña, el desbloqueo temporal y las validaciones existentes no fueron
  modificados.

## RESTRICCIONES Y REGLAS CONSERVADAS

* No se modificaron estados, cálculos, permisos, validaciones de préstamos,
  auditoría, persistencia ni reglas de negocio.
* Los cambios de color se aplican únicamente a la presentación de los estados
  existentes.
* La navegación del menú mantiene sus rutas actuales y el botón hamburguesa
  conserva su comportamiento de escritorio y dispositivos móviles.
* La corrección del módulo de Credenciales únicamente permite cerrar el aviso
  protegido y continuar navegando; el acceso al contenido sigue requiriendo la
  contraseña correspondiente.

## VALIDACIONES EJECUTADAS

* Se compiló el frontend con `npm run build` y la compilación terminó
  correctamente.
* Se verificó la generación de las rutas del aplicativo y la comprobación de
  tipos.
* Se revisaron los estilos de modo claro y modo oscuro en los módulos
  intervenidos.
* La compilación conserva advertencias preexistentes de dependencias de
  `useEffect` en Limpieza, Multas y Prácticas Libres, además de una advertencia
  de Autoprefixer en los estilos de Prácticas Libres; no se presentaron errores
  de construcción.

## PLAN DE TRABAJO - PRÓXIMA JORNADA

1. Realizar una revisión visual final módulo por módulo en diferentes tamaños
   de pantalla.
2. Verificar estados hover, focus, activo, seleccionado y deshabilitado en
   ambos temas.
3. Confirmar con el encargado del software que los ajustes visuales cumplen
   con el diseño esperado.
4. Ejecutar pruebas de navegación con la sidebar abierta y contraída,
   incluyendo el acceso protegido de Credenciales.
5. Mantener la restricción de no modificar lógica funcional sin autorización
   del encargado del software.

## ESTADO ACTUAL

La interfaz cuenta con una presentación más consistente entre módulos y temas,
con mejor contraste en tarjetas, tablas, formularios y controles. La sidebar se
mantiene fija y el botón hamburguesa permite controlar su visibilidad sin
superponer el encabezado ni el contenido principal. Los cambios realizados en
esta jornada son principalmente visuales y respetan las reglas funcionales
existentes.
