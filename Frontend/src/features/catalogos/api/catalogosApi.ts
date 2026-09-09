import { obtenerSesion } from "@/features/auth/lib/sesion";
import { solicitarAulas } from "@/features/monitores/api/clienteMonitores";

export type DocenteCatalogo = { id: string; nombre: string; documento?: string | null; correo?: string | null };
export type EstudianteCatalogo = { id: string; codigo: string; nombre: string; correo?: string | null };

function token() { const value = obtenerSesion()?.tokenAcceso; if (!value) throw new Error("La sesión expiró. Inicie sesión nuevamente."); return value; }
export const listarDocentes = () => solicitarAulas<DocenteCatalogo[]>("/docentes", token());
export const listarEstudiantes = () => solicitarAulas<EstudianteCatalogo[]>("/estudiantes", token());

export async function buscarDocentesPorNombre(nombre: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ nombre: nombre.trim() });
  return solicitarAulas<DocenteCatalogo[]>(
    `/prestamos-audiovisuales/docentes?${params.toString()}`,
    token(),
    { signal },
  );
}
