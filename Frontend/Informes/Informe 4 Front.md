# Informe 4 - Frontend

FECHA: 25/08/2026  
TURNO: 6:00 a.m - 12:00 p.m
MONITOR: Carol Stefanya Velasco Rodríguez

## AVANCES

* Se revisó el Informe 3 de Frontend para dar continuidad al estado del proyecto (módulo de Audiovisuales) y se completó el desarrollo del resto de módulos que aún faltaban en el aplicativo Gestión de Aulas, todos manteniendo las fuentes, colores, componentes y estilos definidos desde el Informe 1.
* Se desarrolló la vista **Aulas**, con listado, filtros e información de detalle por sala, según lo definido como siguiente paso en el Informe 3.
* Se desarrolló la vista **Software Instalado**, con el catálogo de software, las instalaciones registradas por aula y la opción de importación del inventario.
* Se desarrolló la vista **Disponibilidad de Aulas**, que muestra el estado operativo de las salas organizado por bloques de dos horas.
* Se desarrolló la vista **Préstamos Docentes**, para la solicitud y el seguimiento de aulas destinadas a actividades académicas de docentes.
* Se desarrolló la vista **Prácticas Libres**, para el registro y control del uso libre de las aulas de software.
* Se desarrolló la vista **Limpieza de Aulas**, para el registro y consulta de las limpiezas realizadas en cada sala.
* Se desarrolló la vista **Observaciones**, para registrar novedades, seguimientos y restricciones asociadas a las aulas.
* Se desarrolló la vista **Multas**, para el registro, cumplimiento y anulación de restricciones aplicadas a estudiantes.
* Se desarrolló la vista **Tareas Operativas**, para organizar y actualizar las actividades de mantenimiento y operación del laboratorio.
* Se desarrolló la vista **Credenciales Operativas**, para la administración de cuentas institucionales y permisos de acceso.
* Se desarrolló la vista **Mi perfil**, con tres secciones: información personal de solo lectura, cambio de contraseña y preferencias de apariencia (modo claro / modo oscuro).
* Dentro de Mi perfil se incorporó la opción de agregar, cambiar o eliminar la foto de perfil, con validación de tipo de archivo (JPG, PNG o WebP) y de tamaño máximo (2 MB); la imagen se procesa y se guarda únicamente en el navegador.
* Se incorporó el formulario de cambio de contraseña dentro de Mi perfil, con validación visual de longitud mínima (10 caracteres) y de coincidencia entre la nueva contraseña y su confirmación.
* Se implementó el modo oscuro de la interfaz, seleccionable desde Mi perfil, aplicado mediante un atributo de tema en el documento y guardado como preferencia local del navegador.
* Se creó una estructura de datos y tipos propios para cada uno de los módulos nuevos (Aulas, Software, Disponibilidad, Préstamos Docentes, Prácticas Libres, Limpieza, Observaciones, Multas, Tareas y Credenciales), preparada para la integración posterior con la API.
* Se adaptaron todas las vistas nuevas para escritorio, tableta y móvil, siguiendo el mismo criterio de diseño responsivo aplicado en los módulos anteriores.

## FUNCIONA

* Navegación completa a todos los módulos del aplicativo Gestión de Aulas desde el menú principal: Dashboard, Horarios, Aulas, Audiovisuales, Software, Disponibilidad, Préstamos Docentes, Prácticas Libres, Limpieza, Observaciones, Multas, Tareas, Credenciales y Mi perfil.
* Visualización de la información de cada módulo mediante datos de demostración almacenados en el frontend.
* Filtros, búsquedas e indicadores visuales propios de cada módulo nuevo.
* Cambio, visualización y eliminación de la foto de perfil, con validación de formato y tamaño.
* Formulario de cambio de contraseña con validaciones visuales (longitud mínima y coincidencia de campos).
* Selección y aplicación del modo oscuro desde Mi perfil, con la preferencia guardada en el navegador.
* Diseño adaptado a escritorio, tableta y móvil en los módulos nuevos.

## NO FUNCIONA

* Ningún módulo está conectado todavía con el backend; todos los datos que se muestran son de demostración y no persisten al recargar la página.
* La foto de perfil no se sube ni se almacena en el backend; solo queda guardada en el navegador de forma temporal.
* El cambio de contraseña no está conectado con el backend: el formulario valida visualmente pero no actualiza ninguna credencial real.
* El modo oscuro debe revisarse en detalle: hay etiquetas y textos que no se alcanzan a ver correctamente y el contraste de colores no es adecuado en varias secciones.
* Falta verificar de forma completa que todas las vistas nuevas sean responsivas en todos los tamaños de pantalla; algunas secciones aún deben revisarse con más detenimiento.
* No hay autenticación real ni permisos por rol aplicados en ninguno de los módulos nuevos.
* No se muestran estados de carga, errores de API ni confirmaciones provenientes del backend en los módulos agregados hoy.

## SIGUIENTE PASO

* Revisar a fondo el modo oscuro: corregir los labels y textos que no se ven correctamente y ajustar el contraste de colores en todas las vistas.
* Revisar de forma completa la responsividad de todos los módulos nuevos en escritorio, tableta y móvil.
* Conectar la vista de Mi perfil con el backend para la actualización de datos de usuario, subida de foto de perfil y cambio real de contraseña.
* Integrar cada uno de los módulos nuevos (Aulas, Software, Disponibilidad, Préstamos Docentes, Prácticas Libres, Limpieza, Observaciones, Multas, Tareas y Credenciales) con sus respectivos endpoints reales del backend.
* Reemplazar los datos de demostración de todos los módulos por consultas reales a la API.
* Implementar estados de carga, mensajes de error y confirmaciones para las operaciones de los nuevos módulos.
* Aplicar permisos de usuario según el rol autenticado en cada módulo.

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

> Importante: la información de todos los módulos nuevos es temporal y se reinicia al recargar la página hasta que se complete la integración con la API. El modo oscuro aún debe revisarse antes de darse por terminado, ya que presenta problemas de contraste y de visibilidad en algunos textos.