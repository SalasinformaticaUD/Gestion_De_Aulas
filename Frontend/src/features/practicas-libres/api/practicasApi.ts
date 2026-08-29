import { obtenerSesion } from "@/features/auth/lib/sesion";
import { solicitarAulas } from "@/features/monitores/api/clienteMonitores";
import type { FreePractice } from "@/features/practicas-libres/types";
type ApiPractice = { id: string; estado: FreePractice["status"]; inicio: string; finEstimada: string; finReal: string | null; aulaId: string; aula: { codigo: string }; estudiante: { id: string; codigo: string; nombre: string; correo: string | null } };
const auth = () => { const token = obtenerSesion()?.tokenAcceso; if (!token) throw new Error("La sesión expiró. Inicie sesión nuevamente."); return token; };
const map = (p: ApiPractice): FreePractice => ({ id: p.id, status: p.estado, roomId: p.aulaId, roomCode: p.aula.codigo, start: p.inicio, estimatedEnd: p.finEstimada, actualEnd: p.finReal ?? undefined, student: { id: p.estudiante.id, code: p.estudiante.codigo, name: p.estudiante.nombre, email: p.estudiante.correo ?? undefined, activeFine: false } });
export const listarPracticas = async () => (await solicitarAulas<ApiPractice[]>("/practicas-libres", auth())).map(map);
export const crearPractica = async (input: { codigoEstudiante: string; nombreEstudiante: string; correoEstudiante?: string; aulaId: string; inicio: string; finEstimada: string }) => map(await solicitarAulas<ApiPractice>("/practicas-libres", auth(), { method: "POST", body: JSON.stringify(input) }));
export const finalizarPractica = async (id: string) => map(await solicitarAulas<ApiPractice>(`/practicas-libres/${id}/finalizar`, auth(), { method: "PATCH", body: JSON.stringify({}) }));
export const cancelarPractica = async (id: string) => map(await solicitarAulas<ApiPractice>(`/practicas-libres/${id}/cancelar`, auth(), { method: "PATCH", body: JSON.stringify({}) }));
export async function buscarEstudiantePractica(codigo: string) {
  try { const item = await solicitarAulas<{ id: string; codigo: string; nombre: string; correo: string | null; multas: unknown[] }>(`/practicas-libres/estudiantes/${encodeURIComponent(codigo)}`, auth()); return { id: item.id, code: item.codigo, name: item.nombre, email: item.correo ?? undefined, activeFine: item.multas.length > 0 }; }
  catch (error) { if (typeof error === "object" && error && "estado" in error && (error as { estado: number }).estado === 404) return null; throw error; }
}
