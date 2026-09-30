import { obtenerSesion } from "@/features/auth/lib/sesion";
import { solicitarAulas } from "@/features/monitores/api/clienteMonitores";
import type { ObservationType, OperationalObservation } from "@/features/observaciones/types";

type ApiObservation = {
  id: string; aulaId: string | null; ubicacionTexto: string | null; tipo: ObservationType; contenido: string;
  vigenteDesde: string | null; vigenteHasta: string | null; creadoEn: string;
  aula: { codigo: string; ubicacion: string } | null;
  autor: { id: string; nombreCompleto: string } | null;
};

function token() {
  const value = obtenerSesion()?.tokenAcceso;
  if (!value) throw new Error("La sesión expiró. Inicie sesión nuevamente.");
  return value;
}

function map(item: ApiObservation): OperationalObservation {
  return { id: item.id, folio: `OBS-${item.id.slice(0, 8).toUpperCase()}`, roomId: item.aulaId, roomCode: item.aula?.codigo ?? item.ubicacionTexto ?? "Sin ubicación asignada", locationText: item.ubicacionTexto, type: item.tipo, content: item.contenido, createdAt: item.creadoEn, validFrom: item.vigenteDesde, validUntil: item.vigenteHasta, author: item.autor ? { id: item.autor.id, name: item.autor.nombreCompleto } : undefined };
}

export async function listarObservaciones() {
  return (await solicitarAulas<ApiObservation[]>("/observaciones", token())).map(map);
}

export async function crearObservacion(input: { aulaId?: string | null; ubicacionTexto?: string | null; tipo: ObservationType; contenido: string; vigenteDesde: string | null; vigenteHasta: string | null }) {
  return map(await solicitarAulas<ApiObservation>("/observaciones", token(), { method: "POST", body: JSON.stringify(input) }));
}

export async function crearObservaciones(input: { aulaIds: string[]; tipo: ObservationType; contenido: string; vigenteDesde: string | null; vigenteHasta: string | null }) {
  return (await solicitarAulas<ApiObservation[]>("/observaciones/lote", token(), { method: "POST", body: JSON.stringify(input) })).map(map);
}

export async function actualizarObservacion(id: string, input: { aulaId?: string | null; ubicacionTexto?: string | null; tipo: ObservationType; contenido: string; vigenteDesde: string | null; vigenteHasta: string | null }) {
  return map(await solicitarAulas<ApiObservation>(`/observaciones/${id}`, token(), { method: "PATCH", body: JSON.stringify(input) }));
}
