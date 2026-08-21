import type { UsuarioAutenticado } from '../auth.types';

export class AuthResponseDto {
  accessToken!: string;
  expiresIn!: number;
  tokenType!: 'Bearer';
  usuario!: UsuarioAutenticado;
  aplicaciones!: {
    puedeAccederAulas: boolean;
    puedeAccederMonitores: boolean;
    urlMonitores: string | null;
  };
}
