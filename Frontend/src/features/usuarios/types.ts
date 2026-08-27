export type UsuarioEstado = "ACTIVA" | "INACTIVA";
export type Usuario = { id:string; nombreCompleto:string; nombreUsuario:string; correo:string; cargo:string; dependencia:string; estado:UsuarioEstado; permisos:string[] };
export type UsuarioPayload = Omit<Usuario,"id"|"estado"|"permisos"> & { password?:string; dependenciaId?:string; rolIds?:string[] };
