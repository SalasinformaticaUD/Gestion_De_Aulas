import { BadRequestException } from '@nestjs/common';
import { ReportesService } from './reportes.service';

describe('ReportesService', () => {
  const prisma = {
    practicaLibre: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
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

  it('rechaza la generación mensual para meses futuros', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-07T15:00:00.000Z'));
    await expect(
      service.generarPracticasLibresMesPdf('2026-10'),
    ).rejects.toBeInstanceOf(BadRequestException);
    jest.useRealTimers();
  });

  it('genera la ficha de práctica con aula sola, hora de 24 horas y responsable persistido', async () => {
    const generar = jest.fn(
      (
        _plantilla: string,
        _valores: Record<string, string>,
        _nombre: string,
      ) => {
        void _plantilla;
        void _valores;
        void _nombre;
        return Promise.resolve(Buffer.from('%PDF'));
      },
    );
    const renderer = { generar };
    const reportes = new ReportesService(prisma as never, renderer as never);
    prisma.practicaLibre.findUnique.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      inicio: new Date('2026-09-09T19:05:00.000Z'),
      finEstimada: new Date('2026-09-09T21:00:00.000Z'),
      finReal: new Date('2026-09-09T20:10:00.000Z'),
      estado: 'DEVUELTO',
      estudiante: { nombre: 'Laura Gómez', codigo: '20260001' },
      docente: null,
      aula: { codigo: 'Aula 306', ubicacion: 'Sin ubicación registrada' },
      atendidoPor: {
        nombreCompleto: 'Esteban Bautista',
        nombreUsuario: 'ebautista',
      },
    });

    await reportes.generarPracticaLibrePdf(
      '11111111-1111-4111-8111-111111111111',
    );

    const valores = generar.mock.calls[0][1];
    expect(valores.F16).toBe('306');
    expect(valores.B25).toContain('Finalizada: 15:10');
    expect(valores.B25).not.toMatch(/a\.\s*m\.|p\.\s*m\.|AM|PM/i);
    expect(valores.B26).toBe('ATENDIDO POR: Esteban Bautista');
  });

  it('organiza las fichas mensuales en una carpeta por persona que atendió', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-09T17:00:00.000Z'));
    const renderer = {
      generar: jest.fn(
        (
          _plantilla: string,
          _valores: Record<string, string>,
          _nombre: string,
        ) => {
          void _plantilla;
          void _valores;
          void _nombre;
          return Promise.resolve(Buffer.from('%PDF'));
        },
      ),
    };
    const reportes = new ReportesService(prisma as never, renderer as never);
    const registros = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        responsable: 'Esteban Bautista',
      },
      { id: '22222222-2222-4222-8222-222222222222', responsable: 'Ana Pérez' },
    ];
    prisma.practicaLibre.findMany.mockResolvedValue(
      registros.map((registro) => ({
        id: registro.id,
        atendidoPor: {
          nombreCompleto: registro.responsable,
          nombreUsuario: null,
        },
      })),
    );
    prisma.practicaLibre.findUnique.mockImplementation(
      ({ where }: { where: { id: string } }) => {
        const registro = registros.find((item) => item.id === where.id)!;
        return Promise.resolve({
          id: registro.id,
          inicio: new Date('2026-09-08T13:00:00.000Z'),
          finEstimada: new Date('2026-09-08T15:00:00.000Z'),
          finReal: new Date('2026-09-08T14:50:00.000Z'),
          estado: 'DEVUELTO',
          estudiante: { nombre: 'Persona atendida', codigo: '20260001' },
          docente: null,
          aula: { codigo: '500', ubicacion: '' },
          atendidoPor: {
            nombreCompleto: registro.responsable,
            nombreUsuario: null,
          },
        });
      },
    );

    const zip = await reportes.generarPracticasLibresMesPdf('2026-09');
    const contenido = zip.toString('utf8');
    expect(contenido).toContain(
      `Esteban Bautista/Ficha_PracticaLibre_${registros[0].id}.pdf`,
    );
    expect(contenido).toContain(
      `Ana Pérez/Ficha_PracticaLibre_${registros[1].id}.pdf`,
    );
    jest.useRealTimers();
  });

  it('convierte resultados a CSV escapando comillas', () => {
    expect(
      service.aCsv({ items: [{ aula: 'A-1', observacion: '"ok"' }] }),
    ).toContain('""ok""');
  });
});
