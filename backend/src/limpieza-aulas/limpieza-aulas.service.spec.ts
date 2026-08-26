import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  EstadoAula,
  EstadoPrestamo,
  EstadoTarea,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service';
import { LimpiezaAulasService } from './limpieza-aulas.service';

describe('LimpiezaAulasService', () => {
  const aulaId = '00000000-0000-4000-8000-000000000001';
  const otraAulaId = '00000000-0000-4000-8000-000000000002';
  const limpiezaId = '00000000-0000-4000-8000-000000000003';
  const prisma = {
    aula: { findUnique: jest.fn(), findMany: jest.fn() },
    observacion: { findMany: jest.fn() },
    limpieza: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    claseProgramada: { findMany: jest.fn() },
    prestamoDocente: { findMany: jest.fn() },
    practicaLibre: { findMany: jest.fn() },
    tarea: { findMany: jest.fn() },
  };
  let service: LimpiezaAulasService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.aula.findUnique.mockResolvedValue({ id: aulaId } as never);
    service = new LimpiezaAulasService(prisma as unknown as PrismaService);
  });

  it('filtra el historial por aula y rango de fechas inclusivo', async () => {
    prisma.limpieza.findMany.mockResolvedValue([] as never);

    await service.findAll({
      aulaId,
      desde: '2026-08-01',
      hasta: '2026-08-05',
    });

    expect(prisma.limpieza.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          aulaId,
          realizadaEn: {
            gte: new Date('2026-08-01T00:00:00.000Z'),
            lte: new Date('2026-08-05T23:59:59.999Z'),
          },
        },
      }),
    );
  });

  it('rechaza el registro para un aula inexistente', async () => {
    prisma.aula.findUnique.mockResolvedValue(null as never);

    await expect(service.create({ aulaId })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.limpieza.create).not.toHaveBeenCalled();
  });

  it('registra al usuario autenticado como responsable de la limpieza', async () => {
    prisma.limpieza.create.mockResolvedValue({ id: limpiezaId } as never);

    await service.create(
      { aulaId, observacion: '  Limpieza de estaciones  ' },
      '00000000-0000-4000-8000-000000000004',
    );

    const llamadas = prisma.limpieza.create.mock.calls as unknown as Array<
      [
        {
          data: {
            aulaId: string;
            responsableId: string;
            observacion: string;
          };
        },
      ]
    >;
    const llamada = llamadas[0]?.[0];
    expect(llamada.data).toMatchObject({
      aulaId,
      responsableId: '00000000-0000-4000-8000-000000000004',
      observacion: 'Limpieza de estaciones',
    });
  });

  it('propone primero el aula disponible con mayor tiempo sin limpieza', async () => {
    prisma.aula.findMany.mockResolvedValue([
      {
        id: aulaId,
        codigo: 'A-101',
        ubicacion: 'Piso 1',
        limpiezas: [{ realizadaEn: new Date('2026-08-01T12:00:00.000Z') }],
      },
      {
        id: otraAulaId,
        codigo: 'A-102',
        ubicacion: 'Piso 1',
        limpiezas: [{ realizadaEn: new Date('2026-08-20T12:00:00.000Z') }],
      },
    ] as never);
    prisma.observacion.findMany.mockResolvedValue([] as never);
    prisma.claseProgramada.findMany.mockResolvedValue([] as never);
    prisma.prestamoDocente.findMany.mockResolvedValue([] as never);
    prisma.practicaLibre.findMany.mockResolvedValue([] as never);
    prisma.tarea.findMany.mockResolvedValue([] as never);
    prisma.limpieza.findMany.mockResolvedValue([] as never);

    const resultado = await service.findSugerencias({
      fecha: '2026-08-26',
    });

    expect(resultado.sugerencias.map(({ aula }) => aula.id)).toEqual([
      aulaId,
      otraAulaId,
    ]);
    expect(prisma.aula.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { estado: EstadoAula.OPERATIVA } }),
    );
    const llamadasPrestamo = prisma.prestamoDocente.findMany.mock
      .calls as unknown as Array<
      [{ where: { estado: { in: EstadoPrestamo[] } } }]
    >;
    const prestamoQuery = llamadasPrestamo[0]?.[0];
    expect(prestamoQuery.where.estado).toEqual({
      in: [EstadoPrestamo.APROBADO, EstadoPrestamo.ACTIVO],
    });
    const llamadasTarea = prisma.tarea.findMany.mock.calls as unknown as Array<
      [{ where: { estado: { in: EstadoTarea[] } } }]
    >;
    const tareaQuery = llamadasTarea[0]?.[0];
    expect(tareaQuery.where.estado).toEqual({
      in: [EstadoTarea.PENDIENTE, EstadoTarea.EN_PROCESO],
    });
  });

  it('excluye aulas con una restricción operativa vigente', async () => {
    prisma.aula.findMany.mockResolvedValue([
      { id: aulaId, codigo: 'A-101', ubicacion: 'Piso 1', limpiezas: [] },
      {
        id: otraAulaId,
        codigo: 'A-102',
        ubicacion: 'Piso 1',
        limpiezas: [],
      },
    ] as never);
    prisma.observacion.findMany.mockResolvedValue([
      { aulaId: otraAulaId },
    ] as never);
    prisma.claseProgramada.findMany.mockResolvedValue([] as never);
    prisma.prestamoDocente.findMany.mockResolvedValue([] as never);
    prisma.practicaLibre.findMany.mockResolvedValue([] as never);
    prisma.tarea.findMany.mockResolvedValue([] as never);
    prisma.limpieza.findMany.mockResolvedValue([] as never);

    const resultado = await service.findSugerencias({ fecha: '2026-08-26' });

    expect(resultado.sugerencias.map(({ aula }) => aula.id)).toEqual([aulaId]);
  });

  it('construye una matriz de jornadas por aula y fecha', async () => {
    prisma.aula.findMany.mockResolvedValue([
      { id: aulaId, codigo: 'A-101', ubicacion: 'Piso 1' },
    ] as never);
    prisma.limpieza.findMany.mockResolvedValue([
      {
        id: limpiezaId,
        aulaId,
        realizadaEn: new Date('2026-08-02T14:00:00.000Z'),
        observacion: 'Limpieza general',
      },
    ] as never);

    const matriz = await service.findMatriz({
      desde: '2026-08-01',
      hasta: '2026-08-03',
    });

    expect(matriz.fechas).toEqual(['2026-08-01', '2026-08-02', '2026-08-03']);
    expect(matriz.aulas[0]?.jornadas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fecha: '2026-08-02', realizada: true }),
      ]),
    );
  });

  it('calcula indicadores de frecuencia y aulas sin historial', async () => {
    prisma.aula.findMany.mockResolvedValue([
      { id: aulaId, codigo: 'A-101', ubicacion: 'Piso 1' },
      { id: otraAulaId, codigo: 'A-102', ubicacion: 'Piso 1' },
    ] as never);
    prisma.limpieza.findMany.mockResolvedValue([
      { aulaId, realizadaEn: new Date('2026-08-20T14:00:00.000Z') },
    ] as never);

    const indicadores = await service.findIndicadores({});

    expect(indicadores).toMatchObject({
      totalLimpiezas: 1,
      aulasAtendidas: 1,
      aulasSinHistorial: 1,
      promedioLimpiezasPorAula: 0.5,
    });
    expect(
      indicadores.porAula.find(({ aula }) => aula.id === otraAulaId),
    ).toMatchObject({ totalLimpiezas: 0, ultimaLimpieza: null });
  });

  it('no expone eliminación física de registros de limpieza', () => {
    expect(service).not.toHaveProperty('remove');
  });
});
