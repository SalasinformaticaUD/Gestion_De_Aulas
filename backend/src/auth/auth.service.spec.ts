import { UnauthorizedException } from '@nestjs/common';
import { EstadoCuenta } from '../../generated/prisma/enums.js';
import { AuthService } from './auth.service';
import { PasswordHashService } from './password-hash.service';

describe('AuthService', () => {
  const passwords = new PasswordHashService();
  const prisma = { usuario: { findFirst: jest.fn(), findUnique: jest.fn() } };
  const tokens = {
    sign: jest.fn(() => ({ accessToken: 'token', expiresIn: 3600 })),
  };
  const service = new AuthService(prisma as never, passwords, tokens as never);
  const password = 'Clave-segura-2026';
  const usuario = {
    id: '00000000-0000-4000-8000-000000000001',
    nombreCompleto: 'Usuario Prueba',
    nombreUsuario: 'prueba',
    correo: 'prueba@example.test',
    passwordHash: passwords.hash(password),
    cargo: null,
    estado: EstadoCuenta.ACTIVA,
    dependencia: null,
    roles: [{ rol: { nombre: 'OPERADOR', permisos: [] } }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.usuario.findFirst.mockResolvedValue(usuario);
  });

  it('inicia sesión sin incluir el hash en la respuesta', async () => {
    const result = await service.login({ identificador: 'prueba', password });

    expect(result.usuario).not.toHaveProperty('passwordHash');
    expect(result.aplicaciones.puedeAccederMonitores).toBe(false);
    expect(tokens.sign).toHaveBeenCalledWith(
      expect.objectContaining({ sub: usuario.id, nombreUsuario: 'prueba' }),
    );
  });

  it('rechaza una contraseña inválida', async () => {
    await expect(
      service.login({ identificador: 'prueba', password: 'incorrecta' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
