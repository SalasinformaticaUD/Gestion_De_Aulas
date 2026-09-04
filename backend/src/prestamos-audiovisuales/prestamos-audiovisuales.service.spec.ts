import { ConflictException } from '@nestjs/common';
import { EstadoEquipo, EstadoPrestamo } from '@prisma/client';
import * as XLSX from 'xlsx';
import { PrestamosAudiovisualesService } from './prestamos-audiovisuales.service';

describe('PrestamosAudiovisualesService', () => {
  const ids = {
    docente: '00000000-0000-4000-8000-000000000001',
    aula: '00000000-0000-4000-8000-000000000002',
    equipo: '00000000-0000-4000-8000-000000000003',
    prestamo: '00000000-0000-4000-8000-000000000004',
    usuario: '00000000-0000-4000-8000-000000000005',
  };
  const tx = {
    docente: { findUnique: jest.fn() },
    aula: { findUnique: jest.fn() },
    usuario: { findUnique: jest.fn() },
    equipoAudiovisual: {
      create: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    prestamoAudiovisual: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    detallePrestamoAudiovisual: { update: jest.fn() },
  };
  const prisma = {
    ...tx,
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  };
  const auditoria = { registrar: jest.fn() };
  const service = new PrestamosAudiovisualesService(
    prisma as never,
    auditoria as never,
  );
  const dto = {
    docenteId: ids.docente,
    aulaId: ids.aula,
    docenteNombre: 'Laura Gómez',
    docenteDocumento: '10203040',
    salonTexto: 'Auditorio 1',
    salidaEn: '2026-08-20T08:00:00.000Z',
    devolucionEstimada: '2026-08-20T10:00:00.000Z',
    equipos: [
      {
        equipoId: ids.equipo,
        estadoFisicoSalida: 'BUENO',
        estadoFuncionalSalida: 'DISPONIBLE',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    tx.docente.findUnique.mockResolvedValue({ id: ids.docente });
    tx.aula.findUnique.mockResolvedValue({ id: ids.aula });
    tx.usuario.findUnique.mockResolvedValue({ id: ids.usuario });
    tx.equipoAudiovisual.findMany.mockResolvedValue([
      {
        id: ids.equipo,
        estado: EstadoEquipo.DISPONIBLE,
        detallesPrestamo: [],
      },
    ]);
    tx.equipoAudiovisual.updateMany.mockResolvedValue({ count: 1 });
    tx.prestamoAudiovisual.create.mockResolvedValue({
      id: ids.prestamo,
      estado: EstadoPrestamo.ACTIVO,
    });
  });

  it('presta un equipo disponible y lo reserva dentro de la transacción', async () => {
    const resultado = await service.create(dto, ids.usuario);
    expect(resultado).toEqual(
      expect.objectContaining({
        id: ids.prestamo,
        estado: EstadoPrestamo.ACTIVO,
      }),
    );
    expect(tx.equipoAudiovisual.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: ids.equipo,
          estado: EstadoEquipo.DISPONIBLE,
        }),
        data: { estado: EstadoEquipo.PRESTADO },
      }),
    );
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        entidad: 'PrestamoAudiovisual',
        accion: 'CREATE',
      }),
    );
  });

  it('bloquea el préstamo cuando el equipo ya está prestado', async () => {
    tx.equipoAudiovisual.findMany.mockResolvedValue([
      { id: ids.equipo, estado: EstadoEquipo.PRESTADO, detallesPrestamo: [] },
    ]);
    await expect(service.create(dto, ids.usuario)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(tx.prestamoAudiovisual.create).not.toHaveBeenCalled();
  });

  it('bloquea durante 20 minutos un videobeam recién devuelto', async () => {
    tx.equipoAudiovisual.findMany.mockResolvedValue([
      {
        id: ids.equipo,
        estado: EstadoEquipo.DISPONIBLE,
        detallesPrestamo: [{ equipoId: ids.equipo }],
      },
    ]);

    await expect(service.create(dto, ids.usuario)).rejects.toThrow(
      'periodo de enfriamiento de 20 minutos',
    );
    expect(tx.equipoAudiovisual.updateMany).not.toHaveBeenCalled();
  });

  it('permite prestar accesorios sin videobeam', async () => {
    await service.create(
      {
        ...dto,
        equipos: [],
        elementosAdicionales: ['HDMI', 'Parlantes'],
      },
      ids.usuario,
    );
    expect(tx.equipoAudiovisual.updateMany).not.toHaveBeenCalled();
    expect(tx.prestamoAudiovisual.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          elementosAdicionales: ['HDMI', 'Parlantes'],
        }),
      }),
    );
  });

  it('carga videobeams desde Marca, Numero Interno y Modelo', async () => {
    const hoja = XLSX.utils.json_to_sheet([
      { Marca: 'Epson', 'Numero Interno': 'VB-001', Modelo: 'X49' },
    ]);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Videobeams');
    const buffer = XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' });
    tx.equipoAudiovisual.findMany.mockResolvedValue([]);
    tx.equipoAudiovisual.create.mockResolvedValue({
      id: ids.equipo,
      codigoInventario: 'VB-001',
    });
    prisma.$transaction.mockImplementationOnce((operations: unknown[]) =>
      Promise.all(operations),
    );

    const result = await service.importarEquipos(
      { buffer, originalname: 'videobeams.xlsx' },
      ids.usuario,
    );

    expect(result.creados).toBe(1);
    expect(tx.equipoAudiovisual.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        codigoInventario: 'VB-001',
        marca: 'Epson',
        modelo: 'X49',
        tipo: 'Videobeam',
      }),
    });
  });

  it('devuelve el equipo y restituye su estado según la revisión', async () => {
    tx.prestamoAudiovisual.findUnique.mockResolvedValue({
      id: ids.prestamo,
      estado: EstadoPrestamo.ACTIVO,
      salidaEn: new Date(dto.salidaEn),
      detalles: [{ equipoId: ids.equipo }],
    });
    tx.prestamoAudiovisual.update.mockResolvedValue({
      id: ids.prestamo,
      estado: EstadoPrestamo.DEVUELTO,
    });
    const resultado = await service.devolver(
      ids.prestamo,
      {
        devolucionReal: '2026-08-20T09:00:00.000Z',
        devolucionCompleta: true,
        equipos: [
          {
            equipoId: ids.equipo,
            estadoFisicoDevolucion: 'BUENO',
            estadoFuncionalDevolucion: 'DISPONIBLE',
          },
        ],
      },
      ids.usuario,
    );
    expect(resultado.estado).toBe(EstadoPrestamo.DEVUELTO);
    expect(tx.equipoAudiovisual.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { estado: EstadoEquipo.DISPONIBLE } }),
    );
  });

  it('marca el préstamo como devuelto incompleto cuando falta algo', async () => {
    tx.prestamoAudiovisual.findUnique.mockResolvedValue({
      id: ids.prestamo,
      estado: EstadoPrestamo.ACTIVO,
      salidaEn: new Date(dto.salidaEn),
      detalles: [{ equipoId: ids.equipo }],
    });
    tx.prestamoAudiovisual.update.mockResolvedValue({
      id: ids.prestamo,
      estado: EstadoPrestamo.DEVUELTO_INCOMPLETO,
    });

    await service.devolver(
      ids.prestamo,
      {
        devolucionReal: '2026-08-20T09:00:00.000Z',
        devolucionCompleta: false,
        observaciones: 'No se devolvió el cable HDMI.',
        equipos: [
          {
            equipoId: ids.equipo,
            estadoFisicoDevolucion: 'Devolución incompleta',
            estadoFuncionalDevolucion: 'DISPONIBLE',
          },
        ],
      },
      ids.usuario,
    );

    expect(tx.prestamoAudiovisual.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estado: EstadoPrestamo.DEVUELTO_INCOMPLETO,
          devolucionCompleta: false,
        }),
      }),
    );
    expect(tx.equipoAudiovisual.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { estado: EstadoEquipo.MANTENIMIENTO } }),
    );
  });

  it('expone para Core los préstamos de un aula en el día solicitado', async () => {
    tx.aula.findUnique.mockResolvedValue({ id: ids.aula });
    prisma.prestamoAudiovisual.findMany.mockResolvedValue([]);
    await service.findPrestamosPorAulaYDia(ids.aula, '2026-08-20');
    expect(prisma.prestamoAudiovisual.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ aulaId: ids.aula }),
      }),
    );
  });
});
