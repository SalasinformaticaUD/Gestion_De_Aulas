import { obtenerSesion } from "@/features/auth/lib/sesion";
import { solicitarAulas } from "@/features/monitores/api/clienteMonitores";
import type { ObservationType, OperationalObservation } from "@/features/observaciones/types";

type ApiObservation = {
  id: string; aulaId: string; tipo: ObservationType; contenido: string;
  vigenteHasta: string | null; creadoEn: string;
  aula: { codigo: string; ubicacion: string };
};

function token() {
  const value = obtenerSesion()?.tokenAcceso;
  if (!value) throw new Error("La sesión expiró. Inicie sesión nuevamente.");
  return value;
}

function map(item: ApiObservation): OperationalObservation {
  return { id: item.id, folio: `OBS-${item.id.slice(0, 8).toUpperCase()}`, roomId: item.aulaId, roomCode: item.aula.codigo, type: item.tipo, content: item.contenido, createdAt: item.creadoEn, validUntil: item.vigenteHasta };
}

export async function listarObservaciones() {
  return (await solicitarAulas<ApiObservation[]>("/observaciones", token())).map(map);
}

export async function crearObservacion(input: { aulaId: string; tipo: ObservationType; contenido: string; vigenteHasta: string | null }) {
  return map(await solicitarAulas<ApiObservation>("/observaciones", token(), { method: "POST", body: JSON.stringify(input) }));
}

export async function actualizarObservacion(id: string, input: { aulaId: string; tipo: ObservationType; contenido: string; vigenteHasta: string | null }) {
  return map(await solicitarAulas<ApiObservation>(`/observaciones/${id}`, token(), { method: "PATCH", body: JSON.stringify(input) }));
}
