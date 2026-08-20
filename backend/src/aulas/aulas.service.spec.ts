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

  it('aplica los filtros de estado, ubicación y proyecto curricular', async () => {
    prisma.aula.findMany.mockResolvedValue([]);

    await service.findAll({
      estado: EstadoAula.OPERATIVA,
      ubicacion: 'piso 2',
      proyectoCurricularId: '00000000-0000-4000-8000-000000000001',
    });

    expect(prisma.aula.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          estado: EstadoAula.OPERATIVA,
          ubicacion: { contains: 'piso 2', mode: 'insensitive' },
          proyectoCurricularId: '00000000-0000-4000-8000-000000000001',
        },
      }),
    );
  });

  it('retorna 404 cuando el aula no existe', async () => {
    prisma.aula.findUnique.mockResolvedValue(null);

    await expect(service.findOne('aula-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
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
