# Informe 18 - Plataforma e Integración

FECHA: 05/09/2026  
TURNO: Jornada de ajuste y estabilización  
AUTOR: Esteban Bautista

## OBJETIVO DE LA JORNADA

Corregir inconsistencias visuales reportadas en los módulos operativos,
mejorar el rendimiento de las consultas que cargaban listados completos y
estabilizar el funcionamiento local de Horarios. El trabajo se concentró en
presentación, consulta eficiente de datos y disponibilidad del entorno local;
no se modificaron reglas de negocio de préstamos, multas, asistencia,
permisos ni auditoría.

## AVANCES REALIZADOS

### Ajustes visuales y experiencia de uso

* En **Horarios**, los controles de asistencia muestran contraste al pasar el
  cursor en modo oscuro y los botones deshabilitados conservan cursor normal,
  evitando la apariencia de operación en curso cuando no existe una acción
  disponible.
* En **Disponibilidad**, el estado sin aulas disponibles dejó de usar un fondo
  blanco que desentonaba con la interfaz. El mensaje ahora mantiene un fondo y
  contraste consistentes con el tema activo.
* Se corrigió la visualización de nombres largos de aulas, en especial **Sala
  Especializada 403**, dentro de las tarjetas de selección de **Prácticas
  Libres** y **Préstamos Docentes**. El texto se ajusta al contenedor sin
  recortes ni desbordamientos en ambos temas.
* En **Préstamos Audiovisuales** se corrigieron campos y opciones que conservaban
  fondos claros dentro del modal en modo oscuro.
* En **Usuarios**, la asignación de permisos quedó dentro de un contenedor más
  compacto, con buscador y desplazamiento interno. Esto facilita localizar un
  permiso sin extender excesivamente el formulario de roles.

### Rendimiento de listados

* Se implementó paginación clásica de 25 registros por consulta en
  **Estudiantes**, **Docentes**, **Multas** y **Software Instalado**.
* Las pantallas conservan en caché las páginas que ya fueron visitadas. Volver
  a una página anterior no realiza otra solicitud mientras la información siga
  vigente en la sesión.
* La caché se invalida después de crear, editar, eliminar, importar o cambiar
  el estado de un registro. De esta forma, la siguiente consulta solicita datos
  actualizados al backend y no muestra información obsoleta.
* Multas conserva sus indicadores generales de activas, cumplidas y anuladas,
  mientras que las tablas consultan únicamente el subconjunto necesario según
  la vista, el estado, la búsqueda y la página seleccionada.

### Consulta diaria de Horarios

* El módulo de **Horarios** dejó de traer todas las clases y todas las
  asistencias del período al abrirse.
* La vista inicia con la fecha actual y permite seleccionar otra fecha o
  navegar con los botones **Anterior**, **Hoy** y **Siguiente**.
* La API recibe la fecha seleccionada, determina el día de la semana y devuelve
  solamente las clases del período para ese día, junto con las asistencias de
  esa misma fecha.
* El cierre de asistencias vencidas se limitó a la fecha que se está
  consultando, evitando recorridos innecesarios por todo el semestre durante
  cada carga de Horarios.

### Estabilidad del entorno local

* Se aisló la salida de compilación de producción de Next.js para que no
  sobrescriba los archivos usados por el servidor de desarrollo. Esto previene
  el error de módulos de Webpack faltantes, como `Cannot find module './833.js'`.
* Se verificó que el backend estuviera disponible nuevamente en el puerto 3001
  y que el endpoint de salud respondiera correctamente.
* Se reinició el servidor de desarrollo del frontend en el puerto 3000 para
  asegurar que la interfaz cargara la versión actual de Horarios y no una
  compilación anterior en memoria.

## VALIDACIONES EJECUTADAS

* Se compiló el backend con `npm run build` sin errores.
* Se compiló el frontend con `npm run build` sin errores de tipos ni de rutas.
* Se confirmó que el backend responde correctamente en `/health` con estado
  HTTP 200.
* Se verificó que Horarios sirve la vista diaria y consulta el backend con el
  parámetro de fecha.
* Persisten advertencias preexistentes de dependencias de `useEffect` en
  Limpieza, Multas y Prácticas Libres, además de advertencias de Autoprefixer
  en estilos. No bloquearon la compilación.

## PENDIENTES Y RECOMENDACIONES

### Pruebas funcionales prioritarias

1. Realizar pruebas de extremo a extremo de **Horarios** con una fecha pasada,
   la fecha actual y una fecha futura. Se debe confirmar que las asistencias se
   muestran y registran solo en la fecha correspondiente, y que los controles
   se habilitan únicamente dentro de la ventana permitida.
3. Validar en navegadores y tamaños de pantalla representativos los nuevos
   contenedores de permisos, los modales de préstamo y las tarjetas de aulas
   con nombres largos, tanto en modo claro como oscuro.
4. Ejecutar una revisión completa de navegación después de reiniciar el
   frontend y el backend, especialmente tras una compilación de producción,
   para confirmar que no se reproduzcan errores de chunks de Next.js.

### Pendientes funcionales heredados de informes anteriores

1. Ejecutar el smoke test real entre Aulas y Monitores con ambos servicios,
   secretos y URLs de cada entorno. Debe incluir autenticación, salud,
   aprovisionamiento idempotente y rechazo de tokens inválidos.
2. Configurar de forma segura las variables institucionales de integración y
   correo, incluyendo `EMAIL_WEBHOOK_URL`, sin versionar secretos. Luego debe
   probarse el envío real de confirmaciones de Prácticas Libres.
3. Completar pruebas de Préstamos Docentes: búsqueda por documento, otro
   profesor, software requerido, disponibilidad estricta, usuario encargado y
   restricciones de bloque.
4. Validar las pruebas de carga masiva de Estudiantes, Docentes, Multas y
   Software con archivos institucionales, filas inválidas, duplicados y
   reemplazo de datos cuando aplique.
5. Revisar con cuentas administradora y no administradora el acceso a Usuarios,
   la administración de cargos, la asignación automática del cargo Monitor y
   los permisos de Multas.
6. Mantener las pruebas pendientes de Limpieza, Tareas Operativas y reportes
   de impresión, incluyendo ciclos de fechas controladas, historial y
   auditoría.

### Recomendaciones técnicas

1. Mantener la separación entre el directorio de desarrollo de Next.js y el de
   compilaciones de producción. Antes de compilar o reiniciar servicios, usar
   los scripts definidos en el proyecto para evitar mezclar artefactos.
2. Incorporar pruebas automatizadas de integración para los filtros por fecha
   de Horarios y para las respuestas paginadas. Deben cubrir total, límite,
   búsqueda, límites de página e invalidación tras mutaciones.
3. Agregar observabilidad básica al entorno de despliegue: registro de errores
   del servidor, verificación de salud y una guía de reinicio para identificar
   rápidamente si un error proviene del frontend, del backend o de la base de
   datos.
4. Antes de aprobar cambios funcionales, realizar una sesión de aceptación con
   el encargado del software. Los ajustes futuros que modifiquen reglas de
   negocio, permisos, cálculos de disponibilidad o ciclos de préstamo deben
   contar con autorización explícita.

## ESTADO ACTUAL

El aplicativo cuenta con una interfaz más consistente en los casos visuales
reportados, listados principales que ya no descargan todos los registros de
una vez y una consulta diaria de Horarios orientada a la operación actual. El
entorno local quedó con frontend en el puerto 3000 y backend en el puerto 3001.
Los siguientes pasos deben priorizar pruebas de extremo a extremo con datos
institucionales, configuración segura de integraciones externas y validación
funcional con los responsables del sistema.
