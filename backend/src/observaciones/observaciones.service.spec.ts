import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TipoObservacion } from '../../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service';
import { ObservacionesService } from './observaciones.service';

describe('ObservacionesService', () => {
  const aulaId = '00000000-0000-4000-8000-000000000001';
  const observacionId = '00000000-0000-4000-8000-000000000002';
  const creadaEn = new Date('2026-08-21T13:00:00.000Z');
  const prisma = {
    aula: { findUnique: jest.fn() },
    observacion: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  let service: ObservacionesService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.aula.findUnique.mockResolvedValue({ id: aulaId });
    service = new ObservacionesService(prisma as unknown as PrismaService);
  });

  it('consulta solo restricciones vigentes para el rango indicado', async () => {
    prisma.observacion.findMany.mockResolvedValue([]);
    const inicio = new Date('2026-08-21T13:00:00.000Z');
    const fin = new Date('2026-08-21T15:00:00.000Z');

    await service.findRestriccionesVigentes(aulaId, inicio, fin);

    expect(prisma.observacion.findMany).toHaveBeenCalledWith({
      where: {
        aulaId,
        tipo: TipoObservacion.RESTRICCION,
        creadoEn: { lt: fin },
        OR: [{ vigenteHasta: null }, { vigenteHasta: { gt: inicio } }],
      },
      orderBy: { creadoEn: 'desc' },
    });
  });

  it('exige fecha de cierre para observaciones semanales', async () => {
    await expect(
      service.create({
        aulaId,
        tipo: TipoObservacion.SEMANAL,
        contenido: 'Restricción semanal',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.observacion.create).not.toHaveBeenCalled();
  });

  it('cierra logicamente una observacion sin borrarla', async () => {
    prisma.observacion.findUnique.mockResolvedValue({
      id: observacionId,
      aulaId,
      tipo: TipoObservacion.RESTRICCION,
      contenido: 'Aula restringida',
      vigenteHasta: null,
      creadoEn: creadaEn,
    });
    type UpdateInput = {
      where: { id: string };
      data: { vigenteHasta: Date };
      include: { aula: boolean };
    };
    let argumentos: UpdateInput | undefined;
    prisma.observacion.update.mockImplementationOnce((input: UpdateInput) => {
      argumentos = input;
      return Promise.resolve({ id: observacionId });
    });

    await service.remove(observacionId);

    expect(prisma.observacion.update).toHaveBeenCalledTimes(1);
    if (!argumentos) throw new Error('No se capturaron argumentos de update.');
    expect(argumentos.where).toEqual({ id: observacionId });
    expect(argumentos.data.vigenteHasta).toBeInstanceOf(Date);
    expect(argumentos.include).toEqual({ aula: true });
  });

  it('responde 404 cuando la observacion no existe', async () => {
    prisma.observacion.findUnique.mockResolvedValue(null);
    await expect(service.findOne(observacionId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
