export type UsuarioAutenticado = {
  id: string;
  nombreCompleto: string;
  nombreUsuario: string;
  correo: string;
  cargo: string | null;
  dependencia: { id: string; nombre: string } | null;
  roles: string[];
  permisos: string[];
  modulos: string[];
};

export type TokenPayload = {
  sub: string;
  iat: number;
  exp: number;
};
