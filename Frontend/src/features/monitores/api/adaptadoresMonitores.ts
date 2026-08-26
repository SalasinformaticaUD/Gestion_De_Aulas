import type { AnotacionApi, ConsultaPublicaApi, DashboardApi, ExcepcionApi, HorarioApi, MonitorApi, SesionApi } from "./contratosMonitores";
import type { AnotacionMonitor, DependenciaMonitor, ExcepcionHorario, HorarioMonitor, Monitor, ResumenMonitor, SesionMonitor } from "../tipos/modelosMonitores";

const dependencias: Record<string, DependenciaMonitor> = {
  physics: "Monitores Física",
  informatics_labs: "Monitores Aulas de Software",
  electrical: "Monitores Laboratorios",
};
export const nombreDependencia = (codigo: string | null | undefined): DependenciaMonitor => codigo ? dependencias[codigo] ?? codigo : "Todas las dependencias";
export const codigoDependencia = (nombre: string) => Object.entries(dependencias).find(([, etiqueta]) => etiqueta === nombre)?.[0] ?? null;

export const adaptarMonitor = (item: MonitorApi): Monitor => ({ id:item.id, nombre:item.full_name, codigo:item.codigo_estudiante, dependencia:nombreDependencia(item.department), activo:item.is_active });
export const adaptarHorario = (item: HorarioApi): HorarioMonitor => ({ id:item.id, monitorId:item.monitor, dia:["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"][item.weekday] as HorarioMonitor["dia"], horaInicio:item.start_time.slice(0,5), horaFin:item.end_time.slice(0,5), activo:item.is_active });
export const adaptarExcepcion = (item: ExcepcionApi): ExcepcionHorario => ({ id:item.id, nombre:item.name, descripcion:item.description, fechaInicio:item.start_date, fechaFin:item.end_date, dependencia:item.department ? nombreDependencia(item.department) : "TODAS", ignorarRetrasos:item.ignore_lateness, aprobarHorasExtra:item.approve_overtime, activa:item.is_active });

const tipos: Record<AnotacionApi["annotation_type"], AnotacionMonitor["tipo"]> = { missing_punch:"OLVIDO_REGISTRO", virtual_hours:"HORAS_VIRTUALES", permission:"PERMISO", novelty:"NOVEDAD" };
const acciones: Record<AnotacionApi["action"], AnotacionMonitor["accion"]> = { add:"SUMAR", deduct:"DESCONTAR", note:"ANOTAR" };
export const adaptarAnotacion = (item: AnotacionApi): AnotacionMonitor => ({ id:item.id, monitorId:item.monitor, fecha:item.occurred_on, tipo:tipos[item.annotation_type], accion:acciones[item.action], horas:Math.abs(item.delta_minutes)/60, motivo:item.description, responsable:item.leader });

const estados: Record<SesionApi["overtime_status"], SesionMonitor["estadoExtra"]> = { pending:"PENDIENTE", approved:"APROBADA", rejected:"RECHAZADA", not_applicable:"NO_APLICA" };
export const adaptarSesion = (item: SesionApi): SesionMonitor => ({ id:item.id, monitorId:item.monitor, fecha:item.work_day, entrada:item.actual_start?.slice(0,8) ?? "—", salida:item.actual_end?.slice(0,8) ?? "—", horasNormales:item.normal_minutes/60, horasExtra:item.overtime_minutes/60, horasRetraso:item.late_minutes/60, estadoExtra:estados[item.overtime_status], retrasoExento:item.lateness_excused, excepcion:item.lateness_exception_name || undefined });

export const adaptarResumenDashboard = (item: DashboardApi["monitor_rows"]) => item.map<ResumenMonitor>((fila) => ({ monitorId:fila.monitor_id, horasNormales:fila.normal_minutes/60, horasExtraAprobadas:fila.approved_overtime_minutes/60, horasExtraPendientes:fila.pending_overtime_minutes/60, horasAnotaciones:fila.annotation_delta_minutes/60, retrasos:fila.late_count, tieneMemorando:fila.has_memorandum }));

export function adaptarConsultaPublica(respuesta: ConsultaPublicaApi) {
  const monitor: Monitor = { id:respuesta.monitor.codigo_estudiante, codigo:respuesta.monitor.codigo_estudiante, nombre:respuesta.monitor.full_name, dependencia:nombreDependencia(respuesta.monitor.department), activo:true };
  const resumen: ResumenMonitor = { monitorId:monitor.id, horasNormales:respuesta.metrics.normal_minutes/60, horasExtraAprobadas:respuesta.metrics.approved_overtime_minutes/60, horasExtraPendientes:respuesta.metrics.pending_overtime_minutes/60, horasAnotaciones:respuesta.metrics.annotation_delta_minutes/60, retrasos:respuesta.metrics.late_count, tieneMemorando:respuesta.metrics.has_memorandum };
  const sesiones: SesionMonitor[] = respuesta.recent_sessions.map((item,index) => adaptarSesion({ ...item, id:`publica-${index}`, monitor:monitor.id, monitor_name:monitor.nombre, overtime_review_note:"" }));
  return { monitor, resumen, sesiones };
}
