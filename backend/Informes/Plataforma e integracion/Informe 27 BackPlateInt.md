# Informe 27 — Plataforma e Integración

**Fecha:** 15/09/2026  
**Alcance:** Credenciales operativas, recomendaciones de limpieza y próximos pasos del módulo de Software.  
**Entorno autorizado:** Docker local. No se realizaron ni se deben realizar cambios en el entorno desplegado.
**AUTORES:** Ivan Felipe Prado Blanco y Carol Stefanya Velasco Rodriguez  

## TURNOS DE TRABAJO

* **Ivan Felipe Prado Blanco:** 6:00 a. m. - 10:00 a. m.
* **Carol Stefanya Velasco Rodriguez:** 6:00 a. m. - 12:00 p. m.


## Objetivo

Fortalecer el control de acceso de las credenciales operativas para que cada contraseña tenga autorizaciones explícitas por usuario o perfil; corregir la recomendación de aulas para limpieza usando la disponibilidad operativa; y dejar identificado el ajuste pendiente para asociar software existente a varias aulas.

## Avances realizados

### 1. Credenciales: propietario, usuarios, roles y niveles de acceso

- Se incorporó un **creador persistente** para cada credencial. Al crearla, el usuario creador queda automáticamente con permisos de visualización y edición.
- El formulario de creación permite seleccionar usuarios y perfiles/roles autorizados desde el inicio.
- Cada autorización puede ser de dos tipos:
  - **Solo visualizar:** permite consultar y revelar temporalmente la contraseña, sin modificar su información ni su secreto.
  - **Visualizar y editar:** permite modificar los datos de la credencial y cambiar la contraseña, previa confirmación de identidad y de la contraseña anterior.
- El creador puede abrir la sección **Autorizados** de cada credencial para añadir, retirar o cambiar posteriormente los permisos de usuarios y perfiles.
- La administración mantiene acceso total a las credenciales y puede gestionar autorizaciones, sin sustituir la regla de propiedad para eliminar.
- La eliminación quedó restringida exclusivamente al usuario que creó la credencial. Ni un usuario con edición ni el administrador pueden eliminar una credencial creada por otra persona.
- Se conserva la lógica de roles existente: los permisos globales de Credenciales habilitan el módulo y sus capacidades generales; la autorización de una credencial concreta determina qué contraseña puede ver o editar cada usuario.
- Se corrigió el listado para incluir credenciales autorizadas a través de un **rol**, no únicamente las autorizadas de forma individual a un usuario.
- Se corrigió la interfaz para que un usuario o perfil con acceso de solo visualización no vea las acciones de edición o cambio de contraseña. El backend también impide esas operaciones aunque se intente invocar la ruta directamente.
- La información de propietario, usuarios autorizados, perfiles autorizados y nivel de permiso se muestra en el diálogo **Personas y perfiles autorizados** de cada credencial.

### 2. Limpieza: recomendaciones basadas en disponibilidad

- El panel de recomendaciones dejó de usar únicamente los días desde la última limpieza.
- Antes de recomendar un aula, el módulo consulta la disponibilidad calculada para el bloque operativo actual de dos horas.
- Se excluyen de las recomendaciones las aulas ocupadas por clase programada, préstamo, práctica libre, restricción o tarea que afecte la disponibilidad.
- En particular, una clase con asistencia docente confirmada como asistida se considera ocupación del bloque y no debe generar recomendación de limpieza.
- El criterio devuelto por el servicio indica el bloque horario usado para determinar la disponibilidad.

## Validación realizada

- Backend: compilación exitosa con `npm run build`.
- Frontend: compilación exitosa con `npm run build`.
- Pruebas unitarias focalizadas de Credenciales: exitosas.
- Pruebas unitarias focalizadas de Limpieza: **10/10 exitosas**.
- La migración de credenciales fue ajustada para asignar propietario a registros históricos desde el acceso existente y, si fuera necesario, desde el administrador local.

## Pendiente de validar con datos de prueba

### Limpieza

No se cuenta actualmente con datos de prueba suficientes de horarios y asistencias confirmadas para validar manualmente el flujo completo. Falta comprobar en Docker local que:

1. Un aula con una clase en el bloque actual y asistencia `ASISTIO` no aparezca en las sugerencias de limpieza.
2. Un aula con clase ausente, préstamo, práctica libre, restricción o tarea operativa reciba el comportamiento esperado según la disponibilidad calculada.
3. Un aula libre durante el bloque actual siga apareciendo priorizada por los días desde la última limpieza.

No se debe validar este cambio en el entorno desplegado. La prueba debe hacerse solamente contra la URL local levantada con Docker.

## Próximos pasos

### 1. Prueba manual de credenciales en Docker

- Crear una credencial desde un usuario no administrador.
- Autorizar un usuario individual con solo visualización y confirmar que puede revelar el secreto, pero no editarlo ni cambiarlo.
- Autorizar un perfil con edición y confirmar que los usuarios de ese perfil pueden modificar la credencial autorizada.
- Confirmar que un usuario no autorizado no puede listar, consultar, revelar ni editar la credencial.
- Confirmar que solamente el creador puede eliminarla.

### 2. Prueba manual de recomendaciones de limpieza en Docker

- Cargar o crear aulas, un período activo, clases programadas y asistencias de prueba.
- Revisar el panel de Limpieza durante el bloque de la clase confirmada.
- Contrastar las recomendaciones con el módulo de Disponibilidad antes de registrar una limpieza.

### 3. Software: asociación reutilizable y múltiple de aulas

El módulo ya posee catálogo de software e infraestructura para asociar una instalación a un aula existente. El siguiente ajuste de interfaz y flujo debe permitir seleccionar un software del catálogo y asociarlo a **varias aulas en una sola operación**, sin volver a crear el software por cada aula.

La implementación debe contemplar:

- Selección de un software existente y de múltiples aulas.
- Conservación de la validación que evita duplicar la misma asociación software-aula.
- Resultado claro por aula: asociada, ya existente o con error.
- Uso de rutas y base de datos Docker local únicamente; no modificar el desplegado.

## Comandos de actualización local

Desde `C:\Users\MONITORES\Documents\Software Monitorias\backend`:

```powershell
docker compose up --build -d backend frontend
docker compose ps
```

La aplicación local queda disponible en `http://localhost:3001` cuando los servicios `backend` y `frontend` estén en estado `Up`.

## Restricción operativa

**Todos los cambios, compilaciones, migraciones y pruebas de este informe corresponden exclusivamente al Docker local. No se debe tocar el entorno desplegado.**
