import { solicitarAulas } from "@/features/monitores/api/clienteMonitores";
import { obtenerSesion } from "@/features/auth/lib/sesion";
import type { Usuario, UsuarioPayload } from "../types";

const token = () => obtenerSesion()?.tokenAcceso;
export const usuariosApi = {
  listar: () => solicitarAulas<Usuario[]>("/usuarios", token()),
  crear: (payload: UsuarioPayload) => solicitarAulas<Usuario>("/usuarios", token(), { method:"POST", body:JSON.stringify(payload) }),
  actualizar: (id:string, payload: Partial<UsuarioPayload>) => solicitarAulas<Usuario>(`/usuarios/${id}`, token(), { method:"PATCH", body:JSON.stringify(payload) }),
  desactivar: (id:string) => solicitarAulas<Usuario>(`/usuarios/${id}`, token(), { method:"DELETE" }),
};
