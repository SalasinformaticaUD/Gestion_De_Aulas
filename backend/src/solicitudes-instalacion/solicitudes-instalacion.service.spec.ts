/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
import type { PrismaService } from '../prisma/prisma.service';
import { SolicitudesInstalacionService } from './solicitudes-instalacion.service';

describe('SolicitudesInstalacionService decisiones', () => {
  it('rechaza con motivo y auditoría cuando aún no existen tareas', async () => {
    const tx = {
      solicitudInstalacion: {
        update: jest.fn().mockResolvedValue({
          id: 'solicitud-1',
          estado: 'RECHAZADA',
        }),
      },
      auditoria: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      solicitudInstalacion: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'solicitud-1',
          estado: 'PENDIENTE_REVISION',
          items: [{ softwareSolicitado: [{ _count: { tareasGeneradas: 0 } }] }],
        }),
      },
      $transaction: jest.fn((callback) => callback(tx)),
    } as unknown as PrismaService;

    const resultado = await new SolicitudesInstalacionService(prisma).rechazar(
      'solicitud-1',
      'Información insuficiente',
      'usuario-1',
    );

    expect(resultado.estado).toBe('RECHAZADA');
    expect(tx.solicitudInstalacion.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          motivoRechazo: 'Información insuficiente',
        }),
      }),
    );
    expect(tx.auditoria.create).toHaveBeenCalled();
  });

  it('aplica la clasificación histórica en la consulta', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      solicitudInstalacion: { findMany, count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn().mockResolvedValue([[], 0]),
    } as unknown as PrismaService;

    await new SolicitudesInstalacionService(prisma).findAll({
      vista: 'historial',
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ AND: expect.any(Array) }),
      }),
    );
  });

  it('exporta CSV con BOM y registra auditoría', async () => {
    const auditoria = { create: jest.fn().mockResolvedValue({}) };
    const prisma = {
      solicitudInstalacion: { findMany: jest.fn().mockResolvedValue([]) },
      auditoria,
    } as unknown as PrismaService;

    const csv = await new SolicitudesInstalacionService(
      prisma,
    ).exportarSolicitudes({ vista: 'actuales' }, 'usuario-1');

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Fecha de petición');
    expect(auditoria.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ accion: 'EXPORT' }),
      }),
    );
  });
});
