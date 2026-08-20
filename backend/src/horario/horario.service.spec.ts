import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HorarioService } from './horario.service';

type PrismaMock = {
  periodoAcademico: {
    create: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    updateMany: jest.Mock;
    update: jest.Mock;
  };
  aula: { findUnique: jest.Mock };
  docente: { findUnique: jest.Mock };
  asignatura: { findUnique: jest.Mock };
  proyectoCurricular: { findUnique: jest.Mock };
  claseProgramada: {
    create: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  $transaction: jest.Mock;
};

describe('HorarioService', () => {
  const periodoId = '00000000-0000-4000-8000-000000000001';
  const aulaId = '00000000-0000-4000-8000-000000000002';
  const docenteId = '00000000-0000-4000-8000-000000000003';
  const asignaturaId = '00000000-0000-4000-8000-000000000004';
  let service: HorarioService;
  let prisma: PrismaMock;

  beforeEach(() => {
    prisma = {
      periodoAcademico: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({ id: periodoId }),
        updateMany: jest.fn(),
        update: jest.fn(),
      },
      aula: { findUnique: jest.fn().mockResolvedValue({ id: aulaId }) },
      docente: {
        findUnique: jest.fn().mockResolvedValue({ id: docenteId }),
      },
      asignatura: {
        findUnique: jest.fn().mockResolvedValue({ id: asignaturaId }),
      },
      proyectoCurricular: { findUnique: jest.fn() },
      claseProgramada: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(
      (callback: (tx: PrismaMock) => unknown) => callback(prisma),
    );
    service = new HorarioService(prisma as unknown as PrismaService);
  });

  it('rechaza un período cuyo inicio no es anterior al fin', async () => {
    await expect(
      service.createPeriodo({
        nombre: '2026-3',
        fechaInicio: '2026-12-01',
        fechaFin: '2026-08-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('desactiva el período anterior al crear uno activo', async () => {
    prisma.periodoAcademico.create.mockResolvedValue({
      id: periodoId,
      activo: true,
    });

    await service.createPeriodo({
      nombre: ' 2026-3 ',
      fechaInicio: '2026-08-01',
      fechaFin: '2026-12-01',
      activo: true,
    });

    expect(prisma.periodoAcademico.updateMany).toHaveBeenCalledWith({
      where: { activo: true },
      data: { activo: false },
    });
    expect(prisma.periodoAcademico.create).toHaveBeenCalledWith({
      // Jest usa un matcher asimétrico cuyo tipo público es `any`.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: expect.objectContaining({ nombre: '2026-3', activo: true }),
    });
  });

  it('retorna 404 al activar un período inexistente', async () => {
    prisma.periodoAcademico.findUnique.mockResolvedValue(null);

    await expect(service.activarPeriodo(periodoId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('crea una clase con horas normalizadas para Prisma', async () => {
    prisma.claseProgramada.create.mockResolvedValue({ id: 'clase-id' });

    await service.createClase({
      periodoId,
      aulaId,
      docenteId,
      asignaturaId,
      diaSemana: 1,
      horaInicio: '08:00',
      horaFin: '10:00',
      grupo: ' 020-81 ',
      inscritos: 20,
    });

    expect(prisma.claseProgramada.create).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          grupo: '020-81',
          horaInicio: new Date('1970-01-01T08:00:00.000Z'),
          horaFin: new Date('1970-01-01T10:00:00.000Z'),
        }),
      }),
    );
  });

  it('rechaza una clase con rango horario invertido', async () => {
    await expect(
      service.createClase({
        periodoId,
        aulaId,
        docenteId,
        asignaturaId,
        diaSemana: 1,
        horaInicio: '10:00',
        horaFin: '08:00',
        grupo: '020-81',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza una clase solapada en la misma aula', async () => {
    prisma.claseProgramada.findFirst.mockResolvedValue({ id: 'otra-clase' });

    await expect(
      service.createClase({
        periodoId,
        aulaId,
        docenteId,
        asignaturaId,
        diaSemana: 1,
        horaInicio: '09:00',
        horaFin: '11:00',
        grupo: '020-81',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('consulta solapamientos con límites abiertos para permitir bloques contiguos', async () => {
    prisma.claseProgramada.create.mockResolvedValue({ id: 'clase-id' });

    await service.createClase({
      periodoId,
      aulaId,
      docenteId,
      asignaturaId,
      diaSemana: 1,
      horaInicio: '10:00',
      horaFin: '12:00',
      grupo: '020-81',
    });

    expect(prisma.claseProgramada.findFirst).toHaveBeenCalledWith({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      where: expect.objectContaining({
        horaInicio: { lt: new Date('1970-01-01T12:00:00.000Z') },
        horaFin: { gt: new Date('1970-01-01T10:00:00.000Z') },
      }),
      select: { id: true },
    });
  });
});
