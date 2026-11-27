import { obtenerSesion } from "@/features/auth/lib/sesion";
import { descargarAulas, solicitarAulas } from "@/features/monitores/api/clienteMonitores";
import type { FreePractice, PracticeResponsible, PracticeStudent } from "@/features/practicas-libres/types";
type ApiPractice = { id: string; estado: FreePractice["status"]; inicio: string; finEstimada: string; finReal: string | null; aulaId: string; responsableTipo: FreePractice["responsibleType"]; softwareSolicitado: string | null; aula: { codigo: string }; estudiante: { id: string; codigo: string; nombre: string; correo: string | null } | null; docente?: { id: string; documento: string | null; nombre: string; correo: string | null } | null; atendidoPor?: { id: string; nombreCompleto: string } | null };
type ApiResponsible = { id: string; nombreCompleto: string; nombreUsuario: string; cargo: string | null };
const auth = () => { const token = obtenerSesion()?.tokenAcceso; if (!token) throw new Error("La sesión expiró. Inicie sesión nuevamente."); return token; };
const map = (p: ApiPractice): FreePractice => { const requesterType = p.estudiante ? "ESTUDIANTE" : "DOCENTE"; const responsable = p.estudiante ? { id: p.estudiante.id, code: p.estudiante.codigo, name: p.estudiante.nombre, email: p.estudiante.correo ?? undefined } : { id: p.docente?.id ?? "", code: p.docente?.documento ?? "Sin documento", name: p.docente?.nombre ?? "Docente responsable", email: p.docente?.correo ?? undefined }; return { id: p.id, requesterType, status: p.estado, roomId: p.aulaId, roomCode: p.aula.codigo, start: p.inicio, estimatedEnd: p.finEstimada, actualEnd: p.finReal ?? undefined, responsibleType: p.responsableTipo, attendedBy: p.atendidoPor?.nombreCompleto, requestedSoftware: p.softwareSolicitado ?? "Sin especificar", student: { ...responsable, activeFine: false } }; };
export type ResumenPracticas = { activos: number; vencidos: number; finalizados: number; cancelados: number; total: number };
export type PaginaPracticas = { datos: FreePractice[]; meta: { pagina: number; limite: number; total: number; totalPaginas: number }; resumen: ResumenPracticas };
type ApiPaginaPracticas = { datos: ApiPractice[]; meta: PaginaPracticas["meta"]; resumen: ResumenPracticas };
const mapPagina = (pagina: ApiPaginaPracticas): PaginaPracticas => ({ ...pagina, datos: pagina.datos.map(map) });
export const listarPracticas = async () => (await solicitarAulas<ApiPractice[]>("/practicas-libres", auth())).map(map);
export const listarPracticasActuales = async () => mapPagina(await solicitarAulas<ApiPaginaPracticas>("/practicas-libres?vista=actuales", auth()));
export const listarHistorialPracticas = async (pagina = 1, limite = 50) => mapPagina(await solicitarAulas<ApiPaginaPracticas>(`/practicas-libres?vista=historial&pagina=${pagina}&limite=${limite}`, auth()));
export const crearPractica = async (input: { codigoEstudiante: string; nombreEstudiante: string; correoEstudiante?: string; aulaId: string; softwareId?: string; softwareSolicitado: string; responsableTipo: FreePractice["responsibleType"]; atendidoPorId?: string; inicio: string; finEstimada: string; responsables?: Array<{ tipo: "ESTUDIANTE" | "DOCENTE"; documento: string; nombre: string; correo?: string; proyecto?: string }> }) => { const response = await solicitarAulas<ApiPractice[]>("/practicas-libres", auth(), { method: "POST", body: JSON.stringify(input) }); return map(response[0]); };
export const listarResponsablesPracticas = async () => (await solicitarAulas<ApiResponsible[]>("/practicas-libres/responsables", auth())).map((item): PracticeResponsible => ({ id: item.id, name: item.nombreCompleto, username: item.nombreUsuario, role: item.cargo ?? undefined }));
export const finalizarPractica = async (id: string, cumplioReglas: boolean, observacionesIncumplimiento?: string) => map(await solicitarAulas<ApiPractice>(`/practicas-libres/${id}/finalizar`, auth(), { method: "PATCH", body: JSON.stringify({ cumplioReglas, observacionesIncumplimiento }) }));
export const cancelarPractica = async (id: string) => map(await solicitarAulas<ApiPractice>(`/practicas-libres/${id}/cancelar`, auth(), { method: "PATCH", body: JSON.stringify({}) }));
export const descargarFichasPracticasMes = (mes: string) => descargarAulas(`/reportes/practicas-libres/pdf/mes?mes=${encodeURIComponent(mes)}`, auth());
export const descargarHistorialPracticasExcel = (mes: string) => descargarAulas(`/reportes/practicas-libres/excel/mes?mes=${encodeURIComponent(mes)}`, auth());
export async function buscarEstudiantePractica(codigo: string) {
  try { const item = await solicitarAulas<{ id: string; codigo: string; nombre: string; correo: string | null; multas: unknown[]; practicas: unknown[] }>(`/practicas-libres/estudiantes/${encodeURIComponent(codigo)}`, auth()); return { id: item.id, code: item.codigo, name: item.nombre, email: item.correo ?? undefined, activeFine: item.multas.length > 0, activePractice: item.practicas.length > 0 }; }
  catch (error) { if (typeof error === "object" && error && "estado" in error && (error as { estado: number }).estado === 404) return null; throw error; }
}
export async function buscarDocentePractica(documento: string) {
  try { const item = await solicitarAulas<{ id: string; documento: string | null; nombre: string; proyecto: string | null; practicasLibres: unknown[] }>(`/practicas-libres/docentes/${encodeURIComponent(documento)}`, auth()); return { id: item.id, code: item.documento ?? documento, name: item.nombre, project: item.proyecto ?? undefined, activePractice: item.practicasLibres.length > 0 }; }
  catch (error) { if (typeof error === "object" && error && "estado" in error && (error as { estado: number }).estado === 404) return null; throw error; }
}
export async function crearEstudianteDesdePractica(input: { codigo: string; nombre: string; correo: string }) {
  const item = await solicitarAulas<{ id: string; codigo: string; nombre: string; correo: string | null }>("/practicas-libres/estudiantes", auth(), { method: "POST", body: JSON.stringify(input) });
  return { id: item.id, code: item.codigo, name: item.nombre, email: item.correo ?? undefined, activeFine: false } satisfies PracticeStudent;
}
