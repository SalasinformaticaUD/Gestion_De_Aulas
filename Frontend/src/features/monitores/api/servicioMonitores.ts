import { descargarMonitores, solicitarMonitores } from "./clienteMonitores";
import type { AnotacionApi, ConciliacionApi, ConsultaPublicaApi, DashboardApi, ExcepcionApi, HorarioApi, ImportacionAsistenciaApi, MonitorApi, SesionApi } from "./contratosMonitores";

export const servicioMonitores = {
  listarMonitores: () => solicitarMonitores<MonitorApi[]>("/api/v1/monitors/"),
  provisionarMonitor: (payload: { full_name: string; codigo_estudiante: string; email: string; username?: string; department: string; numero_documento?: string; proyecto_curricular?: string; telefono?: string }) =>
    solicitarMonitores<MonitorApi>("/api/v1/monitors/provision/", { method: "POST", body: JSON.stringify(payload) }),
  actualizarMonitor: (id: string, payload: Partial<Pick<MonitorApi, "codigo_estudiante" | "full_name" | "department" | "is_active">>) =>
    solicitarMonitores<MonitorApi>(`/api/v1/monitors/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }),
  eliminarMonitor: (id: string) => solicitarMonitores<void>(`/api/v1/monitors/${id}/`, { method: "DELETE" }),
  obtenerDashboard: () => solicitarMonitores<DashboardApi>("/api/v1/reports/dashboard/"),
  listarHorarios: () => solicitarMonitores<HorarioApi[]>("/api/v1/schedules/"),
  crearHorario: (payload: Pick<HorarioApi, "monitor" | "weekday" | "start_time" | "end_time" | "location" | "is_active">) =>
    solicitarMonitores<HorarioApi>("/api/v1/schedules/", { method: "POST", body: JSON.stringify(payload) }),
  actualizarHorario: (id: string, payload: Partial<Pick<HorarioApi, "is_active" | "weekday" | "start_time" | "end_time" | "location">>) =>
    solicitarMonitores<HorarioApi>(`/api/v1/schedules/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }),
  eliminarHorario: (id: string) => solicitarMonitores<void>(`/api/v1/schedules/${id}/`, { method: "DELETE" }),
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
  listarHistorico: (parametros = "") => solicitarMonitores<unknown[]>(`/api/v1/reports/history/${parametros ? `?${parametros}` : ""}`),
};
