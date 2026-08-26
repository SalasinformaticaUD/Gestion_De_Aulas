import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CredencialesService } from './credenciales.service';
import { CredencialesCifradoService } from './credenciales-cifrado.service';

describe('CredencialesService', () => {
  const usuarioId = '00000000-0000-4000-8000-000000000001';
  const otroId = '00000000-0000-4000-8000-000000000002';
  const secreto = new CredencialesCifradoService();
  const prisma = {
    credencialOperativa: {
      findMany: jest.fn<() => Promise<unknown[]>>(),
      findUnique: jest.fn<() => Promise<unknown>>(),
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
  let service: CredencialesService;
  beforeEach(() => {
    process.env.CREDENTIALS_ENCRYPTION_KEY =
      'clave-de-prueba-de-credenciales-con-entropia-suficiente';
    jest.clearAllMocks();
    service = new CredencialesService(
      prisma as never,
      secreto,
      auditoria as never,
    );
  });
  const credencial = (
    accesos = [{ usuarioId, puedeVer: true, puedeEditar: true }],
  ) => ({
    id: '00000000-0000-4000-8000-000000000003',
    nombre: 'Servidor',
    categoria: 'SERVIDORES',
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
});
