import { BadRequestException } from '@nestjs/common';
import { ReportesService } from './reportes.service';

describe('ReportesService', () => {
  const prisma = {
    practicaLibre: { count: jest.fn(), findMany: jest.fn() },
    prestamoDocente: { findMany: jest.fn() },
    prestamoAudiovisual: { count: jest.fn(), findMany: jest.fn() },
    asistenciaDocente: { count: jest.fn(), findMany: jest.fn() },
    multa: { count: jest.fn(), findMany: jest.fn() },
    limpieza: { count: jest.fn(), findMany: jest.fn() },
  };
  const service = new ReportesService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    for (const repositorio of Object.values(prisma)) {
      for (const fn of Object.values(repositorio)) fn.mockResolvedValue([]);
    }
  });

  it('pagina prácticas libres y conserva la estructura de respuesta', async () => {
    prisma.practicaLibre.count.mockResolvedValue(1);
    prisma.practicaLibre.findMany.mockResolvedValue([]);
    const resultado = await service.consultar('practicas-libres', {
      pagina: 2,
      limite: 10,
    });
    expect(resultado).toEqual(
      expect.objectContaining({
        reporte: 'practicas-libres',
        pagina: 2,
        limite: 10,
        total: 1,
        items: [],
      }),
    );
  });

  it('rechaza rangos de fechas invertidos o excesivos', async () => {
    await expect(
      service.consultar('limpieza', {
        desde: '2026-05-01',
        hasta: '2026-01-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.consultar('limpieza', {
        desde: '2024-01-01',
        hasta: '2026-01-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('convierte resultados a CSV escapando comillas', () => {
    expect(
      service.aCsv({ items: [{ aula: 'A-1', observacion: '"ok"' }] }),
    ).toContain('""ok""');
  });
});
