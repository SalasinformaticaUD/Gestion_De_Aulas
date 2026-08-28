import { solicitarMonitores } from "./clienteMonitores";
import type { AnotacionApi, ConciliacionApi, ConsultaPublicaApi, DashboardApi, ExcepcionApi, HorarioApi, ImportacionAsistenciaApi, MonitorApi, SesionApi } from "./contratosMonitores";
import { modoDemoMonitores } from "./modoDemo";
import { anotacionesDemo, conciliacionesDemo, consultaDemo, dashboardDemo, excepcionesDemo, horariosDemo, monitoresDemo, sesionesDemo } from "./datosDemo";

async function conDemo<T>(real: () => Promise<T>, demo: T): Promise<T> {
  if (modoDemoMonitores) return demo;
  return real();
}

export const servicioMonitores = {
  listarMonitores: () => conDemo(() => solicitarMonitores<MonitorApi[]>("/api/v1/monitors/"), monitoresDemo),
  obtenerDashboard: () => conDemo(() => solicitarMonitores<DashboardApi>("/api/v1/reports/dashboard/"), dashboardDemo),
  listarHorarios: () => conDemo(() => solicitarMonitores<HorarioApi[]>("/api/v1/schedules/"), horariosDemo),
  actualizarHorario: (id: string, payload: Partial<Pick<HorarioApi, "is_active" | "weekday" | "start_time" | "end_time">>) =>
    solicitarMonitores<HorarioApi>(`/api/v1/schedules/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }),
  listarExcepciones: () => conDemo(() => solicitarMonitores<ExcepcionApi[]>("/api/v1/schedules/exceptions/"), excepcionesDemo),
  crearExcepcion: (payload: Omit<ExcepcionApi, "id" | "department_label">) =>
    solicitarMonitores<ExcepcionApi>("/api/v1/schedules/exceptions/", { method: "POST", body: JSON.stringify(payload) }),
  actualizarExcepcion: (id: string, payload: Partial<Omit<ExcepcionApi, "id" | "department_label">>) =>
    solicitarMonitores<ExcepcionApi>(`/api/v1/schedules/exceptions/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }),
  eliminarExcepcion: (id: string) => solicitarMonitores<void>(`/api/v1/schedules/exceptions/${id}/`, { method: "DELETE" }),
  listarAnotaciones: () => conDemo(() => solicitarMonitores<AnotacionApi[]>("/api/v1/annotations/"), anotacionesDemo),
  crearAnotacion: (payload: Omit<AnotacionApi, "id" | "leader" | "department" | "created_at">) =>
    solicitarMonitores<AnotacionApi>("/api/v1/annotations/", { method: "POST", body: JSON.stringify(payload) }),
  actualizarAnotacion: (id: string, payload: Partial<Omit<AnotacionApi, "id" | "leader" | "department" | "created_at">>) =>
    solicitarMonitores<AnotacionApi>(`/api/v1/annotations/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }),
  eliminarAnotacion: (id: string) => solicitarMonitores<void>(`/api/v1/annotations/${id}/`, { method: "DELETE" }),
  listarSesiones: () => conDemo(() => solicitarMonitores<SesionApi[]>("/api/v1/sessions/"), sesionesDemo),
  revisarHorasExtra: async (id: string, payload: { decision: "approve" | "reject"; note?: string; penalize_on_reject?: boolean }) => {
    if (modoDemoMonitores) {
      const sesion = sesionesDemo.find((item) => item.id === id);
      if (!sesion) throw new Error("No se encontró la sesión que se desea revisar.");
      return {
        ...sesion,
        overtime_status: payload.decision === "approve" ? "approved" : "rejected",
        overtime_review_note: payload.note ?? "",
      };
    }
    return solicitarMonitores<SesionApi>(`/api/v1/sessions/${id}/review-overtime/`, { method: "POST", body: JSON.stringify(payload) });
  },
  listarConciliaciones: () => conDemo(() => solicitarMonitores<ConciliacionApi[]>("/api/v1/attendance/pending-reconciliation/"), conciliacionesDemo),
  asignarMonitor: (registroId: string, monitorId: string) =>
    solicitarMonitores<ConciliacionApi>(`/api/v1/attendance/pending-reconciliation/${registroId}/assign-monitor/`, { method: "POST", body: JSON.stringify({ monitor_id: monitorId }) }),
  importarAsistencia: (archivo: File) => {
    const datos = new FormData();
    datos.append("source_file", archivo);
    return solicitarMonitores<ImportacionAsistenciaApi>("/api/v1/attendance/imports/", { method: "POST", body: datos });
  },
  consultarImportacion: (id: string) => solicitarMonitores<ImportacionAsistenciaApi>(`/api/v1/attendance/imports/${id}/`),
  consultaPublica: async (codigo: string) => {
    if (modoDemoMonitores) {
      const demo = consultaDemo(codigo);
      if (!demo) throw new Error("No se encontró un monitor con el código indicado.");
      return demo;
    }
    const real = solicitarMonitores<ConsultaPublicaApi>(`/api/v1/reports/public-monitor-lookup/?codigo_estudiante=${encodeURIComponent(codigo)}`);
    return real;
  },
};
