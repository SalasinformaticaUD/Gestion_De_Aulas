import { AuditoriaService } from './auditoria.service';

describe('AuditoriaService', () => {
  const prisma = {
    auditoria: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  const service = new AuditoriaService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('redacta secretos antes de persistir el registro', async () => {
    prisma.auditoria.create.mockResolvedValue({ id: 'audit-id' });

    await service.registrar({
      entidad: 'Usuario',
      entidadId: 'usuario-id',
      accion: 'CREATE',
      datosNuevos: { nombre: 'Ana', passwordHash: 'secreto', token: 'jwt' },
    });

    const expectedCreateCall = expect.objectContaining({
      data: expect.objectContaining({
        datosNuevos: {
          nombre: 'Ana',
          passwordHash: '[REDACTED]',
          token: '[REDACTED]',
        },
      }) as unknown,
    }) as unknown;

    expect(prisma.auditoria.create).toHaveBeenCalledWith(expectedCreateCall);
  });

  it('consulta registros aplicando filtros', async () => {
    prisma.auditoria.findMany.mockResolvedValue([]);

    await service.findAll({ entidad: 'Usuario', entidadId: 'usuario-id' });

    const expectedFindCall = expect.objectContaining({
      where: expect.objectContaining({
        entidad: 'Usuario',
        entidadId: 'usuario-id',
      }) as unknown,
    }) as unknown;

    expect(prisma.auditoria.findMany).toHaveBeenCalledWith(expectedFindCall);
  });
});
