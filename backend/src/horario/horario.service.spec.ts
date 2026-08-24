import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HorarioService } from './horario.service';
import * as XLSX from 'xlsx';

type PrismaMock = {
  periodoAcademico: {
    create: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    updateMany: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  aula: { findUnique: jest.Mock; findMany: jest.Mock };
  docente: { findUnique: jest.Mock; upsert: jest.Mock };
  asignatura: { findUnique: jest.Mock; upsert: jest.Mock };
  proyectoCurricular: { findUnique: jest.Mock };
  claseProgramada: {
    create: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    deleteMany: jest.Mock;
  };
  $transaction: jest.Mock;
};

describe('HorarioService', () => {
  const periodoId = '00000000-0000-4000-8000-000000000001';
  const aulaId = '00000000-0000-4000-8000-000000000002';
  const docenteId = '00000000-0000-4000-8000-000000000003';
  const asignaturaId = '00000000-0000-4000-8000-000000000004';
  let service: HorarioService;
  let prisma: PrismaMock;

  beforeEach(() => {
    prisma = {
      periodoAcademico: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({ id: periodoId }),
        updateMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      aula: {
        findUnique: jest.fn().mockResolvedValue({ id: aulaId }),
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: aulaId, codigo: 'LAB-01' }]),
      },
      docente: {
        findUnique: jest.fn().mockResolvedValue({ id: docenteId }),
        upsert: jest.fn(),
      },
      asignatura: {
        findUnique: jest.fn().mockResolvedValue({ id: asignaturaId }),
        upsert: jest.fn(),
      },
      proyectoCurricular: { findUnique: jest.fn() },
      claseProgramada: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(
      (callback: (tx: PrismaMock) => unknown) => callback(prisma),
    );
    service = new HorarioService(prisma as unknown as PrismaService);
  });

  it('importa Excel oficial solo para el período activo y filtra aulas externas', async () => {
    prisma.periodoAcademico.findUnique.mockResolvedValue({
      id: periodoId,
      activo: true,
    });
    prisma.docente.upsert.mockResolvedValue({ id: docenteId });
    prisma.asignatura.upsert.mockResolvedValue({ id: asignaturaId });
    prisma.claseProgramada.create.mockResolvedValue({ id: 'clase-excel' });
    const hoja = XLSX.utils.json_to_sheet([
      {
        AULA: 'LAB-01',
        DIA_SEMANA: 1,
        HORA_INICIO: '08:00',
        HORA_FIN: '10:00',
        GRUPO: '01',
        INSCRITOS: 20,
        DOCENTE_DOCUMENTO: '123',
        DOCENTE_NOMBRE: 'Docente',
        ASIGNATURA_CODIGO: 'ALG',
        ASIGNATURA_NOMBRE: 'Álgebra',
      },
      {
        AULA: 'AULA-EXTERNA',
        DIA_SEMANA: 1,
        HORA_INICIO: '10:00',
        HORA_FIN: '12:00',
        GRUPO: '02',
        INSCRITOS: 20,
        DOCENTE_DOCUMENTO: '456',
        DOCENTE_NOMBRE: 'Otro',
        ASIGNATURA_CODIGO: 'CAL',
        ASIGNATURA_NOMBRE: 'Cálculo',
      },
    ]);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Horario');
    const buffer = XLSX.write(libro, { bookType: 'xlsx', type: 'buffer' });

    const resultado = await service.importarExcelOficial(
      {
        buffer,
        originalname: 'horario.xlsx',
        mimetype:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
      { periodoId, reemplazarAnterior: true },
    );

    expect(resultado).toMatchObject({
      procesados: 2,
      creados: 1,
      rechazados: 1,
      filtrados: 1,
    });
    expect(prisma.claseProgramada.deleteMany).toHaveBeenCalled();
  });

  it('rechaza un período cuyo inicio no es anterior al fin', async () => {
    await expect(
      service.createPeriodo({
        nombre: '2026-3',
        fechaInicio: '2026-12-01',
        fechaFin: '2026-08-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('desactiva el período anterior al crear uno activo', async () => {
    prisma.periodoAcademico.create.mockResolvedValue({
      id: periodoId,
      activo: true,
    });

    await service.createPeriodo({
      nombre: ' 2026-3 ',
      fechaInicio: '2026-08-01',
      fechaFin: '2026-12-01',
      activo: true,
    });

    expect(prisma.periodoAcademico.updateMany).toHaveBeenCalledWith({
      where: { activo: true },
      data: { activo: false },
    });
    expect(prisma.periodoAcademico.create).toHaveBeenCalledWith({
      // Jest usa un matcher asimétrico cuyo tipo público es `any`.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: expect.objectContaining({ nombre: '2026-3', activo: true }),
    });
  });

  it('retorna 404 al activar un período inexistente', async () => {
    prisma.periodoAcademico.findUnique.mockResolvedValue(null);

    await expect(service.activarPeriodo(periodoId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('consulta un período por id y retorna 404 cuando no existe', async () => {
    prisma.periodoAcademico.findUnique
      .mockResolvedValueOnce({ id: periodoId, _count: { clases: 0 } })
      .mockResolvedValueOnce(null);

    await expect(service.findPeriodo(periodoId)).resolves.toMatchObject({
      id: periodoId,
    });
    await expect(service.findPeriodo(periodoId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('actualiza un período y conserva un único período activo', async () => {
    prisma.periodoAcademico.findUnique.mockResolvedValue({
      id: periodoId,
      nombre: '2026-3',
      fechaInicio: new Date('2026-08-01T00:00:00.000Z'),
      fechaFin: new Date('2026-12-01T00:00:00.000Z'),
      activo: false,
    });
    prisma.periodoAcademico.update.mockResolvedValue({
      id: periodoId,
      nombre: '2026-3 actualizado',
      activo: true,
    });

    await service.updatePeriodo(periodoId, {
      nombre: ' 2026-3 actualizado ',
      activo: true,
    });

    expect(prisma.periodoAcademico.updateMany).toHaveBeenCalledWith({
      where: { activo: true, id: { not: periodoId } },
      data: { activo: false },
    });
    expect(prisma.periodoAcademico.update).toHaveBeenCalledWith({
      where: { id: periodoId },
      data: { nombre: '2026-3 actualizado', activo: true },
    });
  });

  it('rechaza fechas inválidas al actualizar parcialmente un período', async () => {
    prisma.periodoAcademico.findUnique.mockResolvedValue({
      id: periodoId,
      fechaInicio: new Date('2026-08-01T00:00:00.000Z'),
      fechaFin: new Date('2026-12-01T00:00:00.000Z'),
    });

    await expect(
      service.updatePeriodo(periodoId, { fechaInicio: '2027-01-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('bloquea eliminar un período con clases y elimina uno vacío', async () => {
    prisma.periodoAcademico.findUnique
      .mockResolvedValueOnce({ id: periodoId, _count: { clases: 1 } })
      .mockResolvedValueOnce({ id: periodoId, _count: { clases: 0 } });
    prisma.periodoAcademico.delete.mockResolvedValue({ id: periodoId });

    await expect(service.removePeriodo(periodoId)).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(service.removePeriodo(periodoId)).resolves.toEqual({
      id: periodoId,
    });
  });

  it('crea una clase con horas normalizadas para Prisma', async () => {
    prisma.claseProgramada.create.mockResolvedValue({ id: 'clase-id' });

    await service.createClase({
      periodoId,
      aulaId,
      docenteId,
      asignaturaId,
      diaSemana: 1,
      horaInicio: '08:00',
      horaFin: '10:00',
      grupo: ' 020-81 ',
      inscritos: 20,
    });

    expect(prisma.claseProgramada.create).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          grupo: '020-81',
          horaInicio: new Date('1970-01-01T08:00:00.000Z'),
          horaFin: new Date('1970-01-01T10:00:00.000Z'),
        }),
      }),
    );
  });

  it('rechaza una clase con rango horario invertido', async () => {
    await expect(
      service.createClase({
        periodoId,
        aulaId,
        docenteId,
        asignaturaId,
        diaSemana: 1,
        horaInicio: '10:00',
        horaFin: '08:00',
        grupo: '020-81',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza una clase solapada en la misma aula', async () => {
    prisma.claseProgramada.findFirst.mockResolvedValue({ id: 'otra-clase' });

    await expect(
      service.createClase({
        periodoId,
        aulaId,
        docenteId,
        asignaturaId,
        diaSemana: 1,
        horaInicio: '09:00',
        horaFin: '11:00',
        grupo: '020-81',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('consulta solapamientos con límites abiertos para permitir bloques contiguos', async () => {
    prisma.claseProgramada.create.mockResolvedValue({ id: 'clase-id' });

    await service.createClase({
      periodoId,
      aulaId,
      docenteId,
      asignaturaId,
      diaSemana: 1,
      horaInicio: '10:00',
      horaFin: '12:00',
      grupo: '020-81',
    });

    expect(prisma.claseProgramada.findFirst).toHaveBeenCalledWith({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      where: expect.objectContaining({
        horaInicio: { lt: new Date('1970-01-01T12:00:00.000Z') },
        horaFin: { gt: new Date('1970-01-01T10:00:00.000Z') },
      }),
      select: { id: true },
    });
  });

  it('importa un lote completo dentro de una transaccion', async () => {
    prisma.claseProgramada.create
      .mockResolvedValueOnce({ id: 'clase-1' })
      .mockResolvedValueOnce({ id: 'clase-2' });

    const result = await service.importar({
      formato: 'JSON_V1',
      periodoId,
      nombreArchivo: 'horario-2026-3.json',
      clases: [
        {
          aulaId,
          docenteId,
          asignaturaId,
          diaSemana: 1,
          horaInicio: '08:00',
          horaFin: '10:00',
          grupo: '020-81',
        },
        {
          aulaId,
          docenteId,
          asignaturaId,
          diaSemana: 2,
          horaInicio: '10:00',
          horaFin: '12:00',
          grupo: '020-82',
        },
      ],
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.claseProgramada.create).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      formato: 'JSON_V1',
      totalRecibidas: 2,
      totalCreadas: 2,
    });
  });

  it('identifica la fila que causa conflicto durante la importacion', async () => {
    prisma.claseProgramada.create.mockResolvedValue({ id: 'clase-1' });
    prisma.claseProgramada.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'clase-1' });

    await expect(
      service.importar({
        formato: 'JSON_V1',
        periodoId,
        clases: [
          {
            aulaId,
            docenteId,
            asignaturaId,
            diaSemana: 1,
            horaInicio: '08:00',
            horaFin: '10:00',
            grupo: '020-81',
          },
          {
            aulaId,
            docenteId,
            asignaturaId,
            diaSemana: 1,
            horaInicio: '09:00',
            horaFin: '11:00',
            grupo: '020-82',
          },
        ],
      }),
    ).rejects.toThrow('Fila 2:');
  });

  it('crea o actualiza docente y asignatura embebidos en JSON_V2', async () => {
    const docenteCreadoId = '00000000-0000-4000-8000-000000000010';
    const asignaturaCreadaId = '00000000-0000-4000-8000-000000000011';
    prisma.docente.upsert.mockResolvedValue({ id: docenteCreadoId });
    prisma.asignatura.upsert.mockResolvedValue({ id: asignaturaCreadaId });
    prisma.claseProgramada.create.mockResolvedValue({ id: 'clase-id' });

    await service.importar({
      formato: 'JSON_V2',
      periodoId,
      clases: [
        {
          aulaId,
          docente: {
            documento: ' 123456 ',
            nombre: ' Docente Nuevo ',
            correo: 'DOCENTE@UDISTRITAL.EDU.CO',
          },
          asignatura: {
            codigo: ' SIS-101 ',
            nombre: ' Programación I ',
          },
          diaSemana: 1,
          horaInicio: '08:00',
          horaFin: '10:00',
          grupo: '020-81',
        },
      ],
    });

    expect(prisma.docente.upsert).toHaveBeenCalledWith({
      where: { documento: '123456' },
      update: {
        nombre: 'Docente Nuevo',
        correo: 'docente@udistrital.edu.co',
      },
      create: {
        documento: '123456',
        nombre: 'Docente Nuevo',
        correo: 'docente@udistrital.edu.co',
      },
      select: { id: true },
    });
    expect(prisma.asignatura.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { codigo: 'SIS-101' },
      }),
    );
    expect(prisma.claseProgramada.create).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          docenteId: docenteCreadoId,
          asignaturaId: asignaturaCreadaId,
        }),
      }),
    );
  });
});
