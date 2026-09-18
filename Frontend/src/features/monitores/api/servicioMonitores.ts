import { descargarMonitores, solicitarMonitores } from "./clienteMonitores";
import type { AnotacionApi, ConciliacionApi, ConsultaPublicaApi, DashboardApi, DetalleInconsistenciaApi, ExcepcionApi, HorarioApi, ImportacionAsistenciaApi, IndicadoresInconsistenciasApi, InconsistenciaApi, MonitorApi, SesionApi } from "./contratosMonitores";

export const servicioMonitores = {
  listarMonitores: () => solicitarMonitores<MonitorApi[]>("/api/v1/monitors/"),
  provisionarMonitor: (payload: { full_name: string; codigo_estudiante: string; email: string; username?: string; department: string; numero_documento?: string; proyecto_curricular?: string; telefono?: string; confirm_repeating_monitor: boolean }) =>
    solicitarMonitores<MonitorApi>("/api/v1/monitors/provision/", { method: "POST", body: JSON.stringify({ ...payload, username: payload.username?.trim() || undefined }) }),
  actualizarMonitor: (id: string, payload: Partial<Pick<MonitorApi, "codigo_estudiante" | "full_name" | "department" | "is_active">>) =>
    solicitarMonitores<MonitorApi>(`/api/v1/monitors/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }),
  eliminarMonitor: (id: string) => solicitarMonitores<void>(`/api/v1/monitors/${id}/`, { method: "DELETE" }),
  editarCuentaMonitor: (id: string, payload: { full_name: string; codigo_estudiante: string; email: string; department: string; numero_documento?: string; proyecto_curricular?: string; telefono?: string; confirm_repeating_monitor: boolean }) =>
    solicitarMonitores<MonitorApi>(`/api/v1/monitors/${id}/account/`, { method: "PATCH", body: JSON.stringify(payload) }),
  reenviarActivacion: (id: string) => solicitarMonitores<{ detail: string }>(`/api/v1/monitors/${id}/resend-activation/`, { method: "POST", body: JSON.stringify({}) }),
  importarMonitores: (archivo: File, confirm_repeating_monitors: boolean) => {
    const datos = new FormData(); datos.append("file", archivo); datos.append("confirm_repeating_monitors", String(confirm_repeating_monitors));
    return solicitarMonitores<{ total_rows: number; created: number; skipped: Array<{ row_number: number; email: string; reason: string }>; errors: Array<{ row_number: number; email: string; reason: string }> }>("/api/v1/monitors/import/", { method: "POST", body: datos });
  },
  previsualizarNuevoSemestre: () => solicitarMonitores<{ preview: Record<string, number> }>("/api/v1/monitors/new-semester/"),
  iniciarNuevoSemestre: (new_semester_name: string) => solicitarMonitores<{ archived_semester: string; new_semester: string; affected: Record<string, number> }>("/api/v1/monitors/new-semester/", { method: "POST", body: JSON.stringify({ new_semester_name, confirm: true }) }),
  verificarContrasenaActual: (password: string) => solicitarMonitores<{ valido: boolean }>("/api/v1/auth/verify-password/", { method: "POST", body: JSON.stringify({ password }) }),
  obtenerDashboard: () => solicitarMonitores<DashboardApi>("/api/v1/reports/dashboard/"),
  listarHorarios: () => solicitarMonitores<HorarioApi[]>("/api/v1/schedules/"),
  crearHorario: (payload: Pick<HorarioApi, "monitor" | "weekday" | "start_time" | "end_time" | "asignatura" | "grupo" | "docente" | "proyecto_curricular" | "location" | "is_active">) =>
    solicitarMonitores<HorarioApi>("/api/v1/schedules/", { method: "POST", body: JSON.stringify(payload) }),
  actualizarHorario: (id: string, payload: Partial<Pick<HorarioApi, "is_active" | "weekday" | "start_time" | "end_time" | "asignatura" | "grupo" | "docente" | "proyecto_curricular" | "location">>) =>
    solicitarMonitores<HorarioApi>(`/api/v1/schedules/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }),
  eliminarHorario: (id: string) => solicitarMonitores<void>(`/api/v1/schedules/${id}/`, { method: "DELETE" }),
  importarHorarios: (archivo: File) => { const datos = new FormData(); datos.append("file", archivo); return solicitarMonitores<{ total_rows: number; created: number; skipped: Array<{ row_number: number; monitor_email: string; reason: string }>; errors: Array<{ row_number: number; monitor_email: string; reason: string }> }>("/api/v1/schedules/import/", { method: "POST", body: datos }); },
  listarExcepciones: () => solicitarMonitores<ExcepcionApi[]>("/api/v1/schedules/exceptions/"),
  crearExcepcion: (payload: Omit<ExcepcionApi, "id" | "department_label">) =>
    solicitarMonitores<ExcepcionApi>("/api/v1/schedules/exceptions/", { method: "POST", body: JSON.stringify(payload) }),
  actualizarExcepcion: (id: string, payload: Partial<Omit<ExcepcionApi, "id" | "department_label">>) =>
    solicitarMonitores<ExcepcionApi>(`/api/v1/schedules/exceptions/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }),
  eliminarExcepcion: (id: string) => solicitarMonitores<void>(`/api/v1/schedules/exceptions/${id}/`, { method: "DELETE" }),
  listarAnotaciones: () => solicitarMonitores<AnotacionApi[]>("/api/v1/annotations/"),
  crearAnotacion: (payload: Omit<AnotacionApi, "id" | "leader" | "department" | "created_at">) =>
    solicitarMonitores<AnotacionApi>("/api/v1/annotations/", { method: "POST", body: JSON.stringify(payload) }),
  actualizarAnotacion: (id: string, payload: Partial<Omit<AnotacionApi, "id" | "leader" | "department" | "created_at">>) =>
    solicitarMonitores<AnotacionApi>(`/api/v1/annotations/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }),
  eliminarAnotacion: (id: string) => solicitarMonitores<void>(`/api/v1/annotations/${id}/`, { method: "DELETE" }),
  listarSesiones: () => solicitarMonitores<SesionApi[]>("/api/v1/sessions/"),
  revisarHorasExtra: async (id: string, payload: { decision: "approve" | "reject"; note?: string; penalize_on_reject?: boolean }) => {
    return solicitarMonitores<SesionApi>(`/api/v1/sessions/${id}/review-overtime/`, { method: "POST", body: JSON.stringify(payload) });
  },
  listarConciliaciones: () => solicitarMonitores<ConciliacionApi[]>("/api/v1/attendance/pending-reconciliation/"),
  asignarMonitor: (registroId: string, monitorId: string) =>
    solicitarMonitores<ConciliacionApi>(`/api/v1/attendance/pending-reconciliation/${registroId}/assign-monitor/`, { method: "POST", body: JSON.stringify({ monitor_id: monitorId }) }),
  listarInconsistencias: () => solicitarMonitores<InconsistenciaApi[]>("/api/v1/attendance/inconsistencies/"),
  obtenerDetalleInconsistencia: (id:string) => solicitarMonitores<DetalleInconsistenciaApi>(`/api/v1/attendance/inconsistencies/${id}/`),
  obtenerIndicadoresInconsistencias: () => solicitarMonitores<IndicadoresInconsistenciasApi>("/api/v1/attendance/inconsistencies/stats/"),
  crearSolucionInconsistencia: (id:string, payload:{ annotation_type:string; action:string; delta_minutes:number; description:string }) => solicitarMonitores<InconsistenciaApi>(`/api/v1/attendance/inconsistencies/${id}/create-solution/`, { method:"POST", body:JSON.stringify(payload) }),
  invalidarInconsistencia: (id:string, reason:string) => solicitarMonitores<InconsistenciaApi>(`/api/v1/attendance/inconsistencies/${id}/invalidate/`, { method:"POST", body:JSON.stringify({ reason }) }),
  importarAsistencia: (archivo: File) => {
    const datos = new FormData();
    datos.append("source_file", archivo);
    return solicitarMonitores<ImportacionAsistenciaApi>("/api/v1/attendance/imports/", { method: "POST", body: datos });
  },
  consultarImportacion: (id: string) => solicitarMonitores<ImportacionAsistenciaApi>(`/api/v1/attendance/imports/${id}/`),
  consultaPublica: (codigo: string) => solicitarMonitores<ConsultaPublicaApi>(`/api/v1/reports/public-monitor-lookup/?codigo_estudiante=${encodeURIComponent(codigo)}`),
  generarReporte: (payload: { monitor_id: string; start_date: string; end_date: string }) =>
    solicitarMonitores<unknown>("/api/v1/reports/generate/", { method: "POST", body: JSON.stringify(payload) }),
  listarReportes: () => solicitarMonitores<unknown[]>("/api/v1/reports/snapshots/"),
  listarNotificaciones: () => solicitarMonitores<DashboardApi["notifications"]>("/api/v1/notifications/"),
  marcarNotificacionLeida: (id: string) => solicitarMonitores<unknown>(`/api/v1/notifications/${id}/mark-read/`, { method: "POST" }),
  listarMemorandos: () => solicitarMonitores<unknown[]>("/api/v1/reports/memorandums/"),
  reenviarMemorando: (id: string) => solicitarMonitores<unknown>(`/api/v1/reports/memorandums/${id}/resend/`, { method: "POST" }),
  descargarMemorando: (id: string) => descargarMonitores(`/api/v1/reports/memorandums/${id}/pdf/`),
  listarActasCompromiso: () => solicitarMonitores<unknown[]>("/api/v1/reports/commitment-acts/"),
  descargarActaCompromiso: (monitorId: string) => descargarMonitores(`/api/v1/reports/commitment-acts/${monitorId}/pdf/`),
  descargarActaFirmada: (monitorId: string) => descargarMonitores(`/api/v1/reports/commitment-acts/${monitorId}/signed-pdf/`),
  revisarActaCompromiso: (monitorId: string, action: "accept" | "reject", rejection_reason = "") => solicitarMonitores<unknown>(`/api/v1/reports/commitment-acts/${monitorId}/review/`, { method: "POST", body: JSON.stringify({ action, rejection_reason }) }),
  listarHistorico: (parametros = "") => solicitarMonitores<unknown[]>(`/api/v1/reports/history/${parametros ? `?${parametros}` : ""}`),
};
