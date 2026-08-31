import { obtenerSesion } from "@/features/auth/lib/sesion";
import { solicitarAulas } from "@/features/monitores/api/clienteMonitores";
import type { Usuario } from "@/features/usuarios/types";
type ApiUser = { id: string; nombreCompleto: string; nombreUsuario: string; correo: string; cargo: string | null; estado: Usuario["estado"]; dependencia: { nombre: string } | null; roles: Array<{ rol: { nombre: string } }> };
const token = () => { const value = obtenerSesion()?.tokenAcceso; if (!value) throw new Error("La sesión expiró. Inicie sesión nuevamente."); return value; };
const map = (value: ApiUser): Usuario => ({ id: value.id, nombreCompleto: value.nombreCompleto, nombreUsuario: value.nombreUsuario, correo: value.correo, cargo: value.cargo ?? "", dependencia: value.dependencia?.nombre ?? "Sin dependencia", estado: value.estado, permisos: value.roles.map((entry) => entry.rol.nombre) });
export const listarUsuarios = async () => (await solicitarAulas<ApiUser[]>("/usuarios", token())).map(map);
export const crearUsuario = (data: { nombreCompleto: string; nombreUsuario: string; correo: string; password: string; cargo?: string }) => solicitarAulas<ApiUser>("/usuarios", token(), { method: "POST", body: JSON.stringify(data) });
export const actualizarUsuario = (id: string, data: { nombreCompleto: string; nombreUsuario: string; correo: string; cargo?: string; password?: string }) => solicitarAulas<ApiUser>(`/usuarios/${id}`, token(), { method: "PATCH", body: JSON.stringify(data) });
