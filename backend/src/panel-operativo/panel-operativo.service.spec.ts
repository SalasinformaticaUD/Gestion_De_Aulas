import { EstadoAsistencia } from '../../generated/prisma/enums.js';
import { AsistenciaDocenteService } from '../asistencia-docente/asistencia-docente.service';
import { DisponibilidadAulasService } from '../disponibilidad-aulas/disponibilidad-aulas.service';
import { PrestamosDocentesService } from '../prestamos-docentes/prestamos-docentes.service';
import { PrismaService } from '../prisma/prisma.service';
import { PanelOperativoService } from './panel-operativo.service';

describe('PanelOperativoService', () => {
  const disponibilidad = {
    findAll: jest.fn(),
  };
  const asistencias = { findAll: jest.fn() };
  const prestamos = { findUpcomingForDate: jest.fn() };
  const prisma = { practicaLibre: { count: jest.fn() } };
  let service: PanelOperativoService;

  beforeEach(() => {
    jest.clearAllMocks();
    disponibilidad.findAll.mockResolvedValue([
      {
        aula: { id: 'aula-1', codigo: 'LAB-01', capacidad: 25 },
        estadoCalculado: 'ocupada',
        motivo: 'Clase programada.',
        bloqueActual: null,
        persistido: false,
      },
      {
        aula: { id: 'aula-2', codigo: 'LAB-02', capacidad: 30 },
        estadoCalculado: 'disponible',
        motivo: 'Libre.',
        bloqueActual: null,
        persistido: false,
      },
      {
        aula: { id: 'aula-3', codigo: 'LAB-03', capacidad: 20 },
        estadoCalculado: 'bloqueada',
        motivo: 'Restricción vigente.',
        bloqueActual: { id: 'obs-1' },
        persistido: false,
      },
    ]);
    asistencias.findAll.mockResolvedValue([
      {
        id: 'asistencia-1',
        estado: EstadoAsistencia.PENDIENTE,
        clase: { aulaId: 'aula-1' },
      },
    ]);
    prestamos.findUpcomingForDate.mockResolvedValue([
      { id: 'prestamo-1', aulaId: 'aula-2' },
    ]);
    prisma.practicaLibre.count.mockResolvedValue(1);
    service = new PanelOperativoService(
      disponibilidad as unknown as DisponibilidadAulasService,
      asistencias as unknown as AsistenciaDocenteService,
      prestamos as unknown as PrestamosDocentesService,
      prisma as unknown as PrismaService,
    );
  });

  it('consolida aulas y alertas reutilizando servicios operativos', async () => {
    const resultado = await service.resumen({
      fecha: '2026-08-20',
      horaInicio: '08:00',
    });

    expect(resultado.metricas).toMatchObject({
      totalAulas: 3,
      ocupadas: 1,
      disponibles: 1,
      bloqueadas: 1,
      asistenciasPendientes: 1,
      practicasActivas: 1,
      prestamosDelDia: 1,
      alertas: 3,
    });
    expect(resultado.persistido).toBe(false);
    expect(disponibilidad.findAll).toHaveBeenCalledWith({
      fecha: '2026-08-20',
      horaInicio: '08:00',
      horaFin: '10:00',
    });
  });

  it('pagina las aulas calculadas sin crear una fuente duplicada', async () => {
    const resultado = await service.aulas({
      fecha: '2026-08-20',
      pagina: 2,
      limite: 2,
    });

    expect(resultado).toMatchObject({
      total: 3,
      pagina: 2,
      limite: 2,
      persistido: false,
    });
    expect(resultado.items).toHaveLength(1);
    expect(resultado.items[0].aula.codigo).toBe('LAB-03');
  });
});
