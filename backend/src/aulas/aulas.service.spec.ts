import { ConflictException, NotFoundException } from '@nestjs/common';
import { EstadoAula } from '../../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service';
import { AulasService } from './aulas.service';

describe('AulasService', () => {
  let service: AulasService;
  let prisma: {
    aula: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    proyectoCurricular: {
      findUnique: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      aula: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      proyectoCurricular: {
        findUnique: jest.fn(),
      },
    };

    service = new AulasService(prisma as unknown as PrismaService);
  });

  it('normaliza los textos antes de crear un aula', async () => {
    prisma.aula.create.mockResolvedValue({ id: 'aula-id' });

    await service.create({
      codigo: ' LAB-01 ',
      ubicacion: ' Edificio Sabio Caldas, piso 2 ',
      capacidad: 25,
    });

    expect(prisma.aula.create).toHaveBeenCalledWith({
      data: {
        codigo: 'LAB-01',
        ubicacion: 'Edificio Sabio Caldas, piso 2',
        capacidad: 25,
      },
    });
  });

  it('traduce un código duplicado a conflicto HTTP', async () => {
    prisma.aula.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.create({
        codigo: 'LAB-01',
        ubicacion: 'Piso 2',
        capacidad: 25,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('aplica filtros compatibles de estado, ubicación, proyecto, código y capacidad', async () => {
    prisma.aula.findMany.mockResolvedValue([]);

    await service.findAll({
      estado: EstadoAula.OPERATIVA,
      ubicacion: 'piso 2',
      proyectoCurricularId: '00000000-0000-4000-8000-000000000001',
      codigo: 'lab',
      capacidadMin: 20,
      capacidadMax: 40,
    });

    expect(prisma.aula.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          estado: EstadoAula.OPERATIVA,
          ubicacion: { contains: 'piso 2', mode: 'insensitive' },
          codigo: { contains: 'lab', mode: 'insensitive' },
          capacidad: { gte: 20, lte: 40 },
          OR: expect.any(Array),
        }),
      }),
    );
  });

  it('retorna 404 cuando el aula no existe', async () => {
    prisma.aula.findUnique.mockResolvedValue(null);

    await expect(service.findOne('aula-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('expone el contrato minimo acordado con software e historial basico', async () => {
    prisma.aula.findUnique.mockResolvedValue({
      id: 'aula-id',
      codigo: 'LAB-401',
      ubicacion: 'Edificio Sabio de Caldas, Piso 4',
      capacidad: 40,
      caracteristicas: { hardware: '40 equipos de cómputo' },
      estado: EstadoAula.OPERATIVA,
      proyectoCurricular: { id: 'proyecto-id', nombre: 'Sistemas' },
      softwares: [
        {
          instaladoEn: new Date('2026-08-20T14:00:00.000Z'),
          software: {
            id: 'software-id',
            nombre: 'PostgreSQL',
            version: '17',
            descripcion: null,
          },
        },
      ],
      observaciones: [
        {
          id: 'observacion-id',
          tipo: 'NOVEDAD',
          contenido: 'Equipo 12 en revisión.',
          creadoEn: new Date('2026-08-21T14:00:00.000Z'),
        },
      ],
      tareas: [],
      limpiezas: [],
      practicasLibres: [],
      prestamosDocentes: [],
      creadoEn: new Date('2026-01-01T00:00:00.000Z'),
      actualizadoEn: new Date('2026-08-21T14:00:00.000Z'),
    });

    const result = await service.findOne('aula-id');

    expect(result).toMatchObject({
      codigo: 'LAB-401',
      ubicacion: 'Edificio Sabio de Caldas, Piso 4',
      piso: 4,
      capacidad: 40,
      estado: EstadoAula.OPERATIVA,
      caracteristicas: { hardware: '40 equipos de cómputo' },
      software: [
        expect.objectContaining({ nombre: 'PostgreSQL', version: '17' }),
      ],
    });
    expect(result).not.toHaveProperty('softwares');
    expect(result.historial).toEqual([
      expect.objectContaining({
        tipo: 'OBSERVACION',
        descripcion: 'NOVEDAD: Equipo 12 en revisión.',
      }),
      expect.objectContaining({ tipo: 'SOFTWARE_INSTALADO' }),
    ]);
  });

  it('actualiza un aula existente', async () => {
    prisma.aula.findUnique.mockResolvedValue({ id: 'aula-id' });
    prisma.aula.update.mockResolvedValue({
      id: 'aula-id',
      estado: EstadoAula.MANTENIMIENTO,
    });

    await service.update('aula-id', {
      estado: EstadoAula.MANTENIMIENTO,
    });

    expect(prisma.aula.update).toHaveBeenCalledWith({
      where: { id: 'aula-id' },
      data: { estado: EstadoAula.MANTENIMIENTO },
    });
  });

  it('bloquea la eliminación cuando existe historial operativo', async () => {
    prisma.aula.findUnique.mockResolvedValue({
      id: 'aula-id',
      _count: {
        clases: 1,
        practicasLibres: 0,
        prestamosDocentes: 0,
        prestamosAudiovisuales: 0,
        observaciones: 0,
        tareas: 0,
      },
    });

    await expect(service.remove('aula-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.aula.delete).not.toHaveBeenCalled();
  });

  it('elimina un aula sin historial operativo', async () => {
    prisma.aula.findUnique.mockResolvedValue({
      id: 'aula-id',
      _count: {
        clases: 0,
        practicasLibres: 0,
        prestamosDocentes: 0,
        prestamosAudiovisuales: 0,
        observaciones: 0,
        tareas: 0,
      },
    });
    prisma.aula.delete.mockResolvedValue({ id: 'aula-id' });

    await service.remove('aula-id');

    expect(prisma.aula.delete).toHaveBeenCalledWith({
      where: { id: 'aula-id' },
    });
  });
});
