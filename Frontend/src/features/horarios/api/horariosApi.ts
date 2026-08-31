import { obtenerSesion } from "@/features/auth/lib/sesion";
import { solicitarAulas } from "@/features/monitores/api/clienteMonitores";

export type Periodo = { id: string; nombre: string; activo: boolean };
type ClaseApi = { id: string; aulaId: string; diaSemana: number; horaInicio: string; horaFin: string; asignatura: { nombre: string }; docente: { nombre: string } };
const token = () => { const value = obtenerSesion()?.tokenAcceso; if (!value) throw new Error("La sesión expiró. Inicie sesión nuevamente."); return value; };
export const listarPeriodos = () => solicitarAulas<Periodo[]>("/horario/periodos", token());
export const crearPeriodo = (input: { nombre: string; fechaInicio: string; fechaFin: string; activo: boolean }) =>
  solicitarAulas<Periodo>("/horario/periodos", token(), { method: "POST", body: JSON.stringify(input) });
export const listarClases = (periodoId: string) => solicitarAulas<ClaseApi[]>(`/horario/clases?periodoId=${periodoId}`, token());
export async function importarClase(input: { periodoId: string; aulaId: string; diaSemana: number; horaInicio: string; horaFin: string; docenteNombre: string; docenteDocumento: string; asignaturaNombre: string; asignaturaCodigo: string }) {
  return solicitarAulas("/horario/importar", token(), { method: "POST", body: JSON.stringify({ periodoId: input.periodoId, formato: "JSON_V2", clases: [{ aulaId: input.aulaId, diaSemana: input.diaSemana, horaInicio: input.horaInicio, horaFin: input.horaFin, grupo: "General", docente: { nombre: input.docenteNombre, documento: input.docenteDocumento }, asignatura: { nombre: input.asignaturaNombre, codigo: input.asignaturaCodigo } }] }) });
}
