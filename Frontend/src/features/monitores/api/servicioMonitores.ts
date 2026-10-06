import { descargarMonitores, solicitarAulas, solicitarMonitores } from "./clienteMonitores";
import { obtenerSesion } from "@/features/auth/lib/sesion";
import type { AnotacionApi, ConciliacionApi, ConsultaPublicaApi, DashboardApi, DetalleInconsistenciaApi, PanelMonitorApi, RegistrosPersonalesApi, ExcepcionApi, HorarioApi, ImportacionAsistenciaApi, IndicadoresInconsistenciasApi, InconsistenciaApi, MonitorApi, PaginaApi, SesionApi } from "./contratosMonitores";

export const servicioMonitores = {
  listarMonitores: () => solicitarMonitores<MonitorApi[]>("/api/v1/monitors/"),
  listarPaginaMonitores: (pagina = 1) => solicitarMonitores<PaginaApi<MonitorApi>>(`/api/v1/monitors/?page=${pagina}&page_size=20`),
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
  previsualizarNuevoSemestre: () => solicitarMonitores<{ preview: Record<string, number> }>("/api/v1/monitors/new-semester/", { signal: AbortSignal.timeout(30000) }),
  iniciarNuevoSemestre: (new_semester_name: string, starts_on: string, ends_on: string, password: string) => solicitarMonitores<{ archived_semester: string; new_semester: string; starts_on: string; ends_on: string; affected: Record<string, number> }>("/api/v1/monitors/new-semester/", { method: "POST", body: JSON.stringify({ new_semester_name, starts_on, ends_on, password, confirm: true }), signal: AbortSignal.timeout(60000) }),
  verificarContrasenaActual: (password: string) => solicitarAulas<{ valido: boolean }>("/auth/verificar-contrasena", obtenerSesion()?.tokenAcceso, { method: "POST", body: JSON.stringify({ password }) }),
  obtenerPerfilMonitores: async () => {
    const perfil = await solicitarMonitores<{ role: string; department?: string | null; monitor_is_current?: boolean | null }>("/api/v1/auth/me/");
    return { ...perfil, role: perfil.role.trim().toLowerCase() };
  },
  listarUsuariosGestion: () => solicitarMonitores<Array<{ id:string; username:string; email:string; first_name:string; last_name:string; full_name:string; role:"admin"|"leader"; department:"physics"|"informatics_labs"|"electrical"|null; is_active:boolean; source:"AULAS"|"MONITORES"; usuario_externo_id:string|null }>>("/api/v1/auth/users/"),
  crearUsuarioGestion: (payload: { username:string; email:string; first_name:string; last_name:string; password:string; role:"admin"|"leader"; department:"physics"|"informatics_labs"|"electrical"|null; is_active:boolean }) => solicitarMonitores("/api/v1/auth/users/", { method:"POST", body:JSON.stringify(payload) }),
  actualizarUsuarioGestion: (id:string, payload: { username:string; email:string; first_name:string; last_name:string; password?:undefined; role:"admin"|"leader"; department:"physics"|"informatics_labs"|"electrical"|null; is_active:boolean }) => solicitarMonitores(`/api/v1/auth/users/${id}/`, { method:"PATCH", body:JSON.stringify(payload) }),
  restablecerClaveUsuarioGestion: (id:string, password:string) => solicitarMonitores(`/api/v1/auth/users/${id}/password/`, { method:"POST", body:JSON.stringify({ password }) }),
  obtenerDashboard: (department?: string) => solicitarMonitores<DashboardApi>(`/api/v1/reports/dashboard/${department ? `?department=${encodeURIComponent(department)}` : ""}`),
  obtenerMiDashboardMonitor: (monitorId?: string) => solicitarMonitores<PanelMonitorApi>(`/api/v1/reports/dashboard/me/${monitorId ? `?monitor_id=${encodeURIComponent(monitorId)}` : ""}`),
  obtenerMisRegistros: (monitorId?: string) => solicitarMonitores<RegistrosPersonalesApi>(`/api/v1/reports/monitor-records/me/${monitorId ? `?monitor_id=${encodeURIComponent(monitorId)}` : ""}`),
  listarHorarios: () => solicitarMonitores<HorarioApi[]>("/api/v1/schedules/"),
  listarPaginaHorarios: (pagina = 1) => solicitarMonitores<PaginaApi<HorarioApi>>(`/api/v1/schedules/?page=${pagina}&page_size=20`),
  crearHorario: (payload: Pick<HorarioApi, "monitor" | "weekday" | "start_time" | "end_time" | "asignatura" | "grupo" | "docente" | "proyecto_curricular" | "location" | "is_active">) =>
    solicitarMonitores<HorarioApi>("/api/v1/schedules/", { method: "POST", body: JSON.stringify(payload) }),
  actualizarHorario: (id: string, payload: Partial<Pick<HorarioApi, "is_active" | "weekday" | "start_time" | "end_time" | "asignatura" | "grupo" | "docente" | "proyecto_curricular" | "location">>) =>
    solicitarMonitores<HorarioApi>(`/api/v1/schedules/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }),
  eliminarHorario: (id: string) => solicitarMonitores<void>(`/api/v1/schedules/${id}/`, { method: "DELETE" }),
  importarHorarios: (archivo: File) => { const datos = new FormData(); datos.append("file", archivo); return solicitarMonitores<{ total_rows: number; created: number; skipped: Array<{ row_number: number; monitor_email: string; reason: string }>; errors: Array<{ row_number: number; monitor_email: string; reason: string }> }>("/api/v1/schedules/import/", { method: "POST", body: datos }); },
  listarExcepciones: () => solicitarMonitores<ExcepcionApi[]>("/api/v1/schedules/exceptions/"),
  obtenerSemestreActivo: () => solicitarMonitores<{ name: string; starts_on: string | null; ends_on: string | null }>("/api/v1/schedules/exceptions/active-semester/"),
  crearExcepcion: (payload: Omit<ExcepcionApi, "id" | "department_label" | "semester">) =>
    solicitarMonitores<ExcepcionApi>("/api/v1/schedules/exceptions/", { method: "POST", body: JSON.stringify(payload) }),
  actualizarExcepcion: (id: string, payload: Partial<Omit<ExcepcionApi, "id" | "department_label" | "semester">>) =>
    solicitarMonitores<ExcepcionApi>(`/api/v1/schedules/exceptions/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }),
  eliminarExcepcion: (id: string) => solicitarMonitores<void>(`/api/v1/schedules/exceptions/${id}/`, { method: "DELETE" }),
  listarAnotaciones: (monitorId?: string) => solicitarMonitores<AnotacionApi[]>(`/api/v1/annotations/${monitorId ? `?monitor=${encodeURIComponent(monitorId)}` : ""}`),
  crearAnotacion: (payload: Omit<AnotacionApi, "id" | "leader" | "department" | "created_at">) =>
    solicitarMonitores<AnotacionApi>("/api/v1/annotations/", { method: "POST", body: JSON.stringify(payload) }),
  actualizarAnotacion: (id: string, payload: Partial<Omit<AnotacionApi, "id" | "leader" | "department" | "created_at">>) =>
    solicitarMonitores<AnotacionApi>(`/api/v1/annotations/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }),
  eliminarAnotacion: (id: string) => solicitarMonitores<void>(`/api/v1/annotations/${id}/`, { method: "DELETE" }),
  listarSesiones: () => solicitarMonitores<SesionApi[]>("/api/v1/sessions/"),
  listarHistorialHorasExtra: (pagina: number, filtros: { monitor: string; fecha: string; estado: string; semestre: string }) => {
    const parametros = new URLSearchParams({ page: String(pagina), page_size: "8" });
    if (filtros.monitor.trim()) parametros.set("monitor", filtros.monitor.trim());
    if (filtros.fecha) parametros.set("work_day", filtros.fecha);
    if (filtros.estado !== "TODOS") parametros.set("status", filtros.estado);
    if (filtros.semestre) parametros.set("semester", filtros.semestre);
    return solicitarMonitores<PaginaApi<SesionApi>>(`/api/v1/sessions/overtime-history/?${parametros.toString()}`);
  },
  listarSemestresHorasExtra: () => solicitarMonitores<string[]>("/api/v1/sessions/overtime-semesters/"),
  revisarHorasExtra: async (id: string, payload: { decision: "approve" | "reject"; note?: string; penalize_on_reject?: boolean }) => {
    return solicitarMonitores<SesionApi>(`/api/v1/sessions/${id}/review-overtime/`, { method: "POST", body: JSON.stringify(payload) });
  },
  listarConciliaciones: () => solicitarMonitores<ConciliacionApi[]>("/api/v1/attendance/pending-reconciliation/"),
  listarHistorialAsistencia: async () => (await solicitarMonitores<{ count: number; next: string | null; previous: string | null; results: ConciliacionApi[] }>("/api/v1/attendance/history/?page_size=50")).results,
  listarPaginaHistorialAsistencia: (page = 1) => solicitarMonitores<{ count: number; next: string | null; previous: string | null; results: ConciliacionApi[] }>(`/api/v1/attendance/history/?page=${page}`),
  asignarMonitor: (registroId: string, monitorId: string) =>
    solicitarMonitores<ConciliacionApi>(`/api/v1/attendance/pending-reconciliation/${registroId}/assign-monitor/`, { method: "POST", body: JSON.stringify({ monitor_id: monitorId }) }),
  listarInconsistencias: (parametros = "") => solicitarMonitores<InconsistenciaApi[]>(`/api/v1/attendance/inconsistencies/${parametros ? `?${parametros}` : ""}`),
  listarHistorialInconsistencias: (parametros = "") => solicitarMonitores<InconsistenciaApi[]>(`/api/v1/attendance/inconsistencies/history/${parametros ? `?${parametros}` : ""}`),
  listarDuplicadosInconsistencias: (parametros = "") => solicitarMonitores<InconsistenciaApi[]>(`/api/v1/attendance/inconsistencies/duplicates/${parametros ? `?${parametros}` : ""}`),
  obtenerDetalleInconsistencia: (id:string) => solicitarMonitores<DetalleInconsistenciaApi>(`/api/v1/attendance/inconsistencies/${id}/`),
  obtenerIndicadoresInconsistencias: () => solicitarMonitores<IndicadoresInconsistenciasApi>("/api/v1/attendance/inconsistencies/stats/"),
  crearSolucionInconsistencia: (id:string, payload:{ annotation_type:string; action:string; delta_minutes:number; description:string }) => solicitarMonitores<InconsistenciaApi>(`/api/v1/attendance/inconsistencies/${id}/create-solution/`, { method:"POST", body:JSON.stringify(payload) }),
  invalidarSesion: (id:string, reason:string) => solicitarMonitores<SesionApi>(`/api/v1/work-sessions/${id}/invalidate/`, { method:"POST", body:JSON.stringify({ reason }) }),
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
  descartarNotificacion: (id: string) => solicitarMonitores<unknown>(`/api/v1/notifications/${id}/dismiss/`, { method: "POST" }),
  listarMemorandos: () => solicitarMonitores<unknown[]>("/api/v1/reports/memorandums/"),
  listarPaginaMemorandos: (pagina = 1, vista: "current" | "historical" = "current", semestre = "") => {
    const parametros = new URLSearchParams({ page: String(pagina), page_size: "20", scope: vista });
    if (vista === "historical" && semestre) parametros.set("semester", semestre);
    return solicitarMonitores<PaginaApi<unknown>>(`/api/v1/reports/memorandums/?${parametros.toString()}`);
  },
  listarSemestresMemorandos: () => solicitarMonitores<string[]>("/api/v1/reports/memorandums/semesters/"),
  reenviarMemorando: (id: string) => solicitarMonitores<unknown>(`/api/v1/reports/memorandums/${id}/resend/`, { method: "POST" }),
  descargarMemorando: (id: string) => descargarMonitores(`/api/v1/reports/memorandums/${id}/pdf/`),
  listarActasCompromiso: (semester?: string) => solicitarMonitores<unknown[]>(`/api/v1/reports/commitment-acts/${semester ? `?semester=${encodeURIComponent(semester)}` : ""}`),
  obtenerMiActaCompromiso: () => solicitarMonitores<Record<string, unknown>>("/api/v1/reports/commitment-acts/me/"),
  subirMiActaCompromiso: (archivo: File) => {
    const datos = new FormData(); datos.append("signed_file", archivo);
    return solicitarMonitores<Record<string, unknown>>("/api/v1/reports/commitment-acts/me/", { method: "POST", body: datos });
  },
  descargarMiActaCompromiso: () => descargarMonitores("/api/v1/reports/commitment-acts/me/pdf/"),
  descargarActaCompromiso: (monitorId: string) => descargarMonitores(`/api/v1/reports/commitment-acts/${monitorId}/pdf/`),
  descargarActaFirmada: (monitorId: string) => descargarMonitores(`/api/v1/reports/commitment-acts/${monitorId}/signed-pdf/`),
  revisarActaCompromiso: (monitorId: string, action: "accept" | "reject", rejection_reason = "") => solicitarMonitores<unknown>(`/api/v1/reports/commitment-acts/${monitorId}/review/`, { method: "POST", body: JSON.stringify({ action, rejection_reason }) }),
  listarHistorico: (parametros = "") => solicitarMonitores<unknown[]>(`/api/v1/reports/history/${parametros ? `?${parametros}` : ""}`),
  obtenerDetalleRegistrosMonitor: (monitorId: string) => solicitarMonitores<{ sessions: SesionApi[]; schedules: HorarioApi[]; annotations: AnotacionApi[]; inconsistencies: InconsistenciaApi[] }>(`/api/v1/reports/monitor-records/${monitorId}/`),
};
