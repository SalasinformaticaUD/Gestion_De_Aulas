import { AuthTokenService } from './auth-token.service';
import { JwtService } from '@nestjs/jwt';

describe('AuthTokenService', () => {
  const usuarioId = '00000000-0000-4000-8000-000000000001';
  const service = new AuthTokenService(new JwtService());

  beforeAll(() => {
    process.env.AUTH_TOKEN_SECRET = 'secreto-exclusivo-para-pruebas';
  });

  afterAll(() => {
    delete process.env.AUTH_TOKEN_SECRET;
  });

  it('firma y valida un token con usuario y expiracion', () => {
    const result = service.sign({
      sub: usuarioId,
      nombreUsuario: 'operador',
      dependenciaId: null,
      roles: ['OPERADOR'],
      permisos: ['AULAS_LEER'],
    });
    const payload = service.verify(result.accessToken);

    expect(payload).toMatchObject({ sub: usuarioId });
    expect(payload!.exp).toBeGreaterThan(payload!.iat);
    expect(result.expiresIn).toBeGreaterThan(0);
  });

  it('rechaza un token alterado', () => {
    const { accessToken } = service.sign({
      sub: usuarioId,
      nombreUsuario: 'operador',
      dependenciaId: null,
      roles: ['OPERADOR'],
      permisos: ['AULAS_LEER'],
    });
    const altered = `${accessToken.slice(0, -1)}x`;
    expect(service.verify(altered)).toBeNull();
  });
});
