import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SoftwareService } from './software.service';

describe('SoftwareService', () => {
  let service: SoftwareService;
  let prisma: {
    software: {
      create: jest.Mock;
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
    aula: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
    aulaSoftware: {
      create: jest.Mock;
      upsert: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      software: {
        create: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      aula: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      aulaSoftware: {
        create: jest.fn(),
        upsert: jest.fn(),
      },
    };

    service = new SoftwareService(prisma as unknown as PrismaService);
  });

  it('normaliza nombre y versión antes de crear el software', async () => {
    prisma.software.create.mockResolvedValue({ id: 'software-id' });

    await service.create({
      nombre: '  MATLAB  ',
      version: ' R2026a ',
      descripcion: '  Cálculo numérico  ',
    });

    expect(prisma.software.create).toHaveBeenCalledWith({
      data: {
        nombre: 'MATLAB',
        version: 'R2026a',
        descripcion: 'Cálculo numérico',
      },
    });
  });

  it('traduce la restricción única de Prisma a conflicto HTTP', async () => {
    prisma.software.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.create({ nombre: 'MATLAB', version: 'R2026a' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('usa upsert por nombre y versión para futuras importaciones', async () => {
    prisma.software.upsert.mockResolvedValue({ id: 'software-id' });

    await service.upsertCatalogEntry({
      nombre: ' MATLAB ',
      version: ' R2026a ',
    });

    expect(prisma.software.upsert).toHaveBeenCalledWith({
      where: {
        nombre_version: { nombre: 'MATLAB', version: 'R2026a' },
      },
      create: { nombre: 'MATLAB', version: 'R2026a' },
      update: { descripcion: undefined },
    });
  });

  it('impide asociar dos veces el mismo software con un aula', async () => {
    prisma.aula.findUnique.mockResolvedValue({ id: 'aula-id' });
    prisma.software.findUnique.mockResolvedValue({ id: 'software-id' });
    prisma.aulaSoftware.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.assignToAula({
        aulaId: 'aula-id',
        softwareId: 'software-id',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('exige simultáneamente todos los programas en la búsqueda de aulas', async () => {
    prisma.aula.findMany.mockResolvedValue([]);

    await service.findAulasByMultipleSoftware(['software-1', 'software-2']);

    expect(prisma.aula.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { softwares: { some: { softwareId: 'software-1' } } },
            { softwares: { some: { softwareId: 'software-2' } } },
          ],
        },
      }),
    );
  });
});
