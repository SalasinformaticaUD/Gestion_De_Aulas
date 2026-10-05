import { obtenerSesion } from "@/features/auth/lib/sesion";
import { solicitarAulas } from "@/features/monitores/api/clienteMonitores";
import type { Usuario } from "@/features/usuarios/types";

type PerfilMonitores = "ADMIN" | "LIDER" | null;
type DependenciaMonitores = "PHYSICS" | "INFORMATICS_LABS" | "ELECTRICAL" | null;
type ApiUser = {
  id: string; nombreCompleto: string; nombreUsuario: string; correo: string;
  cargo: string | null; estado: Usuario["estado"]; dependencia: { nombre: string } | null;
  perfilMonitores: PerfilMonitores; dependenciaMonitores: DependenciaMonitores;
  roles: Array<{ rol: { id: string; nombre: string } }>;
};
export type PermisoCatalogo = { id: string; codigo: string; descripcion: string | null; modulo: { codigo: string; nombre: string } };
export type RolCatalogo = {
  id: string; nombre: string; descripcion: string | null;
  permisos: Array<{ permiso: PermisoCatalogo }>;
};
export type CargoCatalogo = { id: string; nombre: string; descripcion: string | null; activo: boolean };
type RolPayload = { nombre?: string; descripcion?: string; permisoIds?: string[] };
const token = () => { const value = obtenerSesion()?.tokenAcceso; if (!value) throw new Error("La sesión expiró. Inicie sesión nuevamente."); return value; };
const map = (value: ApiUser): Usuario => ({ id: value.id, nombreCompleto: value.nombreCompleto, nombreUsuario: value.nombreUsuario, correo: value.correo, cargo: value.cargo ?? "", dependencia: value.dependencia?.nombre ?? "Sin dependencia", estado: value.estado, permisos: value.roles.map((entry) => entry.rol.nombre), perfilMonitores: value.perfilMonitores, dependenciaMonitores: value.dependenciaMonitores });
export const listarUsuarios = async () => (await solicitarAulas<ApiUser[]>("/usuarios", token())).map(map);
export const listarRoles = () => solicitarAulas<RolCatalogo[]>("/roles", token());
export const listarPermisos = () => solicitarAulas<PermisoCatalogo[]>("/permisos", token());
export const crearRol = (data: Required<Pick<RolPayload, "nombre" | "permisoIds">> & RolPayload) => solicitarAulas<RolCatalogo>("/roles", token(), { method: "POST", body: JSON.stringify(data) });
export const actualizarRol = (id: string, data: RolPayload) => solicitarAulas<RolCatalogo>(`/roles/${id}`, token(), { method: "PATCH", body: JSON.stringify(data) });
export const listarCargos = () => solicitarAulas<CargoCatalogo[]>("/cargos", token());
export const crearCargo = (data: { nombre: string; descripcion?: string }) => solicitarAulas<CargoCatalogo>("/cargos", token(), { method: "POST", body: JSON.stringify(data) });
export const actualizarCargo = (id: string, data: { nombre?: string; descripcion?: string; activo?: boolean }) => solicitarAulas<CargoCatalogo>(`/cargos/${id}`, token(), { method: "PATCH", body: JSON.stringify(data) });
type UsuarioPayload = { nombreCompleto: string; nombreUsuario: string; correo: string; cargo?: string; password?: string; rolIds?: string[]; perfilMonitores?: PerfilMonitores; dependenciaMonitores?: DependenciaMonitores };
export const crearUsuario = (data: UsuarioPayload & { password: string }) => solicitarAulas<ApiUser>("/usuarios", token(), { method: "POST", body: JSON.stringify(data) });
export const actualizarUsuario = (id: string, data: UsuarioPayload) => solicitarAulas<ApiUser>(`/usuarios/${id}`, token(), { method: "PATCH", body: JSON.stringify(data) });
