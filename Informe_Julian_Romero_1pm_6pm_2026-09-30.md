FECHA: 30/09/2026  
TURNO: 1:00 p. m. a 6:00 p. m.  
MONITOR: Julian Romero

## OBJETIVO DEL AVANCE

Corregir la disponibilidad de aulas, mejorar la navegación y las cargas de Gestión de Monitores, ajustar la visualización y clasificación de jornadas en Registros, y recuperar la operación del semestre `2026-3` después de la apertura accidental de `2027-1`.

## AVANCES

* Se corrigió el error interno de Disponibilidad causado por una diferencia entre el esquema Prisma generado y la base de datos. Se aplicó la migración pendiente de Observaciones para que el módulo volviera a consultar las aulas.
* Se añadieron plantillas descargables para las cargas de monitores, horarios y cuentas; en Reportes se habilitó la descarga de la plantilla oficial de acta. La carga de Registros quedó exceptuada según lo solicitado.
* Se ajustó el botón de retorno a Gestión de Aulas desde Gestión de Monitores.
* En el Dashboard de Monitores, los días del horario semanal se convirtieron en filtros sin duplicarlos. Al seleccionar un día se muestra solo su información y queda visible la acción «Ver horario semanal» para regresar.
* Se ajustó la consulta de notificaciones para que los líderes vean las de su dependencia y los administradores puedan consultar todas las áreas.
* Se cambió el texto «Registros en la API» por «Monitores registrados» y se restringió la acción de iniciar un semestre nuevo al administrador.
* En Gestión de Aulas se desactivó la pantalla interna de suspensión para usuarios con rol Monitor. El contenido permanece visible después del tiempo de inactividad.
* En Registros → Monitor se mejoró el contraste de la visualización de Jornada en modo oscuro: fondo, escala, pistas, textos y colores de clasificación.
* En los registros históricos se recuperó la referencia de los horarios desactivados al cerrar un semestre. Estos horarios permanecían en la base de datos, pero la interfaz los descartaba.
* Se corrigió la línea de tiempo para que la clasificación de horas utilice las marcaciones normalizadas por la API. Las marcaciones reales de entrada y salida siguen mostrándose en el nivel de huella.
* Se separaron visualmente los tres niveles: horario asignado en ámbar de mayor contraste, clasificación de horas con colores por estado y huellas en tonos turquesa. La salida usa un tono más oscuro que la entrada.
* Se eliminó la clasificación de cada punto de huella como hora extra. El estado de aprobación se representa únicamente en los tramos de horas calculadas.
* Para el registro del 21/05/2026 se añadió la representación del intervalo entre la entrada real y la entrada normalizada como tiempo no contabilizado por retraso; el intervalo posterior a la salida normalizada se muestra como «No aplica extra» cuando la sesión tiene cero horas extra.
* Las consultas de la API de Monitores se configuraron para evitar reutilizar respuestas almacenadas por el navegador, de modo que las aprobaciones recientes se reflejen al volver a consultar los registros.

## TRABAJO REALIZADO SOBRE APIS Y LÓGICA DE HORAS

* Se confirmó que la migración de Observaciones pendiente era la causa del fallo de Disponibilidad; después de aplicarla, Prisma informó que el esquema de la base estaba actualizado y el backend compiló.
* Se revisó el cálculo de sesiones: la API normaliza entrada y salida a bloques de media hora, suma como normales los minutos que coinciden con horarios asignados y calcula las horas extra como la duración normalizada menos los minutos normales.
* Se verificó que no existe un umbral mínimo independiente para aprobar o clasificar horas extra. No se agregó una regla arbitraria al cálculo.
* Se aprovechó la información `normalized_start` y `normalized_end` que ya entrega la API para alinear el historial visual con el cálculo persistido.
* Cuando el cálculo indica cero minutos extra, la interfaz evita presentar diferencias de marcación como «Extra pendiente».
* Se verificó que la apertura de `2027-1` archivó `2026-3`, desactivó sus monitores y horarios y eliminó las notificaciones; no eliminó actas, sesiones ni memorandos.
* Se reactivó `2026-3`, se retiró `2027-1` —que no tenía monitores ni excepciones asociados— y se reactivaron 40 monitores y 226 horarios dentro de una transacción.

## FUNCIONA EN MODO DEMO

* El monitor puede entrar a Gestión de Aulas sin que aparezca la pantalla interna de suspensión por inactividad.
* Registros → Monitor muestra la jornada histórica y su horario asignado en modo claro y oscuro.
* Los puntos de huella indican entrada y salida sin representar por sí solos una decisión sobre horas extra.
* El 21/05/2026 se diferencian las horas normales, el retraso y el tiempo que no aplica como extra.
* El semestre activo vuelve a ser `2026-3`; sus monitores, horarios y actas vuelven a quedar disponibles para las consultas habituales.

## PARTES FALTANTES DEL FRONTEND

* Verificar en navegador las jornadas históricas de varios monitores, especialmente los casos con marcaciones cercanas al inicio y al fin de un bloque.
* Revisar si algún monitor u horario de `2026-3` estaba inactivo antes del cambio accidental de semestre. La operación original no guardó esa distinción y la reversión reactivó todos los registros del período.
* Restaurar las notificaciones anteriores solo si se encuentra una copia de la base de datos previa a la apertura de `2027-1`.

## ANOTACIÓN DE CONTINUIDAD ENTRE APLICATIVOS

La clasificación de horas proviene de Gestión de Monitores. La interfaz utiliza los tiempos normalizados y el estado de aprobación entregados por esa API; los puntos de huella conservan las horas reales. No se modificaron los valores históricos de horas, las aprobaciones ni las actas para producir los ajustes visuales.

Antes de revertir el semestre se generó `respaldo_pre_reversion_2027-1_20260930.json` en el repositorio de Gestión de Monitores. Contiene datos personales y no debe incluirse en un commit.

## POSIBLES MEJORAS

* Registrar una bitácora de cada apertura y reversión de semestre, incluyendo el estado previo individual de monitores y horarios.
* Sustituir la eliminación de notificaciones al abrir semestre por un archivo histórico recuperable.
* Agregar pruebas de regresión para jornadas con retraso, redondeo de entrada o salida, cero horas extra y horarios de semestres cerrados.

## REVISIÓN LOCAL

* ESLint terminó sin errores en los componentes modificados de Registros y en el cliente de la API de Monitores.
* La revisión de formato de Git no detectó errores en los archivos modificados para la línea de tiempo.
* Se confirmó en la base de datos que `2026-3` es el único semestre activo y que `2027-1` ya no existe.
* Se confirmaron 40 monitores activos, 226 horarios activos, 51 actas, 683 sesiones y 6 memorandos vinculados a `2026-3`.
* Las notificaciones permanecen en cero porque la operación original las eliminó y no se encontró una copia para recuperarlas.
