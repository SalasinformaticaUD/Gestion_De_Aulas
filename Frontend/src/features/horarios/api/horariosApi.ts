import { obtenerSesion } from "@/features/auth/lib/sesion";
import { solicitarAulas } from "@/features/monitores/api/clienteMonitores";

export type Periodo = { id: string; nombre: string; activo: boolean; fechaInicio: string; fechaFin: string };
export type ClaseApi = { id: string; aulaId: string; semana?: number; diaSemana: number; horaInicio: string; horaFin: string; grupo: string; modeloPc?: string | null; software?: string | null; hardware?: string | null; aula: { codigo: string }; asignatura: { nombre: string }; docente: { nombre: string }; proyectoCurricular?: { nombre: string } | null; asistencias?: Array<{ id: string; fecha: string; estado: "PENDIENTE" | "ASISTIO" | "AUSENTE" }> };
export type ResultadoImportacionExcel = { procesados: number; creados: number; actualizados: number; eliminadosPorReemplazo: number };
const token = () => { const value = obtenerSesion()?.tokenAcceso; if (!value) throw new Error("La sesión expiró. Inicie sesión nuevamente."); return value; };
export const listarPeriodos = () => solicitarAulas<Periodo[]>("/horario/periodos", token());
export const crearPeriodo = (input: { nombre: string; fechaInicio: string; fechaFin: string; activo: boolean }) =>
  solicitarAulas<Periodo>("/horario/periodos", token(), { method: "POST", body: JSON.stringify(input) });
export const listarClases = (periodoId: string) => solicitarAulas<ClaseApi[]>(`/horario/clases?periodoId=${periodoId}`, token());
export async function importarClase(input: { periodoId: string; aulaId: string; diaSemana: number; horaInicio: string; horaFin: string; docenteNombre: string; docenteDocumento: string; asignaturaNombre: string; asignaturaCodigo: string }) {
  return solicitarAulas("/horario/importar", token(), { method: "POST", body: JSON.stringify({ periodoId: input.periodoId, formato: "JSON_V2", clases: [{ aulaId: input.aulaId, diaSemana: input.diaSemana, horaInicio: input.horaInicio, horaFin: input.horaFin, grupo: "General", docente: { nombre: input.docenteNombre, documento: input.docenteDocumento }, asignatura: { nombre: input.asignaturaNombre, codigo: input.asignaturaCodigo } }] }) });
}

export async function importarHorarioExcel(periodoId: string, archivo: File, reemplazarAnterior = true): Promise<ResultadoImportacionExcel> {
  const formulario = new FormData();
  formulario.append("archivo", archivo);
  formulario.append("periodoId", periodoId);
  formulario.append("reemplazarAnterior", String(reemplazarAnterior));
  return solicitarAulas<ResultadoImportacionExcel>("/horario/importar/excel", token(), { method: "POST", body: formulario });
}

export async function registrarAsistencia(claseId: string, fecha: string, estado: "ASISTIO" | "AUSENTE") {
  const existentes = await solicitarAulas<Array<{ id: string; fecha: string }>>(`/asistencia-docente/clase/${claseId}`, token());
  const existente = existentes.find((item) => item.fecha.slice(0, 10) === fecha);
  if (existente) return solicitarAulas(`/asistencia-docente/${existente.id}`, token(), { method: "PATCH", body: JSON.stringify({ estado }) });
  return solicitarAulas(`/asistencia-docente`, token(), { method: "POST", body: JSON.stringify({ claseId, fecha, estado }) });
}
