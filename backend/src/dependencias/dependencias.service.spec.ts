import { ConflictException } from '@nestjs/common';
import { DependenciasService } from './dependencias.service';

describe('DependenciasService', () => {
  const prisma = {
    dependencia: { delete: jest.fn(), findUnique: jest.fn() },
    usuario: { count: jest.fn() },
  };
  const service = new DependenciasService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('impide eliminar una dependencia que tiene usuarios', async () => {
    prisma.usuario.count.mockResolvedValue(1);

    await expect(service.remove('dependencia-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.dependencia.delete).not.toHaveBeenCalled();
  });
});
