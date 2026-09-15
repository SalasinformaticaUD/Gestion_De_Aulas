import { obtenerSesion } from "@/features/auth/lib/sesion";
import { solicitarAulas } from "@/features/monitores/api/clienteMonitores";
import type { CleaningRecord } from "@/features/limpieza/types";

type CleaningStatus = "REALIZADA" | "NOVEDAD";
type ApiRecord = { id: string; aulaId: string; realizadaEn: string; estado: CleaningStatus; observacion: string | null; aula: { codigo: string } };
const auth = () => { const token = obtenerSesion()?.tokenAcceso; if (!token) throw new Error("La sesión expiró. Inicie sesión nuevamente."); return token; };
const map = (value: ApiRecord): CleaningRecord => ({ id: value.id, folio: `LIM-${value.id.slice(0, 8).toUpperCase()}`, roomId: value.aulaId, roomCode: value.aula.codigo, performedAt: value.realizadaEn, status: value.estado, observation: value.observacion ?? undefined });
export const listarLimpiezas = async () => (await solicitarAulas<ApiRecord[]>("/limpieza-aulas", auth())).map(map);
export const crearLimpieza = async (input: { aulaId: string; realizadaEn: string; estado: CleaningStatus; observacion?: string }) => map(await solicitarAulas<ApiRecord>("/limpieza-aulas", auth(), { method: "POST", body: JSON.stringify(input) }));
export const actualizarLimpieza = async (id: string, input: { aulaId: string; realizadaEn: string; estado: CleaningStatus; observacion?: string; limpiarObservacion?: boolean }) => map(await solicitarAulas<ApiRecord>(`/limpieza-aulas/${id}`, auth(), { method: "PATCH", body: JSON.stringify(input) }));
export const eliminarLimpieza = async (id: string) => solicitarAulas<void>(`/limpieza-aulas/${id}`, auth(), { method: "DELETE" });
export type CleaningSuggestion = { aula: { id: string; codigo: string; ubicacion: string }; ultimaLimpieza: string | null; diasSinLimpieza: number | null; estadoDisponibilidad: "disponible" | "ocupada" | "reservada" | "mantenimiento" | "bloqueada"; enClase: boolean; motivo: string };
export type CleaningMatrix = { desde: string; hasta: string; fechas: string[]; aulas: Array<{ id: string; codigo: string; ubicacion: string; jornadas: Array<{ fecha: string; realizada: boolean; registros: Array<{ id: string; realizadaEn: string; estado: CleaningStatus; observacion: string | null }> }> }> };
export const consultarSugerenciasLimpieza = async (fecha: string, limite = 100) => (await solicitarAulas<{ sugerencias: CleaningSuggestion[] }>(`/limpieza-aulas/sugerencias?fecha=${encodeURIComponent(fecha)}&limite=${limite}`, auth())).sugerencias;
export const consultarMatrizLimpieza = (desde: string, hasta: string) => solicitarAulas<CleaningMatrix>(`/limpieza-aulas/matriz?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`, auth());
