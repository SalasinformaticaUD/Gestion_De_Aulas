import { obtenerSesion } from "@/features/auth/lib/sesion";
import { solicitarAulas } from "@/features/monitores/api/clienteMonitores";
import type { CleaningRecord } from "@/features/limpieza/types";

type ApiRecord = { id: string; aulaId: string; realizadaEn: string; observacion: string | null; aula: { codigo: string } };
const auth = () => { const token = obtenerSesion()?.tokenAcceso; if (!token) throw new Error("La sesión expiró. Inicie sesión nuevamente."); return token; };
const map = (value: ApiRecord): CleaningRecord => ({ id: value.id, folio: `LIM-${value.id.slice(0, 8).toUpperCase()}`, roomId: value.aulaId, roomCode: value.aula.codigo, performedAt: value.realizadaEn, observation: value.observacion ?? undefined });
export const listarLimpiezas = async () => (await solicitarAulas<ApiRecord[]>("/limpieza-aulas", auth())).map(map);
export const crearLimpieza = async (input: { aulaId: string; realizadaEn: string; observacion?: string }) => map(await solicitarAulas<ApiRecord>("/limpieza-aulas", auth(), { method: "POST", body: JSON.stringify(input) }));
export const actualizarLimpieza = async (id: string, input: { aulaId: string; realizadaEn: string; observacion?: string }) => map(await solicitarAulas<ApiRecord>(`/limpieza-aulas/${id}`, auth(), { method: "PATCH", body: JSON.stringify(input) }));
