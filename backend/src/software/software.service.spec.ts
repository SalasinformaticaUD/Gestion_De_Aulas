import { ConflictException } from '@nestjs/common';
import type { SoftwarePrismaService } from './software-prisma.service';
import { SoftwareService } from './software.service';

describe('SoftwareService', () => {
  let service: SoftwareService;
  let prisma: {
    software: {
      delete: jest.Mock;
      create: jest.Mock;
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
    aula: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
    aulaSoftware: {
      count: jest.Mock;
      create: jest.Mock;
      upsert: jest.Mock;
    };
    usuario: {
      findUnique: jest.Mock;
    };
    importacionSoftware: {
      create: jest.Mock;
      findMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      software: {
        delete: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      aula: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      aulaSoftware: {
        count: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
      },
      usuario: {
        findUnique: jest.fn(),
      },
      importacionSoftware: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: jest.fn(
        (callback: (tx: typeof prisma) => unknown): unknown => callback(prisma),
      ),
    };

    service = new SoftwareService(prisma as unknown as SoftwarePrismaService);
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

  it('bloquea la eliminación de software asociado a aulas', async () => {
    prisma.software.findUnique.mockResolvedValue({ id: 'software-id' });
    prisma.aulaSoftware.count.mockResolvedValue(1);

    await expect(service.remove('software-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.software.delete).not.toHaveBeenCalled();
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

  it('importa filas normalizadas y registra historial exitoso', async () => {
    prisma.aula.findUnique.mockResolvedValue({ id: 'aula-id' });
    prisma.software.upsert.mockResolvedValue({ id: 'software-id' });
    prisma.aulaSoftware.upsert.mockResolvedValue({
      aulaId: 'aula-id',
      softwareId: 'software-id',
    });
    prisma.importacionSoftware.create.mockResolvedValue({
      id: 'importacion-id',
    });

    await service.importInventory({
      nombreArchivo: 'software.xlsx',
      filas: [
        {
          aulaCodigo: ' 404 ',
          nombre: ' MATLAB ',
          version: ' R2026a ',
        },
      ],
    });

    expect(prisma.software.upsert).toHaveBeenCalledWith({
      where: {
        nombre_version: { nombre: 'MATLAB', version: 'R2026a' },
      },
      create: {
        nombre: 'MATLAB',
        version: 'R2026a',
        descripcion: undefined,
      },
      update: { descripcion: undefined },
    });
    expect(prisma.importacionSoftware.create).toHaveBeenCalledWith({
      data: {
        usuarioId: undefined,
        nombreArchivo: 'software.xlsx',
        totalRegistros: 1,
        registrosProcesados: 1,
        registrosConError: 0,
        resultado: 'EXITOSA',
      },
      include: { usuario: true },
    });
  });

  it('registra importación parcial cuando una fila referencia un aula inexistente', async () => {
    prisma.aula.findUnique
      .mockResolvedValueOnce({ id: 'aula-id' })
      .mockResolvedValueOnce(null);
    prisma.software.upsert.mockResolvedValue({ id: 'software-id' });
    prisma.aulaSoftware.upsert.mockResolvedValue({
      aulaId: 'aula-id',
      softwareId: 'software-id',
    });
    prisma.importacionSoftware.create.mockResolvedValue({
      id: 'importacion-id',
    });

    const result = (await service.importInventory({
      filas: [
        { aulaCodigo: '404', nombre: 'MATLAB', version: 'R2026a' },
        { aulaCodigo: '999', nombre: 'Python', version: '3.12' },
      ],
    })) as {
      resumen: {
        totalRegistros: number;
        registrosProcesados: number;
        registrosConError: number;
        resultado: string;
      };
    };

    expect(result.resumen).toEqual({
      totalRegistros: 2,
      registrosProcesados: 1,
      registrosConError: 1,
      resultado: 'PARCIAL',
    });
    expect(prisma.importacionSoftware.create).toHaveBeenCalledTimes(1);
    const createCalls = prisma.importacionSoftware.create.mock.calls as Array<
      [ImportacionCreateArgEsperado]
    >;
    const createArg = createCalls[0][0];

    expect(createArg.data.resultado).toBe('PARCIAL');
    expect(createArg.data.errores).toEqual([
      {
        fila: 2,
        aulaCodigo: '999',
        nombre: 'Python',
        version: '3.12',
        error: 'No existe un aula con el codigo indicado.',
      },
    ]);
  });
});

type ImportacionErrorEsperado = {
  fila: number;
  aulaCodigo: string;
  nombre: string;
  version: string;
  error: string;
};

type ImportacionCreateArgEsperado = {
  data: {
    resultado: string;
    errores: ImportacionErrorEsperado[];
  };
};
