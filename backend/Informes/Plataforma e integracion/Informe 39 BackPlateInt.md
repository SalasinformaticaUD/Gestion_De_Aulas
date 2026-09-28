# Informe Plan de Integración 39 - Experiencia del monitor, llegadas tarde y diseño responsive de Actas

FECHA: 22/09/2026  
AUTORES: Juan Esteban Cañón y Edwin Alejandro Orjuela  

## TURNOS DE TRABAJO

* **Juan Esteban Cañón:** revisión funcional del acceso del perfil Monitor y validación de navegación.
* **Edwin Alejandro Orjuela:** implementación y verificación del dashboard personal, API y ajustes responsive.

## OBJETIVO DE LA JORNADA

Ajustar la experiencia del perfil Monitor dentro de Gestión de Monitores, limitando los módulos visibles a los autorizados y mostrando información propia del monitor. También se corrigió la visualización de llegadas tarde en el Dashboard y se mejoró la carga de archivos de Actas en dispositivos móviles.

## ALCANCE Y REGLA DE TRABAJO

* Los cambios se realizaron en el frontend de Gestión de Monitores y en la API Django de reportes.
* Se mantuvo la separación entre el dashboard administrativo y el dashboard personal del monitor.
* El conteo de llegadas tarde usa registros válidos y no incluye registros invalidados ni llegadas justificadas.
* Los ajustes visuales se enfocaron en responsive y no alteran el flujo de revisión administrativa de Actas.

## TRABAJO REALIZADO

### Módulos visibles para el perfil Monitor

* Se actualizó la navegación de `MarcoMonitores` para que el perfil Monitor solo visualice:
  * Dashboard;
  * Anotaciones;
  * Registros;
  * Actas.
* Se ocultaron del menú los módulos administrativos como Monitores, Horarios, Horas extra, Conciliación, Excepciones, Inconsistencias, Memorandos, Históricos, Asistencia, Importación y Usuarios.
* La identificación del rol se normaliza para aceptar diferencias de mayúsculas y espacios.
* Si la consulta de sesión tiene una falla temporal, se conserva la detección del rol desde la sesión local para no mostrar módulos administrativos por error.
* El botón de cambio de aplicativo continúa sujeto a las reglas existentes: únicamente administrador de Monitores o líder autorizado de Aulas de Software con sesión central válida.

### Dashboard personal del monitor

* Se conserva el calendario con únicamente los horarios asignados al monitor autenticado.
* Se mantienen los bloques de registros recientes y anotaciones recientes propios del monitor.
* Se agregó el bloque **Llegadas tarde** en la parte inferior del Dashboard.
* El bloque muestra el número total de registros con minutos de tardanza, excluyendo llegadas justificadas y sesiones invalidadas.
* El indicador utiliza los estados visuales existentes: advertencia cuando existen llegadas tarde y estado positivo cuando el conteo es cero.

### API del dashboard personal

* Se incorporó el campo `late_count` en el contrato `PanelMonitorApi` del frontend.
* El endpoint `/api/v1/reports/dashboard/me/` calcula y entrega `late_count` para el monitor autenticado.
* El endpoint continúa limitando horarios, sesiones y anotaciones al perfil de monitor de la sesión; no expone datos de otros monitores.
* Se agregó la exclusión explícita de `SessionStateChoices.INVALID` y de `lateness_excused=True` para que el indicador represente únicamente llegadas tarde pendientes de justificación.

### Diseño responsive de Actas

* Se compactó el bloque de selección de archivo del monitor.
* Se eliminó la altura mínima excesiva de la zona de carga en pantallas pequeñas.
* El nombre del archivo y la descripción ahora se ajustan al ancho disponible sin desbordar el contenedor.
* El control de archivo ocupa el ancho disponible sin generar una tarjeta masiva.
* En celular, el botón de carga se presenta a ancho completo y conserva el estilo institucional.
* El ajuste aplica a la vista personal del monitor sin modificar el tamaño general de las tablas administrativas de Actas.

## VALIDACIÓN TÉCNICA

* `npm run build` del frontend finalizó correctamente.
* La compilación de TypeScript finalizó sin errores.
* Las pruebas Django del módulo de reportes finalizaron correctamente: **7 pruebas ejecutadas, 7 exitosas**.
* Se verificó que la API del dashboard personal incluya `late_count` y que el contrato del frontend lo consuma.
* Se revisó el selector de aplicativo para conservar la restricción de administrador o líder autorizado.

## COSAS PENDIENTES

1. Probar el diseño responsive de ambos módulos, Dashboard y Actas, con una cuenta real de Monitor en celular, verificando el orden visual, el calendario, el bloque de llegadas tarde y la carga de archivos.
2. Validar con datos reales que el número de llegadas tarde coincida con el módulo Registros para el periodo académico vigente.
3. Confirmar en ambiente central que un Monitor no pueda acceder por URL directa a módulos administrativos, además de tenerlos ocultos en la navegación.
4. Verificar visualmente la carga de un PDF rechazado y su posterior corrección desde varios tamaños de pantalla.
5. Probar la renovación de sesión para asegurar que el menú se actualice correctamente al cambiar entre perfiles.

## ESTADO FINAL

La navegación del perfil Monitor quedó limitada a Dashboard, Anotaciones, Registros y Actas. El dashboard personal ahora muestra las llegadas tarde del monitor mediante un dato calculado en backend, respetando los estados válidos y las justificaciones. La vista de Actas tiene una zona de selección de archivo más compacta y adaptable a dispositivos móviles. La compilación frontend y las pruebas del módulo de reportes finalizaron correctamente.