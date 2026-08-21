import type { Request } from 'express';
import { UsuarioAutenticado } from './auth.types';

export type RequestConUsuario = Request & {
  user?: UsuarioAutenticado;
};
