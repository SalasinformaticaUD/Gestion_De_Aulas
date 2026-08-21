import { ConflictException } from '@nestjs/common';
import { EstadoPrestamo } from '../../generated/prisma/enums.js';
import { DisponibilidadAulasService } from '../disponibilidad-aulas/disponibilidad-aulas.service';
import { PrismaService } from '../prisma/prisma.service';
import { PracticasLibresService } from './practicas-libres.service';

describe('PracticasLibresService', () => {
  const dto = {
    codigoEstudiante: '20261001',
    nombreEstudiante: 'Estudiante Uno',
    aulaId: '00000000-0000-4000-8000-000000000001',
    inicio: '2026-08-20T08:00:00-05:00',
    finEstimada: '2026-08-20T10:00:00-05:00',
  };
  const tx = {
    estudiante: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    multa: { findFirst: jest.fn() },
    practicaLibre: { create: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(
      async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    ),
    practicaLibre: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    estudiante: { findUnique: jest.fn() },
  };
  const disponibilidad = { findOne: jest.fn() };
  let service: PracticasLibresService;

  beforeEach(() => {
    jest.clearAllMocks();
    disponibilidad.findOne.mockResolvedValue({
      estadoCalculado: 'disponible',
      motivo: 'Sin actividades.',
    });
    tx.estudiante.findUnique.mockResolvedValue(null);
    tx.estudiante.create.mockResolvedValue({ id: 'estudiante-id' });
    tx.practicaLibre.create.mockResolvedValue({ id: 'practica-id' });
    service = new PracticasLibresService(
      prisma as unknown as PrismaService,
      disponibilidad as unknown as DisponibilidadAulasService,
    );
  });

  it('crea estudiante y práctica cuando el aula está disponible', async () => {
    await expect(service.create(dto)).resolves.toEqual({ id: 'practica-id' });

    expect(disponibilidad.findOne).toHaveBeenCalledWith(dto.aulaId, {
      fecha: '2026-08-20',
      horaInicio: '08:00',
      horaFin: '10:00',
    });
    expect(tx.practicaLibre.create).toHaveBeenCalledTimes(1);
  });

  it('bloquea la práctica cuando el estudiante tiene multa activa', async () => {
    tx.estudiante.findUnique.mockResolvedValue({ id: 'estudiante-id' });
    tx.multa.findFirst.mockResolvedValue({ id: 'multa-id' });

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.practicaLibre.create).not.toHaveBeenCalled();
  });

  it('bloquea la práctica cuando el aula no está disponible', async () => {
    disponibilidad.findOne.mockResolvedValue({
      estadoCalculado: 'ocupada',
      motivo: 'Existe una clase programada.',
    });

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('finaliza una práctica activa registrando la devolución', async () => {
    prisma.practicaLibre.findUnique.mockResolvedValue({
      estado: EstadoPrestamo.ACTIVO,
    });
    prisma.practicaLibre.update.mockResolvedValue({
      id: 'practica-id',
      estado: EstadoPrestamo.DEVUELTO,
    });

    await expect(
      service.finish('practica-id', {
        finReal: '2026-08-20T09:45:00-05:00',
      }),
    ).resolves.toMatchObject({ estado: EstadoPrestamo.DEVUELTO });
  });
});
