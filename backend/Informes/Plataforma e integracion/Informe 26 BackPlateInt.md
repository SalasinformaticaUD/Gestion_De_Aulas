# Informe 26 — Plataforma e Integración

**Fecha:** 10/09/2026  
**Alcance:** Tareas Operativas, permisos de usuarios, carga masiva de multas y actualización local en Docker.

## Avances realizados

- En **Tareas Operativas**, se ajustó la gestión de informes: todos los usuarios con acceso al módulo pueden consultar los informes registrados, incluso mientras la tarea está en proceso.
- El registro de un nuevo informe quedó restringido exclusivamente a los usuarios asignados como responsables de la tarea. Esta regla se valida tanto en la interfaz como en el backend.
- Se reemplazaron las referencias visibles de **“salas”** por **“aulas”** en las tarjetas, grupos y ventanas de tareas agrupadas.
- En **Aulas**, los botones de crear aula y cargar aulas masivamente ahora se muestran según el permiso `AULAS_CREAR`, sin exigir que el usuario sea administrador. Editar y eliminar continúan dependiendo de `AULAS_ACTUALIZAR` y `AULAS_ELIMINAR`, respectivamente.
- En **Horarios**, la importación masiva quedó habilitada para usuarios con `HORARIOS_CREAR`; se retiró la restricción adicional de administrador que impedía usar la acción pese a contar con el permiso asignado. El inicio de semestre permanece limitado al administrador por afectar el período institucional.
- Se reconstruyeron y recrearon los contenedores locales de migración, backend y frontend. Todos los servicios quedaron saludables. Durante el proceso se aplicó correctamente la migración aditiva de foto de perfil, sin eliminar información existente.

## Hallazgo de carga masiva de multas

- Se revisó el archivo de multas cargado en el entorno desplegado: contiene **85 filas**, pero solo produce **77 multas**.
- La diferencia se debe a **nueve filas idénticas** del estudiante `20242025090 - HERRERA CORTES JUAN CAMILO`, con el mismo motivo, fecha, descripción, multa sugerida y estado. El sistema conserva un único registro e ignora las otras ocho repeticiones para evitar multas duplicadas.
- Debe revisarse el origen de esas filas para determinar si se trata de un error humano en el archivo histórico, una duplicación durante su elaboración o una omisión previa de información. No se borraron registros desde la aplicación durante esta revisión.

## Estado de validación

- Pruebas del servicio de Tareas Operativas: **12/12 exitosas**.
- Compilación de backend y frontend: exitosa.
- Contenedores de base de datos, backend, frontend y renderizador PDF: saludables.

## Restricción de cambios

**NO SE DEBE TOCAR MÁS EL CÓDIGO HASTA ESPERAR INSTRUCCIONES DE KEVIN RINCÓN.**

Estado: ajustes aplicados y verificados en Docker local; la revisión de las filas duplicadas de multas queda documentada para validación administrativa antes de cualquier intervención adicional.
