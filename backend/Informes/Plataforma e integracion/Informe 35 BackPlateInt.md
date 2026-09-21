# Informe Plan de Integración 35 - Ajustes de interfaz y validación funcional de Gestión de Monitores

FECHA: 19/09/2026  
AUTOR: Esteban Bautista  

## OBJETIVO DE LA JORNADA

Dar continuidad al Informe 34 mediante el fortalecimiento visual y funcional de los módulos operativos de Gestión de Monitores, con énfasis en Actas, Conciliación de asistencia y Excepciones. Asimismo, ejecutar pruebas técnicas y validaciones manuales de los flujos intervenidos, sin realizar cambios sobre el despliegue institucional.

## ALCANCE Y REGLA DE TRABAJO

* Todas las actividades se realizaron exclusivamente en el ambiente local de desarrollo.
* No se modificó el despliegue, la infraestructura institucional ni los datos productivos.
* Las pruebas automatizadas utilizaron una base de datos temporal, creada y eliminada por el proceso de pruebas, sin afectar la base local operativa.

## TRABAJO REALIZADO

### Actas de compromiso

* Se mejoró la presentación del listado de seguimiento de firmas, conservando el lenguaje visual actual del aplicativo: encabezados negros, tablas legibles, estados diferenciados y acciones compactas.
* Se organizaron los datos de cada registro para presentar con claridad monitor, código, correo, dependencia, estado, documento firmado y acciones disponibles.
* Se incorporó un modal propio para rechazar actas, reemplazando la alerta del navegador. El formulario exige que el administrador o líder registre el motivo del rechazo antes de confirmar la acción.
* Se corrigió el funcionamiento de los filtros de Actas por texto, estado y dependencia, asegurando que el listado se actualice con los criterios seleccionados y que la paginación vuelva a la primera página cuando cambian dichos criterios.
* Se mantuvo la separación entre la gestión operativa del periodo vigente y el histórico de periodos cerrados.
* Se generó y cargó una acta firmada de prueba en ambiente local para comprobar el ciclo de carga, visualización, descarga, aceptación y rechazo.
* Se validaron manualmente las acciones de **aceptar** y **rechazar** actas; ambas completaron correctamente el flujo esperado.

### Conciliación de asistencia

* Se corrigió la identificación de candidatos para conciliación manual. La búsqueda ahora compara la dependencia normalizada del registro importado con la dependencia del monitor activo, evitando que la diferencia entre identificadores técnicos y nombres visibles deje el selector sin candidatos.
* Se compactó la interfaz de conciliación para mostrar candidatos válidos en un selector por registro, con nombre y código del monitor.
* Cuando no existen monitores activos disponibles para una dependencia, el sistema informa el caso sin permitir una vinculación incorrecta.
* Se verificó manualmente el flujo de conciliación de registros pendientes, confirmando que la selección y vinculación funcionan correctamente.

### Excepciones de horario

* Se rediseñó el formulario de creación y edición de excepciones para mejorar su lectura y uso en pantallas pequeñas y grandes.
* Se sustituyeron las tarjetas de selección extensas por listas desplegables compactas para usuarios y bloques de horario.
* Se añadieron etiquetas resumidas para identificar los elementos seleccionados sin mantener listados abiertos permanentemente.
* La lista de usuarios disponibles se limita a monitores activos de la dependencia seleccionada.
* Al cambiar de dependencia, se retiran de manera controlada las selecciones que ya no corresponden a dicha dependencia, evitando configuraciones inconsistentes.
* Se validó manualmente la creación, edición y eliminación de excepciones, incluido el selector desplegable de usuarios y bloques.

### Validación técnica y de calidad

* Se compiló el frontend completo mediante `npm run build`, incluyendo las rutas de Actas, Conciliación, Excepciones, Horarios, Monitores, Históricos, Horas extra, Anotaciones y demás módulos relacionados.
* La compilación finalizó correctamente, sin errores de TypeScript ni de generación de rutas.
* Se ejecutó la suite automatizada completa de la API de Gestión de Monitores mediante `manage.py test`.
* Se ejecutaron 14 pruebas automatizadas con resultado satisfactorio: **14 pruebas aprobadas y 0 fallos**.
* Se verificaron casos de autorización y validación negativa de manera controlada. Los registros `Forbidden`, `Not Found` y `Bad Request` observados durante la ejecución corresponden a escenarios esperados de pruebas de seguridad y validación, no a fallos del sistema.
* Las pruebas cubrieron, entre otros, flujos de actas, permisos de revisión, asistencia, conciliación, excepciones, anotaciones, horarios, monitores, autenticación e importación.

## VALIDACIONES MANUALES CONFIRMADAS

* Aceptación y rechazo de una acta firmada de prueba.
* Funcionamiento de la conciliación manual de asistencia.
* Creación, edición y eliminación de excepciones.
* Selección desplegable de usuarios y bloques dentro de Excepciones.
* Filtros y paginación en Actas, Monitores, Horarios e Históricos.

## PRÓXIMOS PASOS

1. Crear un monitor nuevo y verificar el estado **Pendiente**, el envío del correo de activación y el cambio a **Activo** después de establecer la contraseña.
2. Crear o cargar un monitor recurrente de un periodo anterior y comprobar que conserva su cuenta activa sin reenviar correo de activación.
3. Verificar visualmente que los mensajes temporales de éxito, error e información se desvanezcan y que su temporizador se pause al mantener el cursor sobre ellos.
4. Validar con una cuenta integrada el cambio de sesión entre Gestión de Aulas y Gestión de Monitores, incluyendo que el cambio de contraseña se refleje desde cualquiera de los dos aplicativos.
5. Realizar una revisión visual responsive en resoluciones de escritorio y móvil para Actas, Conciliación y Excepciones.
6. Mantener las validaciones y los datos de prueba en ambiente local hasta completar la aceptación funcional; no desplegar cambios sin la aprobación correspondiente.

## ESTADO FINAL

Se consolidaron mejoras de usabilidad y estabilidad en los módulos de Actas, Conciliación y Excepciones de Gestión de Monitores. Los flujos funcionales intervenidos fueron compilados, probados automáticamente y validados manualmente en los casos principales. Los resultados actuales no presentan fallos técnicos detectados; permanecen pendientes las verificaciones del ciclo de activación de monitores, la sesión compartida entre aplicativos y la revisión responsive final.