import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { EstadoCuenta } from '../../generated/prisma/enums.js';
import { AuthService } from './auth.service';
import { PasswordHashService } from './password-hash.service';

describe('AuthService', () => {
  const passwords = new PasswordHashService();
  const prisma = {
    usuario: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  };
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
    fotoPerfil: null,
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

  it('autoriza a un monitor en los aplicativos definidos por sus permisos', async () => {
    prisma.usuario.findFirst.mockResolvedValue({
      ...usuario,
      roles: [
        {
          rol: {
            nombre: 'MONITOR',
            permisos: [
              {
                permiso: {
                  codigo: 'AULAS_LEER',
                  modulo: { codigo: 'AULAS', activo: true },
                },
              },
              {
                permiso: {
                  codigo: 'MONITORES_LEER',
                  modulo: { codigo: 'MONITORES', activo: true },
                },
              },
            ],
          },
        },
      ],
    });

    const result = await service.login({ identificador: 'prueba', password });

    expect(result.aplicaciones.puedeAccederAulas).toBe(true);
    expect(result.aplicaciones.puedeAccederMonitores).toBe(true);
    expect(result.usuario.modulos).toEqual(expect.arrayContaining(['AULAS', 'MONITORES']));
    expect(result.usuario.permisos).toEqual(expect.arrayContaining(['AULAS_LEER', 'MONITORES_LEER']));
  });

  it('guarda una foto de perfil válida como data URL', async () => {
    const foto = 'data:image/png;base64,aGVsbG8=';
    prisma.usuario.update.mockResolvedValue({ fotoPerfil: foto });

    await expect(service.actualizarFotoPerfil(usuario.id, foto)).resolves.toEqual({ fotoPerfil: foto });
    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { fotoPerfil: foto } }),
    );
  });

  it('acepta un GIF animado como foto de perfil', async () => {
    const gif = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
    prisma.usuario.update.mockResolvedValue({ fotoPerfil: gif });

    await expect(service.actualizarFotoPerfil(usuario.id, gif)).resolves.toEqual({ fotoPerfil: gif });
  });

  it('rechaza una foto que no sea una data URL de imagen', async () => {
    await expect(service.actualizarFotoPerfil(usuario.id, 'https://ejemplo.test/foto.png')).rejects.toBeInstanceOf(BadRequestException);
  });
});
