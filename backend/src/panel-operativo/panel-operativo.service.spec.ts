import { EstadoAsistencia } from '../../generated/prisma/enums.js';
import { DisponibilidadAulasService } from '../disponibilidad-aulas/disponibilidad-aulas.service';
import { PrestamosDocentesService } from '../prestamos-docentes/prestamos-docentes.service';
import { PrismaService } from '../prisma/prisma.service';
import { HorarioService } from '../horario/horario.service';
import { PanelOperativoService } from './panel-operativo.service';

describe('PanelOperativoService', () => {
  const disponibilidad = {
    findAll: jest.fn(),
  };
  const prestamos = { findUpcomingForDate: jest.fn() };
  const horario = { findClases: jest.fn() };
  const prisma = {
    practicaLibre: { findMany: jest.fn() },
    prestamoAudiovisual: { findMany: jest.fn() },
    observacion: { findMany: jest.fn() },
    tarea: { findMany: jest.fn() },
  };
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
    prestamos.findUpcomingForDate.mockResolvedValue([
      { id: 'prestamo-1', aulaId: 'aula-2' },
    ]);
    prisma.practicaLibre.findMany.mockResolvedValue([{ id: 'practica-1', aula: { id: 'aula-2', codigo: 'LAB-02' } }]);
    prisma.prestamoAudiovisual.findMany.mockResolvedValue([]);
    horario.findClases.mockResolvedValue([
      {
        id: 'clase-1', horaInicio: new Date(Date.UTC(1970, 0, 1, 8)), horaFin: new Date(Date.UTC(1970, 0, 1, 10)), grupo: '01',
        aula: { id: 'aula-1', codigo: 'LAB-01' }, docente: { nombre: 'Docente' }, asignatura: { nombre: 'Programación' }, proyectoCurricular: { nombre: 'Sistemas' },
        asistencias: [{ id: 'asistencia-1', estado: EstadoAsistencia.AUSENTE }],
      },
    ]);
    prisma.observacion.findMany.mockResolvedValue([]);
    prisma.tarea.findMany.mockResolvedValue([]);
    service = new PanelOperativoService(
      disponibilidad as unknown as DisponibilidadAulasService,
      prestamos as unknown as PrestamosDocentesService,
      prisma as unknown as PrismaService,
      horario as unknown as HorarioService,
    );
  });

  it('consolida aulas y alertas reutilizando servicios operativos', async () => {
    const resultado = await service.resumen({
      fecha: '2026-08-20',
      horaInicio: '08:00',
    });

    expect(resultado.metricas).toMatchObject({
      totalAulas: 3,
      ocupadas: 0,
      disponibles: 1,
      bloqueadas: 1,
      ausenciasDocentes: 1,
      practicasActivas: 1,
      prestamosDelDia: 1,
      audiovisualesPrestados: 0,
      alertas: 3,
    });
    expect(resultado.horarioActual).toHaveLength(1);
    expect(resultado.horarioActual[0].proyecto).toBe('Sistemas');
    expect(resultado.horarioActual[0].estado).toBe('AUSENTE');
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

  it('agrupa las asistencias pendientes en una sola advertencia', async () => {
    horario.findClases.mockResolvedValue([
      {
        id: 'clase-1', horaInicio: new Date(Date.UTC(1970, 0, 1, 8)), horaFin: new Date(Date.UTC(1970, 0, 1, 10)), grupo: '01',
        aula: { id: 'aula-1', codigo: 'LAB-01' }, docente: { nombre: 'Docente 1' }, asignatura: { nombre: 'Programación' }, proyectoCurricular: null,
        asistencias: [{ id: 'asistencia-1', estado: EstadoAsistencia.PENDIENTE }],
      },
      {
        id: 'clase-2', horaInicio: new Date(Date.UTC(1970, 0, 1, 8)), horaFin: new Date(Date.UTC(1970, 0, 1, 10)), grupo: '02',
        aula: { id: 'aula-2', codigo: 'LAB-02' }, docente: { nombre: 'Docente 2' }, asignatura: { nombre: 'Bases de datos' }, proyectoCurricular: null,
        asistencias: [{ id: 'asistencia-2', estado: EstadoAsistencia.PENDIENTE }],
      },
    ]);

    const resultado = await service.resumen({
      fecha: '2099-01-01',
      horaInicio: '08:00',
    });

    const pendientes = resultado.alertas.filter(
      (alerta) => alerta.tipo === 'asistencia-pendiente',
    );
    expect(pendientes).toEqual([
      expect.objectContaining({
        mensaje: 'Hay 2 asistencias docentes pendientes de registro.',
      }),
    ]);
  });

  it('agrupa las ausencias docentes en una sola alerta crítica', async () => {
    horario.findClases.mockResolvedValue([
      {
        id: 'clase-1', horaInicio: new Date(Date.UTC(1970, 0, 1, 8)), horaFin: new Date(Date.UTC(1970, 0, 1, 10)), grupo: '01',
        aula: { id: 'aula-1', codigo: 'LAB-01' }, docente: { nombre: 'Docente 1' }, asignatura: { nombre: 'Programación' }, proyectoCurricular: null,
        asistencias: [{ id: 'asistencia-1', estado: EstadoAsistencia.AUSENTE }],
      },
      {
        id: 'clase-2', horaInicio: new Date(Date.UTC(1970, 0, 1, 8)), horaFin: new Date(Date.UTC(1970, 0, 1, 10)), grupo: '02',
        aula: { id: 'aula-2', codigo: 'LAB-02' }, docente: { nombre: 'Docente 2' }, asignatura: { nombre: 'Bases de datos' }, proyectoCurricular: null,
        asistencias: [{ id: 'asistencia-2', estado: EstadoAsistencia.AUSENTE }],
      },
    ]);

    const resultado = await service.resumen({
      fecha: '2026-08-20',
      horaInicio: '08:00',
    });

    const ausencias = resultado.alertas.filter(
      (alerta) => alerta.tipo === 'ausencia-docente',
    );
    expect(ausencias).toEqual([
      expect.objectContaining({
        mensaje: 'Hay 2 ausencias docentes registradas.',
        enlace: '/horarios',
      }),
    ]);
  });
});
