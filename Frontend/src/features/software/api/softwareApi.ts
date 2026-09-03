import { obtenerSesion } from "@/features/auth/lib/sesion";
import { solicitarAulas } from "@/features/monitores/api/clienteMonitores";
import type { InstalledSoftware, SoftwareAssignment, SoftwareStatus } from "@/features/software/types";

type SoftwareApi = {
  id: string;
  nombre: string;
  version: string;
  descripcion: string | null;
  estado: SoftwareStatus;
  aulas?: Array<{ aulaId: string; instaladoEn: string }>;
};

function token() {
  const current = obtenerSesion()?.tokenAcceso;
  if (!current) throw new Error("La sesión expiró. Inicie sesión de nuevo.");
  return current;
}

function toSoftware(item: SoftwareApi): InstalledSoftware {
  return { id: item.id, name: item.nombre, version: item.version, description: item.descripcion ?? undefined, status: item.estado };
}

export async function cargarSoftware() {
  const data = await solicitarAulas<SoftwareApi[]>("/software", token());
  return {
    software: data.map(toSoftware),
    assignments: data.flatMap((item) => (item.aulas ?? []).map((aula): SoftwareAssignment => ({ roomId: aula.aulaId, softwareId: item.id, installedAt: aula.instaladoEn.slice(0, 10) }))),
  };
}

export async function crearSoftware(input: Omit<InstalledSoftware, "id">) {
  const data = await solicitarAulas<SoftwareApi>("/software", token(), { method: "POST", body: JSON.stringify({ nombre: input.name, version: input.version, descripcion: input.description, estado: input.status }) });
  return toSoftware(data);
}

export async function actualizarSoftware(id: string, input: Omit<InstalledSoftware, "id">) {
  const data = await solicitarAulas<SoftwareApi>(`/software/${id}`, token(), { method: "PATCH", body: JSON.stringify({ nombre: input.name, version: input.version, descripcion: input.description, estado: input.status }) });
  return toSoftware(data);
}

export async function eliminarSoftware(id: string) {
  await solicitarAulas(`/software/${id}`, token(), { method: "DELETE" });
}

export async function asignarSoftware(roomId: string, softwareId: string, installedAt: string) {
  await solicitarAulas(`/software/aulas/${roomId}`, token(), { method: "POST", body: JSON.stringify({ softwareId, instaladoEn: installedAt || undefined }) });
}

export async function retirarSoftware(roomId: string, softwareId: string) {
  await solicitarAulas(`/software/aulas/${roomId}/${softwareId}`, token(), { method: "DELETE" });
}

export type ResultadoImportacionSoftwareExcel = {
  resumen: { totalRegistros: number; registrosProcesados: number; registrosConError: number; resultado: "EXITOSA" | "PARCIAL" | "FALLIDA"; asociacionesReemplazadas: number; reemplazoAplicado: boolean };
  errores: Array<{ fila: number; aulaCodigo: string; nombre: string; version: string; error: string }>;
};

export async function importarSoftwareExcel(archivo: File) {
  const formulario = new FormData();
  formulario.append("archivo", archivo);
  return solicitarAulas<ResultadoImportacionSoftwareExcel>("/software/importaciones/excel", token(), { method: "POST", body: formulario });
}
