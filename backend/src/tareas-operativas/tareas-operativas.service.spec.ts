import { ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { EstadoTarea } from '../../generated/prisma/enums.js';
import { TareasOperativasService } from './tareas-operativas.service';

describe('TareasOperativasService', () => {
  const tarea = {
    id: '11111111-1111-4111-8111-111111111111',
    estado: EstadoTarea.PENDIENTE,
    aulaId: null,
    responsableId: null,
    afectaDisponibilidad: false,
    inicio: null,
    fin: null,
  };
  const prisma = {
    tarea: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    aula: { findUnique: jest.fn() },
    usuario: { findUnique: jest.fn() },
  } as unknown as ConstructorParameters<typeof TareasOperativasService>[0];
  const registrar = jest.fn();
  const auditoria = {
    registrar,
  } as unknown as ConstructorParameters<typeof TareasOperativasService>[1];
  const service = new TareasOperativasService(prisma, auditoria);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rechaza completar una tarea cancelada', async () => {
    (prisma.tarea.findUnique as jest.Mock<any>).mockResolvedValue({
      ...tarea,
      estado: EstadoTarea.CANCELADA,
    });
    await expect(
      service.cambiarEstado(tarea.id, EstadoTarea.COMPLETADA),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('solo permite cancelar una tarea completada al administrador', async () => {
    (prisma.tarea.findUnique as jest.Mock<any>).mockResolvedValue({
      ...tarea,
      estado: EstadoTarea.COMPLETADA,
    });
    await expect(
      service.cambiarEstado(tarea.id, EstadoTarea.CANCELADA),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('registra auditoría al cambiar el estado', async () => {
    (prisma.tarea.findUnique as jest.Mock<any>).mockResolvedValue(tarea);
    (prisma.tarea.update as unknown as jest.Mock<any>).mockResolvedValue({
      ...tarea,
      estado: EstadoTarea.EN_PROCESO,
    });
    await service.cambiarEstado(tarea.id, EstadoTarea.EN_PROCESO, 'usuario');
    expect(registrar).toHaveBeenCalledWith(
      expect.objectContaining({ entidad: 'Tarea', accion: 'UPDATE' }),
    );
  });
});
