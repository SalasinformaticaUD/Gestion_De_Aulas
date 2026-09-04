import { BadRequestException, ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { EstadoTarea } from '@prisma/client';
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
    informes: [],
    responsables: [],
  };
  const prisma = {
    tarea: { findUnique: jest.fn(), update: jest.fn() },
  } as unknown as ConstructorParameters<typeof TareasOperativasService>[0];
  const registrar = jest.fn();
  const auditoria = { registrar } as unknown as ConstructorParameters<typeof TareasOperativasService>[1];
  const service = new TareasOperativasService(prisma, auditoria);

  beforeEach(() => jest.clearAllMocks());

  it('no permite completar una tarea pendiente', async () => {
    (prisma.tarea.findUnique as jest.Mock<any>).mockResolvedValue(tarea);
    await expect(service.cambiarEstado(tarea.id, EstadoTarea.COMPLETADA)).rejects.toBeInstanceOf(ConflictException);
  });

  it('no permite devolver una tarea en proceso a pendiente', async () => {
    (prisma.tarea.findUnique as jest.Mock<any>).mockResolvedValue({ ...tarea, estado: EstadoTarea.EN_PROCESO });
    await expect(service.cambiarEstado(tarea.id, EstadoTarea.PENDIENTE)).rejects.toBeInstanceOf(ConflictException);
  });

  it('mantiene completadas y canceladas como estados terminales', async () => {
    (prisma.tarea.findUnique as jest.Mock<any>).mockResolvedValue({ ...tarea, estado: EstadoTarea.COMPLETADA });
    await expect(service.cambiarEstado(tarea.id, EstadoTarea.CANCELADA, undefined, false, 'Cambio')).rejects.toBeInstanceOf(ConflictException);
  });

  it('exige un motivo para cancelar', async () => {
    (prisma.tarea.findUnique as jest.Mock<any>).mockResolvedValue(tarea);
    await expect(service.cambiarEstado(tarea.id, EstadoTarea.CANCELADA)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('no permite completar si el último informe tiene acciones pendientes', async () => {
    (prisma.tarea.findUnique as jest.Mock<any>).mockResolvedValue({ ...tarea, estado: EstadoTarea.EN_PROCESO, informes: [{ accionesPendientes: 'Revisar un equipo' }] });
    await expect(service.cambiarEstado(tarea.id, EstadoTarea.COMPLETADA)).rejects.toBeInstanceOf(ConflictException);
  });

  it('completa una tarea en proceso sin acciones pendientes y registra auditoría', async () => {
    const enProceso = { ...tarea, estado: EstadoTarea.EN_PROCESO, informes: [{ accionesPendientes: null }] };
    (prisma.tarea.findUnique as jest.Mock<any>).mockResolvedValue(enProceso);
    (prisma.tarea.update as jest.Mock<any>).mockResolvedValue({ ...enProceso, estado: EstadoTarea.COMPLETADA });
    await service.cambiarEstado(tarea.id, EstadoTarea.COMPLETADA, 'usuario');
    expect(registrar).toHaveBeenCalledWith(expect.objectContaining({ entidad: 'Tarea', accion: 'UPDATE' }));
  });
});
