# Informe 2 - Frontend

FECHA: 19/08/2026  
TURNO: 6:00 a. m. - 10:00 a. m.  
MONITOR: Edwin Alejandro Orjuela Olarte

## AVANCES

* Se dio continuidad a la estructura base documentada en el Informe 1, manteniendo Next.js, React, TypeScript y los componentes reutilizables del shell principal.
* Se implementó el selector inicial de aplicativos para elegir entre Gestión de Aulas y Gestión de Monitores.
* Se configuró la navegación de Gestión de Aulas dentro del frontend actual y el acceso al aplicativo independiente de Gestión de Monitores mediante una URL configurable en variables de entorno.
* Se desarrolló la vista de Aulas de Software de acuerdo con el mockup y el proceso P14: Administración de las Aulas de Software.
* Se creó una estructura de datos tipada para las aulas, contemplando identificación, piso, capacidad, estado operativo, puestos, software instalado, historial y datos administrativos que posteriormente se integrarán con el backend.
* Se implementó el listado de aulas con filtros por estado y piso, además de indicadores visuales para disponibilidad, reserva, clase y mantenimiento.
* Se implementó el panel de detalle con las secciones Información general, Puestos, Software instalado e Historial.
* Se adaptó el diseño de las secciones del aula para escritorio, tableta y móvil, conservando la organización visual de los mockups.
* Se ajustó el estado inicial del módulo: al ingresar a Aulas no se muestra información de ninguna sala hasta que el usuario elige una.
* Se corrigió el comportamiento de los filtros: al cambiar el estado o el piso se elimina la selección anterior para evitar cargar automáticamente el detalle de una sala.
* Se rediseñaron las vistas previas a los dashboards: selector de aplicativos e inicio de sesión.
* Se actualizó la identidad visible del frontend a **COSMOS — Plataforma de Gestión** y se incorporó el mensaje: “Sistemas de control centralizado para Laboratorios de Ingeniería”.
* Se creó un componente reutilizable de inicio de sesión que identifica el aplicativo elegido, muestra validación visual y prepara la integración con la autenticación centralizada.
* Se centralizó la configuración de Gestión de Aulas y Gestión de Monitores en un único archivo para evitar duplicar nombres, destinos y descripciones.
* Se incorporó una sesión temporal de demostración y una protección de las rutas de Gestión de Aulas.
* Se dejó preparado el punto de sustitución de la sesión temporal por la autenticación centralizada en la API de Aulas, que deberá devolver la sesión y los permisos del usuario para cada aplicativo.
* Se revisó el flujo frente a la arquitectura de dos aplicativos definida en el documento de requisitos.
* Se verificó el código del frontend con TypeScript y ESLint, sin errores.

## FUNCIONA

* Selector inicial y responsivo entre Gestión de Aulas y Gestión de Monitores.
* Pantalla de acceso contextual para cada aplicativo.
* Validación visual de usuario y contraseña antes de navegar al aplicativo elegido.
* Navegación y shell principal de Gestión de Aulas.
* Dashboard, Horarios y estructura visual inicial implementada en el Informe 1.
* Listado de aulas y filtros por estado y piso.
* Selección manual de un aula para visualizar su información detallada.
* Visualización de información general, puestos, software instalado e historial mediante datos de prueba.
* Diseño responsivo de la vista de Aulas y sus secciones principales.

## NO FUNCIONA

* Los datos de las aulas todavía son datos de prueba; no existe consumo real de la API ni persistencia en base de datos.
* Las acciones Audiovisuales y Registrar práctica libre aún no están conectadas a sus módulos o formularios.
* Los demás módulos del menú todavía no están implementados.
* No hay autenticación, control de roles ni lógica de negocio integrada.
* El inicio de sesión actual es una simulación visual: aún no consume la API, no valida credenciales reales ni aplica permisos por módulo.
* La sesión temporal se guarda solo en el navegador. En la integración real deberá reemplazarse por un mecanismo seguro de token o cookie definido por la API central.
* La visualización y edición de información administrativa adicional del proceso P14 se implementará con la integración del backend.

## SIGUIENTE PASO

* Implementar las acciones y formularios relacionados con audiovisuales y prácticas libres.
* Continuar con el Calendario y los módulos pendientes definidos en los requisitos.
* Crear componentes reutilizables para formularios, tablas, modales y estados de carga o error.
* Realizar pruebas responsivas y funcionales de la navegación entre los dos aplicativos.
* Integrar el formulario con el servicio central de autenticación de Aulas y validar los permisos específicos de Gestión de Aulas y Gestión de Monitores antes de redirigir.
* Iniciar el traslado progresivo de parte del frontend de `SoftwareHorasMonitores` al frontend principal de `Software Monitorias`, comenzando por navegación, selector y acceso, sin mezclar sus APIs ni sus bases de datos independientes.

## REVISIÓN LOCAL

Ejecutar desde la carpeta Frontend:

```bash
cd "C:\Users\MONITORES\Documents\Software Monitorias\Frontend"
npm install
npm run dev
```

Luego abrir:

* http://localhost:3000
* http://127.0.0.1:3000

> Importante: si aparece un error relacionado con archivos faltantes dentro de `.next`, detener el servidor, eliminar únicamente la carpeta `.next` desde la carpeta `Frontend` y ejecutar nuevamente `npm run dev`.
