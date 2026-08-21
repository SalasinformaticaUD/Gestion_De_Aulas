import { ConflictException } from '@nestjs/common';
import { EstadoPrestamo } from '../../generated/prisma/enums.js';
import { DisponibilidadAulasService } from '../disponibilidad-aulas/disponibilidad-aulas.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrestamosDocentesService } from './prestamos-docentes.service';

describe('PrestamosDocentesService', () => {
  const dto = {
    docenteId: '00000000-0000-4000-8000-000000000002',
    aulaId: '00000000-0000-4000-8000-000000000001',
    inicio: '2026-08-20T08:00:00-05:00',
    fin: '2026-08-20T10:00:00-05:00',
    motivo: 'Semillero de investigación',
  };
  const prisma = {
    docente: { findUnique: jest.fn() },
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
    jest.clearAllMocks();
    prisma.docente.findUnique.mockResolvedValue({ id: dto.docenteId });
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
    });
    service = new PrestamosDocentesService(
      prisma as unknown as PrismaService,
      disponibilidad as unknown as DisponibilidadAulasService,
    );
  });

  it('crea una solicitud para docente y aula disponibles', async () => {
    await expect(service.create(dto)).resolves.toMatchObject({
      estado: EstadoPrestamo.SOLICITADO,
    });
    expect(disponibilidad.findOne).toHaveBeenCalledWith(dto.aulaId, {
      fecha: '2026-08-20',
      horaInicio: '08:00',
      horaFin: '10:00',
    });
  });

  it('rechaza la solicitud cuando disponibilidad reporta ocupación', async () => {
    disponibilidad.findOne.mockResolvedValue({
      estadoCalculado: 'ocupada',
      motivo: 'Existe una clase programada.',
    });

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
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
