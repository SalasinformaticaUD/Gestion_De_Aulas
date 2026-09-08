import { ConflictException, NotFoundException } from '@nestjs/common';
import { EstadoPrestamo } from '../../generated/prisma/enums.js';
import { DisponibilidadAulasService } from '../disponibilidad-aulas/disponibilidad-aulas.service';
import { PrismaService } from '../prisma/prisma.service';
import { PracticasLibresService } from './practicas-libres.service';

describe('PracticasLibresService', () => {
  const dto = {
    codigoEstudiante: '20261001',
    nombreEstudiante: 'Estudiante Uno',
    aulaId: '00000000-0000-4000-8000-000000000001',
    softwareId: '00000000-0000-4000-8000-000000000002',
    softwareSolicitado: 'AutoCAD',
    responsableTipo: 'MONITOR' as const,
    inicio: '2099-08-20T08:00:00-05:00',
    finEstimada: '2099-08-20T10:00:00-05:00',
  };
  const tx = {
    estudiante: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
    },
    docente: { upsert: jest.fn() },
    multa: { findFirst: jest.fn() },
    practicaLibre: { create: jest.fn(), findFirst: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(
      async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    ),
    practicaLibre: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    estudiante: { findUnique: jest.fn() },
    software: { findUnique: jest.fn() },
    aulaSoftware: { findUnique: jest.fn() },
  };
  const disponibilidad = { findOne: jest.fn() };
  let service: PracticasLibresService;

  beforeEach(() => {
    jest.clearAllMocks();
    disponibilidad.findOne.mockResolvedValue({
      estadoCalculado: 'disponible',
      motivo: 'Sin actividades.',
      fuentes: [],
    });
    tx.estudiante.upsert.mockResolvedValue({ id: 'estudiante-id' });
    tx.multa.findFirst.mockResolvedValue(null);
    tx.practicaLibre.findFirst.mockResolvedValue(null);
    prisma.software.findUnique.mockResolvedValue({
      id: dto.softwareId,
      nombre: 'AutoCAD',
      estado: 'ACTIVO',
    });
    prisma.aulaSoftware.findUnique.mockResolvedValue({ aulaId: dto.aulaId });
    tx.practicaLibre.create.mockResolvedValue({
      id: 'practica-id',
      estudiante: { correo: null, nombre: dto.nombreEstudiante },
      docente: null,
      aula: { codigo: 'Aula 101' },
      softwareSolicitado: dto.softwareSolicitado,
      inicio: new Date(dto.inicio),
      finEstimada: new Date(dto.finEstimada),
    });
    service = new PracticasLibresService(
      prisma as unknown as PrismaService,
      disponibilidad as unknown as DisponibilidadAulasService,
    );
  });

  it('crea una práctica para un estudiante existente cuando el aula está disponible', async () => {
    await expect(service.create(dto)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'practica-id' })]),
    );

    expect(disponibilidad.findOne).toHaveBeenCalledWith(dto.aulaId, {
      fecha: '2099-08-20',
      horaInicio: '08:00',
      horaFin: '10:00',
    });
    expect(tx.practicaLibre.create).toHaveBeenCalledTimes(1);
    expect(tx.estudiante.create).not.toHaveBeenCalled();
  });

  it('bloquea la práctica cuando el estudiante tiene multa activa', async () => {
    tx.estudiante.upsert.mockResolvedValue({ id: 'estudiante-id' });
    tx.multa.findFirst.mockResolvedValue({ id: 'multa-id' });

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.practicaLibre.create).not.toHaveBeenCalled();
  });

  it('bloquea la práctica cuando el aula no está disponible', async () => {
    disponibilidad.findOne.mockResolvedValue({
      estadoCalculado: 'ocupada',
      motivo: 'Existe una clase programada.',
      fuentes: [],
    });

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('permite compartir un aula que ya tiene otra práctica libre', async () => {
    disponibilidad.findOne.mockResolvedValue({
      estadoCalculado: 'reservada',
      motivo: 'Existe una práctica libre activa.',
      fuentes: [{ tipo: 'practica-libre', estado: EstadoPrestamo.ACTIVO }],
    });
    await expect(service.create(dto)).resolves.toBeDefined();
    expect(tx.practicaLibre.create).toHaveBeenCalled();
  });

  it('impide otra práctica cuando la persona ya tiene una activa', async () => {
    tx.practicaLibre.findFirst.mockResolvedValue({ id: 'practica-activa' });
    await expect(service.create(dto)).rejects.toThrow(
      'ya tiene una práctica libre activa',
    );
    expect(tx.practicaLibre.create).not.toHaveBeenCalled();
  });

  it('bloquea la práctica cuando el software no está licenciado ni activo', async () => {
    prisma.software.findUnique.mockResolvedValue({
      id: dto.softwareId,
      nombre: 'AutoCAD',
      estado: 'EN_REVISION',
    });

    await expect(service.create(dto)).rejects.toMatchObject({
      message:
        'El software AutoCAD está en revisión o mantenimiento y no está disponible para préstamo.',
    });
    expect(prisma.aulaSoftware.findUnique).not.toHaveBeenCalled();
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

  it('impide finalizar una práctica antes de que inicie su bloque', async () => {
    prisma.practicaLibre.findUnique.mockResolvedValue({
      estado: EstadoPrestamo.ACTIVO,
      inicio: new Date(Date.now() + 60 * 60 * 1000),
      finEstimada: new Date(Date.now() + 3 * 60 * 60 * 1000),
      finReal: null,
    });

    await expect(service.finish('practica-futura', {})).rejects.toMatchObject({
      message: 'No se puede finalizar una práctica antes de que inicie su bloque programado. Puede cancelarla si ya no se realizará.',
    });
    expect(prisma.practicaLibre.update).not.toHaveBeenCalled();
  });

  it('consulta un estudiante con multas y prácticas recientes', async () => {
    prisma.estudiante.findUnique.mockResolvedValue({
      id: 'estudiante-id',
      codigo: dto.codigoEstudiante,
      multas: [],
      practicas: [],
    });

    await expect(
      service.findStudent(dto.codigoEstudiante),
    ).resolves.toMatchObject({ codigo: dto.codigoEstudiante });
    expect(prisma.estudiante.findUnique).toHaveBeenCalledWith({
      where: { codigo: dto.codigoEstudiante },
      include: {
        multas: { where: { estado: 'ACTIVA' } },
        practicas: {
          where: { estado: { in: ['ACTIVO', 'VENCIDO'] } },
          orderBy: { inicio: 'desc' },
          take: 1,
        },
      },
    });
  });

  it('retorna 404 al consultar un estudiante inexistente', async () => {
    prisma.estudiante.findUnique.mockResolvedValue(null);

    await expect(service.findStudent('99999999')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('cancela una práctica activa y registra su fecha real de cierre', async () => {
    prisma.practicaLibre.findUnique.mockResolvedValue({
      estado: EstadoPrestamo.ACTIVO,
    });
    prisma.practicaLibre.update.mockResolvedValue({
      id: 'practica-id',
      estado: EstadoPrestamo.CANCELADO,
    });

    await expect(service.cancel('practica-id')).resolves.toMatchObject({
      estado: EstadoPrestamo.CANCELADO,
    });
    expect(prisma.practicaLibre.update).toHaveBeenCalledWith({
      where: { id: 'practica-id' },
      data: {
        estado: EstadoPrestamo.CANCELADO,
        // Jest expone este matcher asimétrico con tipo público `any`.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        finReal: expect.any(Date),
      },
      include: { estudiante: true, docente: true, aula: true },
    });
  });

  it('marca como vencidas las prácticas activas que superaron su fin estimado', async () => {
    prisma.practicaLibre.updateMany.mockResolvedValue({ count: 1 });
    prisma.practicaLibre.findMany.mockResolvedValue([]);

    await service.findAll({ estado: EstadoPrestamo.VENCIDO });

    expect(prisma.practicaLibre.updateMany).toHaveBeenCalledWith({
      where: {
        estado: EstadoPrestamo.ACTIVO,
        finReal: null,
        // Jest expone este matcher asimétrico con tipo público `any`.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        finEstimada: { lt: expect.any(Date) },
      },
      data: { estado: EstadoPrestamo.VENCIDO },
    });
    expect(prisma.practicaLibre.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        // Jest expone este matcher asimétrico con tipo público `any`.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        where: expect.objectContaining({ estado: EstadoPrestamo.VENCIDO }),
      }),
    );
  });

  it('permite finalizar una práctica vencida como devolución tardía', async () => {
    prisma.practicaLibre.findUnique.mockResolvedValue({
      estado: EstadoPrestamo.VENCIDO,
      finEstimada: new Date('2026-08-20T15:00:00.000Z'),
      finReal: null,
    });
    prisma.practicaLibre.update.mockResolvedValue({
      id: 'practica-id',
      estado: EstadoPrestamo.DEVUELTO,
    });

    await expect(service.finish('practica-id', {})).resolves.toMatchObject({
      estado: EstadoPrestamo.DEVUELTO,
    });
  });

  it('impide cancelar una práctica que ya venció', async () => {
    prisma.practicaLibre.findUnique.mockResolvedValue({
      estado: EstadoPrestamo.VENCIDO,
      finEstimada: new Date('2026-08-20T15:00:00.000Z'),
      finReal: null,
    });

    await expect(service.cancel('practica-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
