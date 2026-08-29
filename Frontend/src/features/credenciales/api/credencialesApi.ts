import { obtenerSesion } from "@/features/auth/lib/sesion";
import { solicitarAulas } from "@/features/monitores/api/clienteMonitores";
const token = () => { const value = obtenerSesion()?.tokenAcceso; if (!value) throw new Error("La sesión expiró. Inicie sesión nuevamente."); return value; };
export type CredencialApi = { id: string; nombre: string; categoria: string; usuario: string | null; descripcion: string | null; estado: "ACTIVA" | "INACTIVA"; creadoEn: string; actualizadoEn: string; accesos: Array<{ usuarioId: string; puedeVer: boolean; puedeEditar: boolean }> };
export const listarCredenciales = () => solicitarAulas<CredencialApi[]>("/credenciales", token());
export const crearCredencial = (data: { nombre: string; categoria: string; usuario?: string; secreto: string; descripcion?: string }) => solicitarAulas<CredencialApi>("/credenciales", token(), { method: "POST", body: JSON.stringify(data) });
export const cambiarEstadoCredencial = (id: string, estado: "ACTIVA" | "INACTIVA") => solicitarAulas<CredencialApi>(`/credenciales/${id}/estado`, token(), { method: "PATCH", body: JSON.stringify({ estado, motivoCambio: "Actualizado desde operación" }) });
