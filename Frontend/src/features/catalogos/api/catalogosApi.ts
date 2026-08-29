import { obtenerSesion } from "@/features/auth/lib/sesion";
import { solicitarAulas } from "@/features/monitores/api/clienteMonitores";

export type DocenteCatalogo = { id: string; nombre: string; correo?: string | null };
export type EstudianteCatalogo = { id: string; codigo: string; nombre: string; correo?: string | null };

function token() { const value = obtenerSesion()?.tokenAcceso; if (!value) throw new Error("La sesión expiró. Inicie sesión nuevamente."); return value; }
export const listarDocentes = () => solicitarAulas<DocenteCatalogo[]>("/docentes", token());
export const listarEstudiantes = () => solicitarAulas<EstudianteCatalogo[]>("/estudiantes", token());
