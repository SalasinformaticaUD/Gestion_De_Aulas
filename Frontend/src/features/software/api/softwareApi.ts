import { obtenerSesion } from "@/features/auth/lib/sesion";
import { solicitarAulas } from "@/features/monitores/api/clienteMonitores";
import type { InstalledSoftware, SoftwareAssignment } from "@/features/software/types";

type SoftwareApi = {
  id: string;
  nombre: string;
  version: string;
  descripcion: string | null;
  aulas?: Array<{ aulaId: string; instaladoEn: string }>;
};

function token() {
  const current = obtenerSesion()?.tokenAcceso;
  if (!current) throw new Error("La sesión expiró. Inicie sesión de nuevo.");
  return current;
}

function toSoftware(item: SoftwareApi): InstalledSoftware {
  return { id: item.id, name: item.nombre, version: item.version, description: item.descripcion ?? undefined };
}

export async function cargarSoftware() {
  const data = await solicitarAulas<SoftwareApi[]>("/software", token());
  return {
    software: data.map(toSoftware),
    assignments: data.flatMap((item) => (item.aulas ?? []).map((aula): SoftwareAssignment => ({ roomId: aula.aulaId, softwareId: item.id, installedAt: aula.instaladoEn.slice(0, 10) }))),
  };
}

export async function crearSoftware(input: Omit<InstalledSoftware, "id">) {
  const data = await solicitarAulas<SoftwareApi>("/software", token(), { method: "POST", body: JSON.stringify({ nombre: input.name, version: input.version, descripcion: input.description }) });
  return toSoftware(data);
}

export async function actualizarSoftware(id: string, input: Omit<InstalledSoftware, "id">) {
  const data = await solicitarAulas<SoftwareApi>(`/software/${id}`, token(), { method: "PATCH", body: JSON.stringify({ nombre: input.name, version: input.version, descripcion: input.description }) });
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
