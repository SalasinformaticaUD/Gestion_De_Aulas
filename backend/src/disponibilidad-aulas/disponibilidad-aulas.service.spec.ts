import { BadRequestException } from '@nestjs/common';
import { EstadoAsistencia, EstadoAula } from '../../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service';
import { ObservacionesService } from '../observaciones/observaciones.service';
import { DisponibilidadAulasService } from './disponibilidad-aulas.service';

type PrismaMock = {
  aula: { findMany: jest.Mock; findUnique: jest.Mock };
  observacion: { findFirst: jest.Mock };
  claseProgramada: { findFirst: jest.Mock };
  prestamoDocente: { findFirst: jest.Mock };
  practicaLibre: { findFirst: jest.Mock };
  tarea: { findFirst: jest.Mock };
  limpieza: { findFirst: jest.Mock };
};

describe('DisponibilidadAulasService', () => {
  const aula = {
    id: '00000000-0000-4000-8000-000000000001',
    codigo: 'LAB-01',
    ubicacion: 'Piso 2',
    capacidad: 25,
    estado: EstadoAula.OPERATIVA,
  };
  const bloque = {
    fecha: '2026-08-20',
    horaInicio: '08:00',
    horaFin: '10:00',
  };
  let prisma: PrismaMock;
  let service: DisponibilidadAulasService;
  let observacionesService: { findRestriccionesVigentes: jest.Mock };

  beforeEach(() => {
    prisma = {
      aula: {
        findMany: jest.fn().mockResolvedValue([aula]),
        findUnique: jest.fn().mockResolvedValue(aula),
      },
      observacion: { findFirst: jest.fn().mockResolvedValue(null) },
      claseProgramada: { findFirst: jest.fn().mockResolvedValue(null) },
      prestamoDocente: { findFirst: jest.fn().mockResolvedValue(null) },
      practicaLibre: { findFirst: jest.fn().mockResolvedValue(null) },
      tarea: { findFirst: jest.fn().mockResolvedValue(null) },
      limpieza: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    observacionesService = {
      findRestriccionesVigentes: jest.fn().mockResolvedValue([]),
    };
    service = new DisponibilidadAulasService(
      prisma as unknown as PrismaService,
      observacionesService as unknown as ObservacionesService,
    );
  });

  it('retorna disponible cuando el bloque no tiene actividades', async () => {
    const result = await service.findOne(aula.id, bloque);

    expect(result.estadoCalculado).toBe('disponible');
    expect(result.bloque).toEqual({
      ...bloque,
      duracionHoras: 2,
    });
    expect(result.persistido).toBe(false);
  });

  it('hace prevalecer mantenimiento sobre una clase programada', async () => {
    prisma.aula.findUnique.mockResolvedValue({
      ...aula,
      estado: EstadoAula.MANTENIMIENTO,
    });
    prisma.claseProgramada.findFirst.mockResolvedValueOnce({
      id: 'clase-id',
      grupo: '020-81',
      docente: { nombre: 'Docente Uno' },
      asignatura: { nombre: 'Programación' },
      asistencias: [],
    });

    const result = await service.findOne(aula.id, bloque);

    expect(result.estadoCalculado).toBe('mantenimiento');
    expect(result.bloqueActual?.tipo).toBe('estado-aula');
  });

  it('mantiene ocupada una clase aunque el docente figure ausente', async () => {
    prisma.claseProgramada.findFirst.mockResolvedValueOnce({
      id: 'clase-id',
      grupo: '020-81',
      docente: { nombre: 'Docente Uno' },
      asignatura: { nombre: 'Programación' },
      asistencias: [{ estado: EstadoAsistencia.AUSENTE }],
    });

    const result = await service.findOne(aula.id, bloque);

    expect(result.estadoCalculado).toBe('ocupada');
    expect(result.fuentes[0].estado).toBe(EstadoAsistencia.AUSENTE);
  });

  it('bloquea y explica una restriccion vigente del modulo de observaciones', async () => {
    observacionesService.findRestriccionesVigentes.mockResolvedValueOnce([
      {
        id: 'restriccion-id',
        tipo: 'RESTRICCION',
        contenido: 'Aula cerrada por mantenimiento de red',
      },
    ]);

    const result = await service.findOne(aula.id, bloque);

    expect(result.estadoCalculado).toBe('bloqueada');
    expect(result.fuentes[0]).toMatchObject({
      tipo: 'restriccion',
      id: 'restriccion-id',
      descripcion: 'Aula cerrada por mantenimiento de red',
    });
  });

  it('bloquea el aula cuando existe una limpieza programada en el bloque', async () => {
    prisma.limpieza.findFirst.mockResolvedValueOnce({
      id: 'limpieza-id',
      observacion: 'Limpieza profunda',
    });

    const result = await service.findOne(aula.id, bloque);

    expect(result.estadoCalculado).toBe('bloqueada');
    expect(result.fuentes[0]).toMatchObject({
      tipo: 'limpieza-programada',
      id: 'limpieza-id',
    });
  });

  it('informa la siguiente actividad posterior al bloque', async () => {
    prisma.claseProgramada.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'clase-siguiente',
        grupo: '020-82',
        horaInicio: new Date('1970-01-01T10:00:00.000Z'),
        horaFin: new Date('1970-01-01T12:00:00.000Z'),
        docente: { nombre: 'Docente Dos' },
        asignatura: { nombre: 'Bases de datos' },
      });

    const result = await service.findOne(aula.id, bloque);

    expect(result.siguienteActividad).toMatchObject({
      tipo: 'clase-programada',
      id: 'clase-siguiente',
      horaInicio: '10:00',
      horaFin: '12:00',
    });
  });

  it('construye el resumen diario en ocho bloques no persistidos', async () => {
    const result = await service.findResumenDia({ fecha: bloque.fecha });

    expect(result.rangoOperativo).toEqual({
      horaInicio: '06:00',
      horaFin: '22:00',
      duracionBloqueHoras: 2,
    });
    expect(result.bloques).toHaveLength(8);
    expect(result.bloques[0]).toMatchObject({
      horaInicio: '06:00',
      horaFin: '08:00',
    });
    expect(result.bloques[7]).toMatchObject({
      horaInicio: '20:00',
      horaFin: '22:00',
    });
    expect(result.persistido).toBe(false);
  });

  it('calcula todas las aulas sin guardar resultados', async () => {
    const result = await service.findAll(bloque);

    expect(result).toHaveLength(1);
    expect(result[0].persistido).toBe(false);
    expect(prisma.aula.findMany).toHaveBeenCalledTimes(1);
  });

  it('rechaza rangos que no duren exactamente dos horas', async () => {
    await expect(
      service.findOne(aula.id, { ...bloque, horaFin: '12:00' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza bloques que comienzan en una hora impar', async () => {
    await expect(
      service.findOne(aula.id, {
        ...bloque,
        horaInicio: '09:00',
        horaFin: '11:00',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
