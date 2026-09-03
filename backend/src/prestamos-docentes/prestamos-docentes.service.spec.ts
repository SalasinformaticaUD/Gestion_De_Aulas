import { ConflictException } from '@nestjs/common';
import { EstadoPrestamo } from '../../generated/prisma/enums.js';
import { DisponibilidadAulasService } from '../disponibilidad-aulas/disponibilidad-aulas.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrestamosDocentesService } from './prestamos-docentes.service';

describe('PrestamosDocentesService', () => {
  const dto = {
    docenteId: '00000000-0000-4000-8000-000000000002',
    aulaId: '00000000-0000-4000-8000-000000000001',
    softwareId: '00000000-0000-4000-8000-000000000004',
    inicio: '2026-08-20T08:00:00-05:00',
    fin: '2026-08-20T10:00:00-05:00',
    motivo: 'Semillero de investigación',
  };
  const prisma = {
    docente: { findUnique: jest.fn(), create: jest.fn() },
    software: { findUnique: jest.fn() },
    aulaSoftware: { findUnique: jest.fn() },
    prestamoDocente: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  const disponibilidad = { findOne: jest.fn() };
  let service: PrestamosDocentesService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-19T12:00:00-05:00'));
    jest.clearAllMocks();
    prisma.docente.findUnique.mockResolvedValue({ id: dto.docenteId });
    prisma.docente.create.mockResolvedValue({ id: dto.docenteId });
    prisma.software.findUnique.mockResolvedValue({
      nombre: 'AutoCAD',
      estado: 'ACTIVO',
    });
    prisma.aulaSoftware.findUnique.mockResolvedValue({ aulaId: dto.aulaId });
    prisma.prestamoDocente.create.mockResolvedValue({
      id: 'prestamo-id',
      estado: EstadoPrestamo.SOLICITADO,
    });
    prisma.prestamoDocente.findFirst.mockResolvedValue(null);
    prisma.prestamoDocente.update.mockImplementation(
      ({ data }: { data: { estado: EstadoPrestamo } }) =>
        Promise.resolve({ id: 'prestamo-id', estado: data.estado }),
    );
    disponibilidad.findOne.mockResolvedValue({
      estadoCalculado: 'disponible',
      motivo: 'Sin actividades.',
      fuentes: [],
    });
    service = new PrestamosDocentesService(
      prisma as unknown as PrismaService,
      disponibilidad as unknown as DisponibilidadAulasService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('crea una solicitud para docente y aula disponibles', async () => {
    await expect(
      service.create(dto, '00000000-0000-4000-8000-000000000003'),
    ).resolves.toMatchObject({
      estado: EstadoPrestamo.SOLICITADO,
    });
    expect(disponibilidad.findOne).toHaveBeenCalledWith(dto.aulaId, {
      fecha: '2026-08-20',
      horaInicio: '08:00',
      horaFin: '10:00',
    });
    expect(prisma.prestamoDocente.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          docenteId: dto.docenteId,
          encargadoId: '00000000-0000-4000-8000-000000000003',
        }),
      }),
    );
  });

  it('rechaza la solicitud si el aula tiene una clase, aunque el docente esté ausente', async () => {
    disponibilidad.findOne.mockResolvedValue({
      estadoCalculado: 'disponible',
      motivo: 'La asistencia del docente está ausente.',
      fuentes: [{ tipo: 'clase-programada', estado: 'AUSENTE' }],
    });

    await expect(
      service.create(dto, '00000000-0000-4000-8000-000000000003'),
    ).rejects.toThrow('El aula tiene una clase programada para este bloque');
    expect(prisma.prestamoDocente.create).not.toHaveBeenCalled();
  });

  it('rechaza la solicitud cuando no se puede identificar al encargado autenticado', async () => {
    await expect(service.create(dto)).rejects.toThrow(
      'No fue posible identificar al encargado de la solicitud.',
    );
    expect(prisma.prestamoDocente.create).not.toHaveBeenCalled();
  });

  it('rechaza software sin licencia antes de crear la solicitud', async () => {
    prisma.software.findUnique.mockResolvedValue({
      nombre: 'AutoCAD',
      estado: 'SIN_LICENCIA',
    });

    await expect(
      service.create(dto, '00000000-0000-4000-8000-000000000003'),
    ).rejects.toThrow('no tiene licencia vigente');
    expect(prisma.prestamoDocente.create).not.toHaveBeenCalled();
  });

  it('rechaza un bloque actual al que le quedan menos de 30 minutos', async () => {
    jest.setSystemTime(new Date('2026-08-20T09:35:00-05:00'));

    await expect(
      service.create(dto, '00000000-0000-4000-8000-000000000003'),
    ).rejects.toThrow('le quedan menos de 30 minutos');
    expect(prisma.prestamoDocente.create).not.toHaveBeenCalled();
  });

  it('resuelve un profesor externo por cédula y conserva el encargado autenticado', async () => {
    const docenteExterno = {
      aulaId: dto.aulaId,
      softwareId: dto.softwareId,
      docenteNuevoNombre: 'Profesora invitada',
      docenteNuevoDocumento: '90000001',
      inicio: dto.inicio,
      fin: dto.fin,
    };
    prisma.docente.findUnique.mockResolvedValue({ id: 'docente-externo-id' });

    await expect(
      service.create(docenteExterno, '00000000-0000-4000-8000-000000000003'),
    ).resolves.toMatchObject({ estado: EstadoPrestamo.SOLICITADO });
    expect(prisma.docente.findUnique).toHaveBeenCalledWith({
      where: { documento: '90000001' },
      select: { id: true },
    });
    expect(prisma.prestamoDocente.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          docenteId: 'docente-externo-id',
          encargadoId: '00000000-0000-4000-8000-000000000003',
        }),
      }),
    );
  });

  it('rechaza la solicitud cuando disponibilidad reporta ocupación', async () => {
    disponibilidad.findOne.mockResolvedValue({
      estadoCalculado: 'ocupada',
      motivo: 'Existe una clase programada.',
      fuentes: [{ tipo: 'clase-programada' }],
    });

    await expect(
      service.create(dto, '00000000-0000-4000-8000-000000000003'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.prestamoDocente.create).not.toHaveBeenCalled();
  });

  it('rechaza la aprobación cuando existe otro préstamo cruzado', async () => {
    prisma.prestamoDocente.findUnique.mockResolvedValue({
      id: 'prestamo-id',
      aulaId: dto.aulaId,
      inicio: new Date(dto.inicio),
      fin: new Date(dto.fin),
      estado: EstadoPrestamo.SOLICITADO,
    });
    prisma.prestamoDocente.findFirst.mockResolvedValue({ id: 'conflicto-id' });

    await expect(service.approve('prestamo-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.prestamoDocente.update).not.toHaveBeenCalled();
  });

  it('aprueba una solicitud sin conflictos', async () => {
    prisma.prestamoDocente.findUnique.mockResolvedValue({
      id: 'prestamo-id',
      aulaId: dto.aulaId,
      inicio: new Date(dto.inicio),
      fin: new Date(dto.fin),
      estado: EstadoPrestamo.SOLICITADO,
    });

    await expect(service.approve('prestamo-id')).resolves.toMatchObject({
      estado: EstadoPrestamo.APROBADO,
    });
  });

  it('cancela una solicitud y finaliza un préstamo aprobado', async () => {
    prisma.prestamoDocente.findUnique
      .mockResolvedValueOnce({
        id: 'prestamo-id',
        aulaId: dto.aulaId,
        inicio: new Date(dto.inicio),
        fin: new Date(dto.fin),
        estado: EstadoPrestamo.SOLICITADO,
      })
      .mockResolvedValueOnce({
        id: 'prestamo-id',
        aulaId: dto.aulaId,
        inicio: new Date(dto.inicio),
        fin: new Date(dto.fin),
        estado: EstadoPrestamo.APROBADO,
      });

    await expect(service.cancel('prestamo-id')).resolves.toMatchObject({
      estado: EstadoPrestamo.CANCELADO,
    });
    await expect(service.finish('prestamo-id')).resolves.toMatchObject({
      estado: EstadoPrestamo.DEVUELTO,
    });
  });

  it('consulta préstamos aprobados o activos para el panel del día', async () => {
    prisma.prestamoDocente.findMany.mockResolvedValue([]);

    await service.findUpcomingForDate('2026-08-20');

    expect(prisma.prestamoDocente.findMany).toHaveBeenCalledTimes(1);
  });
});
