import { ConflictException, NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { EstadoAsistencia } from '../../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service';
import { AsistenciaDocenteService } from './asistencia-docente.service';

type PrismaMock = {
  asistenciaDocente: {
    findUnique: jest.Mock;
    create: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
  };
  claseProgramada: { findUnique: jest.Mock };
  usuario: { findUnique: jest.Mock };
};

describe('AsistenciaDocenteService', () => {
  const claseId = '00000000-0000-4000-8000-000000000001';
  const usuarioId = '00000000-0000-4000-8000-000000000002';
  const asistenciaId = '00000000-0000-4000-8000-000000000003';
  let service: AsistenciaDocenteService;
  let prisma: PrismaMock;

  beforeEach(() => {
    prisma = {
      asistenciaDocente: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      claseProgramada: {
        findUnique: jest.fn().mockResolvedValue({ id: claseId }),
      },
      usuario: {
        findUnique: jest.fn().mockResolvedValue({ id: usuarioId }),
      },
    };
    service = new AsistenciaDocenteService(prisma as unknown as PrismaService);
  });

  it('crea una asistencia pendiente por defecto', async () => {
    prisma.asistenciaDocente.create.mockResolvedValue({ id: asistenciaId });

    await service.create({ claseId, fecha: '2026-08-20' });

    expect(prisma.asistenciaDocente.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          claseId,
          fecha: new Date('2026-08-20T00:00:00.000Z'),
          estado: EstadoAsistencia.PENDIENTE,
          registradaEn: null,
        },
      }),
    );
  });

  it('exige que la clase programada exista', async () => {
    prisma.claseProgramada.findUnique.mockResolvedValue(null);

    await expect(
      service.create({ claseId, fecha: '2026-08-20' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('evita registros duplicados para la misma clase y fecha', async () => {
    prisma.asistenciaDocente.findUnique.mockResolvedValue({ id: asistenciaId });

    await expect(
      service.create({ claseId, fecha: '2026-08-20' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('valida el usuario registrador cuando se recibe durante el MVP', async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);

    await expect(
      service.create({
        claseId,
        fecha: '2026-08-20',
        registradoPorId: usuarioId,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('aplica filtros por fecha, aula y estado', async () => {
    prisma.asistenciaDocente.findMany.mockResolvedValue([]);

    await service.findAll({
      fecha: '2026-08-20',
      aulaId: '00000000-0000-4000-8000-000000000004',
      estado: EstadoAsistencia.AUSENTE,
    });

    expect(prisma.asistenciaDocente.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          fecha: new Date('2026-08-20T00:00:00.000Z'),
          estado: EstadoAsistencia.AUSENTE,
          clase: { aulaId: '00000000-0000-4000-8000-000000000004' },
        },
      }),
    );
  });

  it('consulta el historial de una clase existente', async () => {
    prisma.asistenciaDocente.findMany.mockResolvedValue([]);

    await service.findByClass(claseId);

    expect(prisma.asistenciaDocente.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { claseId } }),
    );
  });

  it('marca la fecha real de registro al confirmar un estado', async () => {
    prisma.asistenciaDocente.findUnique.mockResolvedValue({ id: asistenciaId });
    prisma.asistenciaDocente.update.mockResolvedValue({ id: asistenciaId });

    await service.update(asistenciaId, {
      estado: EstadoAsistencia.ASISTIO,
      observacion: ' Llegó a tiempo ',
    });

    expect(prisma.asistenciaDocente.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          estado: EstadoAsistencia.ASISTIO,
          // Jest expone este matcher asimétrico con tipo público `any`.
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          registradaEn: expect.any(Date),
          observacion: 'Llegó a tiempo',
        },
      }),
    );
  });
});
