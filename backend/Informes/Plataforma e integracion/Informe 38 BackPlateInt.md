# Informe Plan de Integración 38 - Filtros por dependencia, permisos y autenticación entre aplicativos

FECHA: 22/09/2026  
AUTOR: Esteban Bautista  

## TURNOS DE TRABAJO

* **Esteban Bautista:** Jornada de revisión, implementación y validación técnica.

## OBJETIVO DE LA JORNADA

Dar continuidad al Informe 37 mediante la implementación de los filtros administrativos por dependencia, la corrección de la visualización de registros y la revisión de los permisos del módulo Excepciones. También se revisó puntualmente el cambio entre Gestión de Monitores y Gestión de Aulas, identificando la diferencia entre una cuenta local de Monitores y una identidad central autorizada para ambos aplicativos.

## ALCANCE Y REGLA DE TRABAJO

* Los cambios se realizaron en ambiente local de desarrollo.
* Se trabajó sobre el frontend de Gestión de Monitores, la API Django de Monitores y el backend central de autenticación.
* No se modificaron datos productivos ni se realizó despliegue institucional.
* Las validaciones técnicas se realizaron mediante compilación, revisión de migraciones y pruebas estructurales del código.

## TRABAJO REALIZADO

### Filtros administrativos por dependencia

* Se creó un selector reutilizable de dependencia para administradores.
* El filtro se integró en Dashboard, Monitores, Horarios, Registros, Conciliación y Anotaciones.
* El Dashboard envía la dependencia seleccionada a la API y filtra el calendario, métricas, horas extra pendientes, anotaciones y registros relacionados.
* En Monitores se filtran los registros visibles por dependencia.
* En Horarios se filtran la tabla y los monitores disponibles para asignar un nuevo horario.
* En Registros se filtran los monitores activos y sus resúmenes del periodo actual.
* En Conciliación se conserva el filtro administrativo y los líderes quedan limitados automáticamente a su dependencia.
* En Anotaciones se filtran el historial y los monitores que pueden seleccionarse al crear una anotación.
* Los líderes no reciben un selector global: la dependencia se obtiene desde su perfil y se aplica automáticamente.
* Se normalizó el rol recibido desde la API para aceptar valores como `admin`, `ADMIN`, `leader` o `LIDER`.

### Horarios compartidos

* Se verificó que el modelo de horarios utiliza la restricción correcta: monitor, día, hora inicial y hora final.
* La validación de cruces se aplica únicamente al mismo monitor, no a todos los monitores de una dependencia.
* La migración `0002_update_schedule_uniqueness` se encuentra aplicada en la base local.
* Se añadió una prueba que confirma que dos monitores de la misma dependencia pueden tener la misma franja horaria con identificadores distintos.
* La regla continúa impidiendo que un mismo monitor tenga bloques activos cruzados.

### Visualización de jornada en Registros

* Se corrigió la pista del Nivel 3, correspondiente a los registros de huella.
* Las marcaciones de entrada y salida ubicadas en los extremos ya no deben quedar recortadas.
* Se aumentó el espacio vertical y se dejó visible la línea base de las marcaciones, incluyendo la vista móvil.
* El Nivel 3 representa las marcaciones reales, mientras que el Nivel 1 representa el horario asignado y el Nivel 2 la clasificación de horas.

### Módulo Excepciones y permisos

* Se revisó la consulta de excepciones por rol.
* Los administradores pueden consultar y gestionar excepciones de cualquier dependencia.
* Los líderes solo pueden consultar las excepciones de su dependencia y las excepciones generales aplicables.
* El backend impide que un líder cree, edite o elimine una excepción de otra dependencia.
* En la interfaz de líderes, la dependencia queda fija y no se permite elegir “Todas las dependencias”.
* Se ocultan las acciones de edición y eliminación cuando el registro no pertenece a la dependencia del líder.
* Los monitores y bloques disponibles en el formulario se limitan a los datos autorizados para el líder.
* Se conserva la validación del servidor para evitar que una petición manipulada salte las restricciones de la interfaz.

### Cambio entre Gestión de Monitores y Gestión de Aulas

* Se mantuvo la regla funcional: solo administradores y líderes de Aulas de Software pueden cambiar desde Monitores a Aulas.
* Se normalizaron roles, cargos y nombres de dependencia para reconocer variantes como `LIDER`, `LEADER`, `INFORMATICS_LABS` y “Aulas de Software”.
* Se corrigió la lista de aplicaciones autorizadas almacenada en la sesión para evitar que una autorización central actualizada quedara oculta por una sesión antigua.
* Se revisó el `AccessGuard` para conservar la sesión al entrar a Gestión de Aulas.
* Se detectó un caso importante: `leader.labs` creado por el seed de Django es una cuenta local de Monitores. Esa cuenta puede autenticarse en Monitores, pero no posee un token ni un perfil en el backend central de Aulas; por eso no puede completar el cambio de aplicativo y termina en el login.
* Para evitar un botón que no puede funcionar, las cuentas locales sin token central ya no deben presentar el cambio a Aulas. El botón debe aparecer únicamente cuando exista una identidad central autorizada para ambos aplicativos.

## DISEÑO PROPUESTO PARA EL LOGIN Y LA VINCULACIÓN DE LÍDERES

### Fuente única de identidad

El login debe iniciarse en el backend central. La respuesta central debe incluir:

* identidad del usuario;
* roles asignados;
* dependencia central;
* permisos y módulos autorizados;
* token de acceso y tiempo de expiración;
* indicadores de acceso a Monitores y Aulas.

Gestión de Monitores debe recibir esa identidad mediante el flujo de integración o handoff, asociando el usuario central con el usuario local de Monitores mediante `usuario_externo_id`.

### Perfil central requerido

Para un líder de Aulas de Software que también administra Monitores se debe crear una relación de rol con estos valores:

```text
perfilMonitores: LIDER
dependenciaMonitores: INFORMATICS_LABS
módulos: MONITORES y los módulos de AULAS autorizados
estado de cuenta: ACTIVA
```

El nombre de usuario y el correo deben ser únicos en el backend central. La dependencia central debe ser “Aulas de Software” y su código de integración debe mapearse a `informatics_labs` en la API Django.

### Flujo de cambio esperado

1. El líder inicia sesión desde el login central.
2. El backend central valida sus credenciales y devuelve el token junto con las aplicaciones autorizadas.
3. El usuario entra a Gestión de Monitores; el frontend conserva la sesión central.
4. El botón “Cambiar a Gestión de Aulas” se muestra solo si el perfil es administrador o líder con `INFORMATICS_LABS` y la sesión tiene token central.
5. Al pulsar el botón, se cambia la aplicación activa sin pedir credenciales nuevamente.
6. El guard de Gestión de Aulas valida el mismo token contra `/auth/me`.
7. Si la validación es correcta, se abre `/gestion-aulas`; si no, se informa que la cuenta no tiene autorización central, en lugar de tratarla como un error silencioso.
8. Al volver a Monitores, la misma sesión central conserva el vínculo y el backend local puede resolver el usuario por `usuario_externo_id`.

### Vinculación de un líder con Gestión de Aulas

La vinculación debe realizarse desde la administración de usuarios o roles del backend central, no creando una segunda cuenta independiente en Django. El procedimiento recomendado es:

1. Crear o localizar el usuario central por correo o nombre de usuario.
2. Asignar el rol de líder.
3. Seleccionar la dependencia Aulas de Software.
4. Activar el perfil de Monitores como `LIDER` con dependencia `INFORMATICS_LABS`.
5. Asignar el módulo Monitores y los permisos de Aulas que correspondan.
6. Ejecutar o verificar la sincronización hacia Monitores.
7. Confirmar que el usuario local tenga el mismo `usuario_externo_id`, rol `leader` y dependencia `informatics_labs`.
8. Cerrar sesión y volver a iniciar para renovar `aplicacionesAutorizadas` y el token.

No se debe resolver el cambio guardando una contraseña local en el frontend ni creando un usuario paralelo sin vínculo central.

## VALIDACIÓN TÉCNICA

* El frontend compiló correctamente mediante `npm run build` después de integrar los filtros, los permisos de Excepciones y el flujo de cambio de aplicativo.
* La verificación de TypeScript finalizó sin errores.
* Las migraciones de horarios muestran aplicada `0002_update_schedule_uniqueness`.
* La sintaxis del backend Django de reportes, horarios y permisos fue validada.
* Se añadió cobertura estructural para horarios iguales entre monitores distintos.
* Las pruebas completas de Django quedaron condicionadas por la dependencia local `bcrypt`, que no está instalada en el entorno de ejecución actual.
* La prueba manual del cambio a Aulas con `leader.labs` local no es válida como prueba de integración central, porque esa cuenta no existe como perfil central vinculado.

## COSAS PENDIENTES

1. Crear o confirmar en la base central un usuario de prueba líder de Aulas de Software con perfil `LIDER`, dependencia `INFORMATICS_LABS` y acceso a ambos aplicativos.
2. Ejecutar una prueba de login central y comprobar que `puedeAccederAulas` y `puedeAccederMonitores` sean verdaderos.
3. Verificar que la sesión contenga el token central y ambas aplicaciones autorizadas.
4. Probar el cambio Monitores → Aulas y Aulas → Monitores sin volver al login.
5. Verificar que la sincronización conserve el mismo usuario externo en ambos sistemas.
6. Probar un líder de otra dependencia y confirmar que no vea el botón de cambio a Aulas.
7. Probar un administrador y confirmar que sí pueda cambiar de aplicativo.
8. Instalar `bcrypt` en el entorno de pruebas y ejecutar la suite Django completa.
9. Validar visualmente en celular el Nivel 3 de Registros con marcaciones exactamente a las 05:00 y 23:00.
10. Completar pruebas de Excepciones con administrador, líder de Aulas de Software, líder de otra dependencia y usuario monitor.
11. Revisar que al editar o crear un líder la dependencia central y la dependencia local se actualicen juntas.

## ESTADO FINAL

Los filtros por dependencia, la visualización del Nivel 3 y las reglas de Excepciones quedaron implementados y compilados. El cambio entre aplicaciones quedó protegido por rol, dependencia y existencia de una sesión central válida. El principal punto pendiente no es visual: consiste en crear y vincular correctamente el perfil central del líder de Aulas de Software con su usuario local de Monitores. Hasta completar esa vinculación, una cuenta creada únicamente por el seed local de Monitores no puede autenticarse en Gestión de Aulas.