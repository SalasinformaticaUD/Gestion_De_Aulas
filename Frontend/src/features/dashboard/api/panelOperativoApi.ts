import { obtenerSesion } from "@/features/auth/lib/sesion";
import { solicitarAulas } from "@/features/monitores/api/clienteMonitores";

export type EstadoDisponibilidad = "disponible" | "ocupada" | "reservada" | "mantenimiento" | "bloqueada";
export type EstadoHorario = "EN_CLASE" | "PENDIENTE" | "AUSENTE";
export type SeveridadAlerta = "info" | "advertencia" | "critica";

export type ResumenPanelOperativo = {
  fecha: string;
  bloqueReferencia: { horaInicio: string; horaFin: string };
  metricas: { totalAulas: number; disponibles: number; ocupadas: number; reservadas: number; mantenimiento: number; bloqueadas: number; practicasActivas: number; audiovisualesPrestados: number; alertas: number };
  horarioActual: Array<{ id: string; horaInicio: string; horaFin: string; aulaId: string; aulaCodigo: string; asignatura: string; proyecto: string | null; docente: string; grupo: string; estado: EstadoHorario }>;
  aulas: Array<{ aula: { id: string; codigo: string }; estadoCalculado: EstadoDisponibilidad }>;
  alertas: Array<{ id: string; severidad: SeveridadAlerta; tipo: string; mensaje: string; aulaCodigo?: string; fechaHora?: string; enlace?: string; accion?: string }>;
  calculadoEn: string;
};

function token() {
  const valor = obtenerSesion()?.tokenAcceso;
  if (!valor) throw new Error("La sesión expiró. Inicie sesión nuevamente.");
  return valor;
}

export function consultarResumenPanel(fecha: string, signal?: AbortSignal) {
  return solicitarAulas<ResumenPanelOperativo>(`/panel-operativo/resumen?fecha=${encodeURIComponent(fecha)}`, token(), { signal });
}
