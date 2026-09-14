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
    aula: { findMany: jest.fn() },
    claseProgramada: { findMany: jest.fn() },
    prestamoDocente: { findMany: jest.fn() },
    practicaLibre: { findMany: jest.fn() },
    prestamoAudiovisual: { findMany: jest.fn() },
    observacion: { findMany: jest.fn() },
    tarea: { findMany: jest.fn() },
    limpieza: { findMany: jest.fn() },
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
    prisma.practicaLibre.findMany.mockResolvedValue([
      { id: 'practica-1', aula: { id: 'aula-2', codigo: 'LAB-02' } },
    ]);
    prisma.prestamoAudiovisual.findMany.mockResolvedValue([]);
    horario.findClases.mockResolvedValue([
      {
        id: 'clase-1',
        horaInicio: new Date(Date.UTC(1970, 0, 1, 8)),
        horaFin: new Date(Date.UTC(1970, 0, 1, 10)),
        grupo: '01',
        aula: { id: 'aula-1', codigo: 'LAB-01' },
        docente: { nombre: 'Docente' },
        asignatura: { nombre: 'Programación' },
        proyectoCurricular: { nombre: 'Sistemas' },
        asistencias: [{ id: 'asistencia-1', estado: EstadoAsistencia.AUSENTE }],
      },
    ]);
    prisma.observacion.findMany.mockResolvedValue([]);
    prisma.tarea.findMany.mockResolvedValue([]);
    prisma.aula.findMany.mockResolvedValue([
      { id: 'aula-1', estado: 'OPERATIVA' },
      { id: 'aula-2', estado: 'OPERATIVA' },
      { id: 'aula-3', estado: 'FUERA_DE_SERVICIO' },
    ]);
    prisma.claseProgramada.findMany.mockResolvedValue([]);
    prisma.prestamoDocente.findMany.mockResolvedValue([]);
    prisma.limpieza.findMany.mockResolvedValue([]);
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
    expect(resultado.alertas).toContainEqual(
      expect.objectContaining({
        tipo: 'bloqueada',
        aulaCodigo: 'LAB-03',
        mensaje: 'Restricción vigente.',
      }),
    );
    expect(disponibilidad.findAll).toHaveBeenCalledWith({
      fecha: '2026-08-20',
      horaInicio: '08:00',
      horaFin: '10:00',
    });
  });

  it('comparte el cálculo entre solicitudes simultáneas del mismo bloque', async () => {
    const query = { fecha: '2026-08-20', horaInicio: '08:00' };

    const [primero, segundo] = await Promise.all([
      service.resumen(query),
      service.resumen(query),
    ]);

    expect(primero).toBe(segundo);
    expect(disponibilidad.findAll).toHaveBeenCalledTimes(1);
    expect(horario.findClases).toHaveBeenCalledTimes(1);
  });

  it('permite refrescar el resumen después de una operación', async () => {
    const query = { fecha: '2026-08-20', horaInicio: '08:00' };

    await service.resumen(query);
    await service.resumen({ ...query, forzarActualizacion: true });

    expect(disponibilidad.findAll).toHaveBeenCalledTimes(2);
    expect(horario.findClases).toHaveBeenCalledTimes(2);
  });

  it('recomienda el siguiente bloque disponible con consultas en lote', async () => {
    prisma.tarea.findMany.mockResolvedValueOnce([
      {
        id: 'tarea-1',
        titulo: 'Revisar equipos',
        aulaId: 'aula-1',
        aula: { id: 'aula-1', codigo: 'LAB-01' },
      },
    ]);

    const resultado = await service.resumen({
      fecha: '2026-08-20',
      horaInicio: '08:00',
    });

    expect(disponibilidad.findAll).toHaveBeenCalledTimes(1);
    expect(prisma.claseProgramada.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.prestamoDocente.findMany).toHaveBeenCalledTimes(1);
    const alerta = resultado.alertas.find(
      (item) => item.tipo === 'tarea-operativa',
    );
    expect(alerta).toMatchObject({ severidad: 'info' });
    expect(alerta?.mensaje).toContain(
      '“Revisar equipos” puede realizarse en LAB-01',
    );
  });

  it('omite un bloque futuro ocupado y recomienda el siguiente', async () => {
    prisma.tarea.findMany
      .mockResolvedValueOnce([
        {
          id: 'tarea-1',
          titulo: 'Instalar actualizaciones',
          aulaId: 'aula-1',
          aula: { id: 'aula-1', codigo: 'LAB-01' },
        },
      ])
      .mockResolvedValueOnce([]);
    prisma.practicaLibre.findMany
      .mockResolvedValueOnce([
        { id: 'practica-1', aula: { id: 'aula-2', codigo: 'LAB-02' } },
      ])
      .mockResolvedValueOnce([]);
    prisma.claseProgramada.findMany.mockResolvedValueOnce([
      {
        aulaId: 'aula-1',
        diaSemana: 4,
        horaInicio: new Date(Date.UTC(1970, 0, 1, 10)),
        horaFin: new Date(Date.UTC(1970, 0, 1, 12)),
        periodo: {
          fechaInicio: new Date('2026-01-01T00:00:00.000Z'),
          fechaFin: new Date('2026-12-31T23:59:59.999Z'),
        },
      },
    ]);

    const resultado = await service.resumen({
      fecha: '2026-08-20',
      horaInicio: '08:00',
    });

    const alerta = resultado.alertas.find(
      (item) => item.tipo === 'tarea-operativa',
    );
    expect(alerta).toMatchObject({ severidad: 'info' });
    expect(alerta?.mensaje).toContain('de 12:00 a 14:00');
  });

  it('mantiene como advertencia una tarea sin aula operativa disponible', async () => {
    prisma.tarea.findMany
      .mockResolvedValueOnce([
        {
          id: 'tarea-3',
          titulo: 'Revisar cableado',
          aulaId: 'aula-3',
          aula: { id: 'aula-3', codigo: 'LAB-03' },
        },
      ])
      .mockResolvedValueOnce([]);

    const resultado = await service.resumen({
      fecha: '2026-08-20',
      horaInicio: '08:00',
    });

    expect(resultado.alertas).toContainEqual(
      expect.objectContaining({
        tipo: 'tarea-operativa',
        severidad: 'advertencia',
        mensaje:
          '“Revisar cableado” sigue pendiente; no se encontró disponibilidad cercana para LAB-03.',
      }),
    );
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
        id: 'clase-1',
        horaInicio: new Date(Date.UTC(1970, 0, 1, 8)),
        horaFin: new Date(Date.UTC(1970, 0, 1, 10)),
        grupo: '01',
        aula: { id: 'aula-1', codigo: 'LAB-01' },
        docente: { nombre: 'Docente 1' },
        asignatura: { nombre: 'Programación' },
        proyectoCurricular: null,
        asistencias: [
          { id: 'asistencia-1', estado: EstadoAsistencia.PENDIENTE },
        ],
      },
      {
        id: 'clase-2',
        horaInicio: new Date(Date.UTC(1970, 0, 1, 8)),
        horaFin: new Date(Date.UTC(1970, 0, 1, 10)),
        grupo: '02',
        aula: { id: 'aula-2', codigo: 'LAB-02' },
        docente: { nombre: 'Docente 2' },
        asignatura: { nombre: 'Bases de datos' },
        proyectoCurricular: null,
        asistencias: [
          { id: 'asistencia-2', estado: EstadoAsistencia.PENDIENTE },
        ],
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
        id: 'clase-1',
        horaInicio: new Date(Date.UTC(1970, 0, 1, 8)),
        horaFin: new Date(Date.UTC(1970, 0, 1, 10)),
        grupo: '01',
        aula: { id: 'aula-1', codigo: 'LAB-01' },
        docente: { nombre: 'Docente 1' },
        asignatura: { nombre: 'Programación' },
        proyectoCurricular: null,
        asistencias: [{ id: 'asistencia-1', estado: EstadoAsistencia.AUSENTE }],
      },
      {
        id: 'clase-2',
        horaInicio: new Date(Date.UTC(1970, 0, 1, 8)),
        horaFin: new Date(Date.UTC(1970, 0, 1, 10)),
        grupo: '02',
        aula: { id: 'aula-2', codigo: 'LAB-02' },
        docente: { nombre: 'Docente 2' },
        asignatura: { nombre: 'Bases de datos' },
        proyectoCurricular: null,
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
