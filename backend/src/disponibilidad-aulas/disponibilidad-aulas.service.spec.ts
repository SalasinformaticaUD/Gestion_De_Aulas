import { BadRequestException } from '@nestjs/common';
import { EstadoAsistencia, EstadoAula } from '../../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service';
import { DisponibilidadAulasService } from './disponibilidad-aulas.service';

type PrismaMock = {
  aula: { findMany: jest.Mock; findUnique: jest.Mock };
  observacion: { findFirst: jest.Mock };
  claseProgramada: { findFirst: jest.Mock };
  prestamoDocente: { findFirst: jest.Mock };
  practicaLibre: { findFirst: jest.Mock };
  tarea: { findFirst: jest.Mock };
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
    };
    service = new DisponibilidadAulasService(
      prisma as unknown as PrismaService,
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
    prisma.claseProgramada.findFirst.mockResolvedValue({
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
    prisma.claseProgramada.findFirst.mockResolvedValue({
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
