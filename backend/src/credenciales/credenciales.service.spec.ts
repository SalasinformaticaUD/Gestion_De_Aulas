import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CredencialesService } from './credenciales.service';
import { CredencialesCifradoService } from './credenciales-cifrado.service';

describe('CredencialesService', () => {
  const usuarioId = '00000000-0000-4000-8000-000000000001';
  const otroId = '00000000-0000-4000-8000-000000000002';
  const secreto = new CredencialesCifradoService();
  const prisma = {
    usuario: {
      findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue({ roles: [] }),
    },
    credencialOperativa: {
      findMany: jest.fn<() => Promise<unknown[]>>(),
      findUnique: jest.fn<() => Promise<unknown>>(),
      update: jest.fn<() => Promise<unknown>>(),
      delete: jest.fn<() => Promise<unknown>>(),
    },
    secretoCredencial: {
      findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue(null),
      update: jest.fn<() => Promise<unknown>>(),
    },
  };
  const auditoria = {
    registrar: jest
      .fn<
        (evento: {
          accion: string;
          datosNuevos?: Record<string, unknown>;
        }) => Promise<void>
      >()
      .mockResolvedValue(undefined),
  };
  const auth = { verifyCurrentPassword: jest.fn().mockResolvedValue(true) };
  let service: CredencialesService;
  beforeEach(() => {
    process.env.CREDENTIALS_ENCRYPTION_KEY =
      'clave-de-prueba-de-credenciales-con-entropia-suficiente';
    jest.clearAllMocks();
    service = new CredencialesService(
      prisma as never,
      secreto,
      auditoria as never,
      auth as never,
    );
  });
  const credencial = (
    accesos = [{ usuarioId, puedeVer: true, puedeEditar: true }],
  ) => ({
    id: '00000000-0000-4000-8000-000000000003',
    nombre: 'Servidor',
    secretoCifrado: secreto.cifrar('clave-real'),
    descripcion: null,
    estado: 'ACTIVA',
    creadoEn: new Date(),
    actualizadoEn: new Date(),
    accesos,
  });
  it('no expone el secreto cifrado al consultar metadata', async () => {
    prisma.credencialOperativa.findMany.mockResolvedValue([credencial()]);
    const resultado = await service.findAll({}, usuarioId);
    expect(resultado[0]).not.toHaveProperty('secretoCifrado');
  });
  it('solo revela secretos a responsables autorizados y audita sin incluirlos', async () => {
    prisma.credencialOperativa.findUnique.mockResolvedValue(credencial());
    await service.verificarAcceso(usuarioId, 'clave-de-cuenta');
    await expect(
      service.revelar('00000000-0000-4000-8000-000000000003', usuarioId),
    ).resolves.toMatchObject({ secreto: 'clave-real' });

    expect(auditoria.registrar.mock.calls[0]?.[0]).toMatchObject({
      accion: 'LOGIN',
      datosNuevos: { consultaSecreto: true },
    });
    prisma.credencialOperativa.findUnique.mockResolvedValue(
      credencial([{ usuarioId: otroId, puedeVer: true, puedeEditar: false }]),
    );
    await expect(
      service.revelar('00000000-0000-4000-8000-000000000003', usuarioId),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('exige la contraseña del usuario y la contraseña antigua para cambiarla', async () => {
    prisma.credencialOperativa.findUnique.mockResolvedValue(credencial());
    prisma.credencialOperativa.update.mockResolvedValue({});

    await service.cambiarSecreto(
      '00000000-0000-4000-8000-000000000003',
      {
        contrasenaUsuario: 'clave-de-cuenta',
        secretoActual: 'clave-real',
        secretoNuevo: 'clave-nueva',
      },
      usuarioId,
    );

    expect(auth.verifyCurrentPassword).toHaveBeenCalledWith(
      usuarioId,
      'clave-de-cuenta',
    );
    const llamada = prisma.credencialOperativa.update.mock.calls[0]?.[0] as {
      data: { secretoCifrado: string };
    };
    expect(secreto.descifrar(llamada.data.secretoCifrado)).toBe('clave-nueva');
  });

  it('no elimina una credencial si la contraseña del usuario es incorrecta', async () => {
    auth.verifyCurrentPassword.mockResolvedValueOnce(false);

    await expect(
      service.remove(
        '00000000-0000-4000-8000-000000000003',
        'incorrecta',
        usuarioId,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.credencialOperativa.delete).not.toHaveBeenCalled();
  });
});
