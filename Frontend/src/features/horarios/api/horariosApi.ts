import { obtenerSesion } from "@/features/auth/lib/sesion";
import { descargarAulas, solicitarAulas } from "@/features/monitores/api/clienteMonitores";

export type Periodo = { id: string; nombre: string; activo: boolean; fechaInicio: string; fechaFin: string };
export type ClaseApi = { id: string; aulaId: string; semana?: number; diaSemana: number; horaInicio: string; horaFin: string; grupo: string; modeloPc?: string | null; software?: string | null; hardware?: string | null; aula: { codigo: string }; asignatura: { nombre: string }; docente: { nombre: string }; proyectoCurricular?: { nombre: string } | null; asistencias?: Array<{ id: string; fecha: string; estado: "PENDIENTE" | "ASISTIO" | "AUSENTE" }> };
export type ResultadoImportacionExcel = {
  procesados: number;
  creados: number;
  actualizados: number;
  eliminadosPorReemplazo: number;
  rechazados: number;
  detallesRechazados: Array<{ fila: number; motivo: string }>;
  advertencias?: Array<{ fila: number; motivo: string }>;
};
const token = () => { const value = obtenerSesion()?.tokenAcceso; if (!value) throw new Error("La sesión expiró. Inicie sesión nuevamente."); return value; };
export const listarPeriodos = () => solicitarAulas<Periodo[]>("/horario/periodos", token());
export const iniciarSemestre = (input: { nombre: string; fechaInicio: string; fechaFin: string; passwordConfirmacion: string }) =>
  solicitarAulas<Periodo>("/horario/periodos/iniciar-semestre", token(), { method: "POST", body: JSON.stringify(input) });
export const listarClases = (periodoId: string, fecha?: string) => {
  const params = new URLSearchParams({ periodoId });
  if (fecha) params.set("fecha", fecha);
  return solicitarAulas<ClaseApi[]>(`/horario/clases?${params.toString()}`, token());
};
export async function importarHorarioExcel(periodoId: string, archivo: File, reemplazarAnterior = true): Promise<ResultadoImportacionExcel> {
  const formulario = new FormData();
  formulario.append("archivo", archivo);
  formulario.append("periodoId", periodoId);
  formulario.append("reemplazarAnterior", String(reemplazarAnterior));
  return solicitarAulas<ResultadoImportacionExcel>("/horario/importar/excel", token(), { method: "POST", body: formulario });
}

export async function registrarAsistencia(claseId: string, fecha: string, estado: "ASISTIO" | "AUSENTE") {
  return solicitarAulas(`/asistencia-docente/registrar`, token(), {
    method: "PUT",
    body: JSON.stringify({ claseId, fecha, estado }),
  });
}

export const descargarFichasAsistenciaMes = (mes: string) => descargarAulas(`/reportes/asistencia-docente/pdf/mes?mes=${encodeURIComponent(mes)}`, token());
