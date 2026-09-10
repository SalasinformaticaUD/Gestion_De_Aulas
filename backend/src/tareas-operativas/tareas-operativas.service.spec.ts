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
    tarea: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
    aula: { findUnique: jest.fn() },
    prestamoDocente: { findFirst: jest.fn() },
    practicaLibre: { findFirst: jest.fn() },
    claseProgramada: { findFirst: jest.fn() },
    usuario: { findMany: jest.fn() },
    $transaction: jest.fn(),
  } as unknown as ConstructorParameters<typeof TareasOperativasService>[0];
  const registrar = jest.fn();
  const auditoria = { registrar } as unknown as ConstructorParameters<typeof TareasOperativasService>[1];
  const service = new TareasOperativasService(prisma, auditoria);

  beforeEach(() => jest.clearAllMocks());

  it('no permite completar una tarea pendiente', async () => {
    (prisma.tarea.findUnique as jest.Mock<any>).mockResolvedValue(tarea);
    await expect(service.cambiarEstado(tarea.id, EstadoTarea.COMPLETADA)).rejects.toBeInstanceOf(ConflictException);
  });

  it('expone responsables activos con datos mínimos para el módulo', async () => {
    (prisma.usuario.findMany as jest.Mock<any>).mockResolvedValue([{ id: 'usuario-1', nombreCompleto: 'Persona activa' }]);

    await expect(service.listarResponsables()).resolves.toEqual([{ id: 'usuario-1', nombreCompleto: 'Persona activa' }]);
    expect(prisma.usuario.findMany).toHaveBeenCalledWith({
      where: { estado: 'ACTIVA' },
      select: { id: true, nombreCompleto: true },
      orderBy: { nombreCompleto: 'asc' },
    });
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

  it('no permite completar una tarea en proceso sin informe de seguimiento', async () => {
    (prisma.tarea.findUnique as jest.Mock<any>).mockResolvedValue({ ...tarea, estado: EstadoTarea.EN_PROCESO, informes: [] });
    await expect(service.cambiarEstado(tarea.id, EstadoTarea.COMPLETADA)).rejects.toThrow('Debe registrar un informe de seguimiento antes de completar la tarea.');
  });

  it('completa una tarea en proceso sin acciones pendientes y registra auditoría', async () => {
    const enProceso = { ...tarea, estado: EstadoTarea.EN_PROCESO, informes: [{ accionesPendientes: null }] };
    (prisma.tarea.findUnique as jest.Mock<any>).mockResolvedValue(enProceso);
    (prisma.tarea.update as jest.Mock<any>).mockResolvedValue({ ...enProceso, estado: EstadoTarea.COMPLETADA });
    await service.cambiarEstado(tarea.id, EstadoTarea.COMPLETADA, 'usuario');
    expect(registrar).toHaveBeenCalledWith(expect.objectContaining({ entidad: 'Tarea', accion: 'UPDATE' }));
  });

  it('completa solo la sala elegida de un grupo y conserva intacta su tarea hermana', async () => {
    const grupoId = '33333333-3333-4333-8333-333333333333';
    const salaA = { ...tarea, id: '11111111-1111-4111-8111-111111111111', aulaId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', grupoId, estado: EstadoTarea.EN_PROCESO, informes: [{ accionesPendientes: null }] };
    const salaB = { ...tarea, id: '22222222-2222-4222-8222-222222222222', aulaId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', grupoId, estado: EstadoTarea.EN_PROCESO, informes: [] };
    (prisma.tarea.findUnique as jest.Mock<any>).mockResolvedValue(salaA);
    (prisma.tarea.update as jest.Mock<any>).mockResolvedValue({ ...salaA, estado: EstadoTarea.COMPLETADA });

    await service.cambiarEstado(salaA.id, EstadoTarea.COMPLETADA, 'usuario-prueba');

    expect(prisma.tarea.update).toHaveBeenCalledTimes(1);
    expect(prisma.tarea.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: salaA.id } }));
    expect(prisma.tarea.update).not.toHaveBeenCalledWith(expect.objectContaining({ where: { id: salaB.id } }));
    expect(registrar).toHaveBeenCalledWith(expect.objectContaining({ entidadId: salaA.id, accion: 'UPDATE' }));
  });

  it('crea una tarea independiente por cada aula seleccionada', async () => {
    const aulaIds = [
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
    ];
    (prisma.aula.findUnique as jest.Mock<any>).mockResolvedValue({ id: aulaIds[0] });
    (prisma.prestamoDocente.findFirst as jest.Mock<any>).mockResolvedValue(null);
    (prisma.practicaLibre.findFirst as jest.Mock<any>).mockResolvedValue(null);
    (prisma.claseProgramada.findFirst as jest.Mock<any>).mockResolvedValue(null);
    (prisma.tarea.findFirst as jest.Mock<any>).mockResolvedValue(null);
    (prisma.tarea.create as jest.Mock<any>).mockImplementation(({ data }) => Promise.resolve({ id: `tarea-${data.aulaId}`, ...data }));
    (prisma.$transaction as jest.Mock<any>).mockImplementation((callback) => callback({ tarea: { create: prisma.tarea.create } }));

    const creadas = await service.create({ titulo: 'Revisión de equipos', aulaIds }, 'usuario-actual');

    expect(Array.isArray(creadas)).toBe(true);
    expect(prisma.tarea.create).toHaveBeenCalledTimes(2);
    const primera = (prisma.tarea.create as jest.Mock<any>).mock.calls[0][0].data;
    const segunda = (prisma.tarea.create as jest.Mock<any>).mock.calls[1][0].data;
    expect(primera.aulaId).toBe(aulaIds[0]);
    expect(segunda.aulaId).toBe(aulaIds[1]);
      expect(primera.grupoId).toEqual(expect.any(String));
      expect(segunda.grupoId).toBe(primera.grupoId);
    expect(primera).not.toHaveProperty('aulaIds');
    expect(registrar).toHaveBeenCalledTimes(2);
  });
});
