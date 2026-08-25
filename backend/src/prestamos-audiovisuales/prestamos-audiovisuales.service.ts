import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { EstadoEquipo, EstadoPrestamo } from '../../generated/prisma/enums.js';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { PrismaService } from '../prisma/prisma.service';
import { CancelarPrestamoAudiovisualDto } from './dto/cancelar-prestamo-audiovisual.dto';
import { CreateEquipoAudiovisualDto } from './dto/create-equipo-audiovisual.dto';
import { CreatePrestamoAudiovisualDto } from './dto/create-prestamo-audiovisual.dto';
import { DevolverPrestamoAudiovisualDto } from './dto/devolver-prestamo-audiovisual.dto';
import { FindEquiposAudiovisualesDto } from './dto/find-equipos-audiovisuales.dto';
import { FindPrestamosAudiovisualesDto } from './dto/find-prestamos-audiovisuales.dto';
import { UpdateEquipoAudiovisualDto } from './dto/update-equipo-audiovisual.dto';

type PrismaError = { code?: unknown };

const prestamoInclude = {
  docente: true,
  aula: true,
  entregadoPor: {
    select: { id: true, nombreCompleto: true, nombreUsuario: true },
  },
  recibidoPor: {
    select: { id: true, nombreCompleto: true, nombreUsuario: true },
  },
  detalles: { include: { equipo: true } },
} satisfies Prisma.PrestamoAudiovisualInclude;

const estadosActivos = [
  EstadoPrestamo.SOLICITADO,
  EstadoPrestamo.APROBADO,
  EstadoPrestamo.ACTIVO,
  EstadoPrestamo.VENCIDO,
];

const hasPrismaCode = (error: unknown, code: string): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as PrismaError).code === code;

@Injectable()
export class PrestamosAudiovisualesService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly auditoria?: AuditoriaService,
  ) {}

  async createEquipo(dto: CreateEquipoAudiovisualDto, usuarioId?: string) {
    try {
      const equipo = await this.prisma.equipoAudiovisual.create({
        data: {
          ...this.equipoData(dto),
          nombre: dto.nombre.trim(),
          codigoInventario: dto.codigoInventario.trim(),
          tipo: dto.tipo.trim(),
        },
      });
      await this.registrar(
        usuarioId,
        'EquipoAudiovisual',
        equipo.id,
        'CREATE',
        undefined,
        equipo,
      );
      return equipo;
    } catch (error: unknown) {
      if (hasPrismaCode(error, 'P2002')) {
        throw new ConflictException(
          'Ya existe un equipo con el mismo código de inventario.',
        );
      }
      throw error;
    }
  }

  async findEquipos(filters: FindEquiposAudiovisualesDto) {
    const pagina = filters.pagina ?? 1;
    const limite = filters.limite ?? 20;
    const buscar = filters.buscar?.trim();
    const where: Prisma.EquipoAudiovisualWhereInput = {
      ...(filters.estado && { estado: filters.estado }),
      ...(filters.tipo && {
        tipo: { equals: filters.tipo.trim(), mode: 'insensitive' },
      }),
      ...(buscar && {
        OR: [
          { codigoInventario: { contains: buscar, mode: 'insensitive' } },
          { nombre: { contains: buscar, mode: 'insensitive' } },
          { tipo: { contains: buscar, mode: 'insensitive' } },
        ],
      }),
    };
    const [datos, total] = await this.prisma.$transaction([
      this.prisma.equipoAudiovisual.findMany({
        where,
        orderBy: { codigoInventario: 'asc' },
        skip: (pagina - 1) * limite,
        take: limite,
      }),
      this.prisma.equipoAudiovisual.count({ where }),
    ]);
    return { datos, total, pagina, limite };
  }

  async findEquipo(id: string) {
    const equipo = await this.prisma.equipoAudiovisual.findUnique({
      where: { id },
      include: {
        detallesPrestamo: {
          include: { prestamo: true },
          orderBy: { prestamo: { salidaEn: 'desc' } },
        },
      },
    });
    if (!equipo)
      throw new NotFoundException('El equipo audiovisual no existe.');
    return equipo;
  }

  async updateEquipo(
    id: string,
    dto: UpdateEquipoAudiovisualDto,
    usuarioId?: string,
  ) {
    const previo = await this.findEquipo(id);
    if (previo.estado === EstadoEquipo.PRESTADO) {
      throw new ConflictException(
        'No se puede modificar un equipo mientras está prestado.',
      );
    }
    if (dto.estado === EstadoEquipo.PRESTADO) {
      throw new BadRequestException(
        'El estado PRESTADO solo se asigna al registrar un préstamo.',
      );
    }
    try {
      const equipo = await this.prisma.equipoAudiovisual.update({
        where: { id },
        data: this.equipoData(dto),
      });
      await this.registrar(
        usuarioId,
        'EquipoAudiovisual',
        id,
        'UPDATE',
        previo,
        equipo,
      );
      return equipo;
    } catch (error: unknown) {
      if (hasPrismaCode(error, 'P2002')) {
        throw new ConflictException(
          'Ya existe un equipo con el mismo código de inventario.',
        );
      }
      throw error;
    }
  }

  async create(dto: CreatePrestamoAudiovisualDto, usuarioId?: string) {
    const salidaEn = new Date(dto.salidaEn);
    const devolucionEstimada = new Date(dto.devolucionEstimada);
    this.validarRangoFechas(salidaEn, devolucionEstimada);

    const prestamo = await this.prisma.$transaction(async (tx) => {
      await this.validarReferenciasPrestamo(tx, dto, usuarioId);
      await this.reservarEquipos(
        tx,
        dto.equipos.map((equipo) => equipo.equipoId),
      );
      return tx.prestamoAudiovisual.create({
        data: {
          docenteId: dto.docenteId,
          aulaId: dto.aulaId,
          ...(usuarioId && { entregadoPorId: usuarioId }),
          salidaEn,
          devolucionEstimada,
          estado: EstadoPrestamo.ACTIVO,
          detalles: {
            create: dto.equipos.map((equipo) => ({
              equipoId: equipo.equipoId,
              ...(equipo.estadoFisicoSalida && {
                estadoFisicoSalida: equipo.estadoFisicoSalida.trim(),
              }),
              ...(equipo.estadoFuncionalSalida && {
                estadoFuncionalSalida: equipo.estadoFuncionalSalida.trim(),
              }),
            })),
          },
        },
        include: prestamoInclude,
      });
    });
    await this.registrar(
      usuarioId,
      'PrestamoAudiovisual',
      prestamo.id,
      'CREATE',
      undefined,
      prestamo,
    );
    return prestamo;
  }

  async findAll(filters: FindPrestamosAudiovisualesDto) {
    await this.marcarVencidos();
    const rango = this.rangoFechas(filters);
    return this.prisma.prestamoAudiovisual.findMany({
      where: {
        ...(filters.estado && { estado: filters.estado }),
        ...(filters.aulaId && { aulaId: filters.aulaId }),
        ...(filters.docenteId && { docenteId: filters.docenteId }),
        ...(filters.equipoId && {
          detalles: { some: { equipoId: filters.equipoId } },
        }),
        ...(filters.activos && { estado: { in: estadosActivos } }),
        ...(filters.vencidos && { estado: EstadoPrestamo.VENCIDO }),
        ...(rango && { salidaEn: rango }),
      },
      include: prestamoInclude,
      orderBy: { salidaEn: 'desc' },
    });
  }

  async findOne(id: string) {
    await this.marcarVencidos();
    const prestamo = await this.prisma.prestamoAudiovisual.findUnique({
      where: { id },
      include: prestamoInclude,
    });
    if (!prestamo)
      throw new NotFoundException('El préstamo audiovisual no existe.');
    return prestamo;
  }

  async devolver(
    id: string,
    dto: DevolverPrestamoAudiovisualDto,
    usuarioId?: string,
  ) {
    const devolucionReal = new Date(dto.devolucionReal);
    const prestamo = await this.prisma.$transaction(async (tx) => {
      const previo = await this.obtenerPrestamoParaCambio(tx, id);
      this.validarPrestamoRetornable(previo, devolucionReal);
      this.validarEquiposDevolucion(previo.detalles, dto);
      for (const detalle of dto.equipos) {
        const estado = this.estadoTrasDevolucion(
          detalle.estadoFuncionalDevolucion,
        );
        await tx.detallePrestamoAudiovisual.update({
          where: {
            prestamoId_equipoId: { prestamoId: id, equipoId: detalle.equipoId },
          },
          data: {
            estadoFisicoDevolucion: detalle.estadoFisicoDevolucion.trim(),
            estadoFuncionalDevolucion: detalle.estadoFuncionalDevolucion.trim(),
          },
        });
        const actualizado = await tx.equipoAudiovisual.updateMany({
          where: { id: detalle.equipoId, estado: EstadoEquipo.PRESTADO },
          data: { estado },
        });
        if (actualizado.count !== 1)
          throw new ConflictException(
            'Uno de los equipos ya no está prestado.',
          );
      }
      return tx.prestamoAudiovisual.update({
        where: { id },
        data: {
          estado: EstadoPrestamo.DEVUELTO,
          devolucionReal,
          ...(usuarioId && { recibidoPorId: usuarioId }),
        },
        include: prestamoInclude,
      });
    });
    await this.registrar(
      usuarioId,
      'PrestamoAudiovisual',
      id,
      'UPDATE',
      undefined,
      prestamo,
    );
    return prestamo;
  }

  async cancelar(
    id: string,
    dto: CancelarPrestamoAudiovisualDto,
    usuarioId?: string,
  ) {
    const prestamo = await this.prisma.$transaction(async (tx) => {
      const previo = await this.obtenerPrestamoParaCambio(tx, id);
      if (
        !estadosActivos.includes(
          previo.estado as (typeof estadosActivos)[number],
        )
      ) {
        throw new ConflictException(
          'El préstamo no puede cancelarse en su estado actual.',
        );
      }
      for (const detalle of previo.detalles) {
        const actualizado = await tx.equipoAudiovisual.updateMany({
          where: { id: detalle.equipoId, estado: EstadoEquipo.PRESTADO },
          data: { estado: EstadoEquipo.DISPONIBLE },
        });
        if (actualizado.count !== 1) {
          throw new ConflictException(
            'Uno de los equipos ya no está prestado.',
          );
        }
      }
      return tx.prestamoAudiovisual.update({
        where: { id },
        data: {
          estado: EstadoPrestamo.CANCELADO,
          canceladoEn: new Date(),
          motivoCancelacion: dto.motivo.trim(),
          ...(usuarioId && { canceladoPorId: usuarioId }),
        },
        include: prestamoInclude,
      });
    });
    await this.registrar(
      usuarioId,
      'PrestamoAudiovisual',
      id,
      'CANCEL',
      undefined,
      prestamo,
    );
    return prestamo;
  }

  private equipoData(dto: Partial<CreateEquipoAudiovisualDto>) {
    return {
      ...(dto.codigoInventario !== undefined && {
        codigoInventario: dto.codigoInventario.trim(),
      }),
      ...(dto.nombre !== undefined && { nombre: dto.nombre.trim() }),
      ...(dto.tipo !== undefined && { tipo: dto.tipo.trim() }),
      ...(dto.estado !== undefined && { estado: dto.estado }),
      ...(dto.observacion !== undefined && {
        observacion: dto.observacion.trim() || null,
      }),
    };
  }

  private async validarReferenciasPrestamo(
    tx: Prisma.TransactionClient,
    dto: CreatePrestamoAudiovisualDto,
    usuarioId?: string,
  ) {
    const [docente, aula, usuario] = await Promise.all([
      tx.docente.findUnique({
        where: { id: dto.docenteId },
        select: { id: true },
      }),
      tx.aula.findUnique({ where: { id: dto.aulaId }, select: { id: true } }),
      usuarioId
        ? tx.usuario.findUnique({
            where: { id: usuarioId },
            select: { id: true },
          })
        : Promise.resolve({ id: null }),
    ]);
    if (!docente) throw new NotFoundException('El docente indicado no existe.');
    if (!aula) throw new NotFoundException('El aula indicada no existe.');
    if (!usuario) {
      throw new NotFoundException('El usuario autenticado no existe.');
    }
  }

  private async reservarEquipos(tx: Prisma.TransactionClient, ids: string[]) {
    const equipos = await tx.equipoAudiovisual.findMany({
      where: { id: { in: ids } },
      select: { id: true, estado: true },
    });
    if (equipos.length !== ids.length) {
      throw new NotFoundException(
        'Uno o más equipos audiovisuales no existen.',
      );
    }
    if (equipos.some((equipo) => equipo.estado !== EstadoEquipo.DISPONIBLE)) {
      throw new ConflictException('Uno o más equipos no están disponibles.');
    }
    for (const id of ids) {
      const actualizado = await tx.equipoAudiovisual.updateMany({
        where: { id, estado: EstadoEquipo.DISPONIBLE },
        data: { estado: EstadoEquipo.PRESTADO },
      });
      if (actualizado.count !== 1) {
        throw new ConflictException('Uno o más equipos ya fueron prestados.');
      }
    }
  }

  private async obtenerPrestamoParaCambio(
    tx: Prisma.TransactionClient,
    id: string,
  ) {
    const prestamo = await tx.prestamoAudiovisual.findUnique({
      where: { id },
      include: { detalles: { select: { equipoId: true } } },
    });
    if (!prestamo) {
      throw new NotFoundException('El préstamo audiovisual no existe.');
    }
    return prestamo;
  }

  private validarPrestamoRetornable(
    prestamo: { estado: EstadoPrestamo; salidaEn: Date | null },
    devolucionReal: Date,
  ) {
    if (
      prestamo.estado !== EstadoPrestamo.ACTIVO &&
      prestamo.estado !== EstadoPrestamo.VENCIDO
    ) {
      throw new ConflictException(
        'El préstamo no puede devolverse en su estado actual.',
      );
    }
    if (prestamo.salidaEn && devolucionReal < prestamo.salidaEn) {
      throw new BadRequestException(
        'La devolución no puede ser anterior a la salida del préstamo.',
      );
    }
  }

  private validarEquiposDevolucion(
    detalles: Array<{ equipoId: string }>,
    dto: DevolverPrestamoAudiovisualDto,
  ) {
    const esperados = new Set(detalles.map((detalle) => detalle.equipoId));
    const recibidos = new Set(dto.equipos.map((detalle) => detalle.equipoId));
    if (
      esperados.size !== recibidos.size ||
      [...esperados].some((id) => !recibidos.has(id))
    ) {
      throw new BadRequestException(
        'La devolución debe incluir exactamente todos los equipos del préstamo.',
      );
    }
  }

  private estadoTrasDevolucion(estadoFuncional: string): EstadoEquipo {
    const estado = estadoFuncional.trim().toUpperCase();
    if (estado === EstadoEquipo.DISPONIBLE) return EstadoEquipo.DISPONIBLE;
    if (estado === EstadoEquipo.MANTENIMIENTO)
      return EstadoEquipo.MANTENIMIENTO;
    throw new BadRequestException(
      'El estado funcional de devolución debe ser DISPONIBLE o MANTENIMIENTO.',
    );
  }

  private validarRangoFechas(salidaEn: Date, devolucionEstimada: Date) {
    if (
      Number.isNaN(salidaEn.getTime()) ||
      Number.isNaN(devolucionEstimada.getTime())
    ) {
      throw new BadRequestException('Las fechas del préstamo no son válidas.');
    }
    if (salidaEn >= devolucionEstimada) {
      throw new BadRequestException(
        'La devolución estimada debe ser posterior a la salida.',
      );
    }
  }

  private rangoFechas(filters: FindPrestamosAudiovisualesDto) {
    if (
      filters.fechaInicio &&
      filters.fechaFin &&
      filters.fechaInicio > filters.fechaFin
    ) {
      throw new BadRequestException(
        'fechaInicio no puede ser posterior a fechaFin.',
      );
    }
    if (!filters.fecha && !filters.fechaInicio && !filters.fechaFin)
      return undefined;
    const inicio = filters.fechaInicio ?? filters.fecha;
    const fin = filters.fechaFin ?? filters.fecha;
    return {
      ...(inicio && { gte: new Date(`${inicio}T00:00:00.000-05:00`) }),
      ...(fin && { lte: new Date(`${fin}T23:59:59.999-05:00`) }),
    };
  }

  private marcarVencidos() {
    return this.prisma.prestamoAudiovisual.updateMany({
      where: {
        estado: EstadoPrestamo.ACTIVO,
        devolucionEstimada: { lt: new Date() },
      },
      data: { estado: EstadoPrestamo.VENCIDO },
    });
  }

  private registrar(
    usuarioId: string | undefined,
    entidad: 'EquipoAudiovisual' | 'PrestamoAudiovisual',
    entidadId: string,
    accion: 'CREATE' | 'UPDATE' | 'CANCEL',
    datosPrevios?: unknown,
    datosNuevos?: unknown,
  ) {
    return this.auditoria?.registrar({
      usuarioId,
      entidad,
      entidadId,
      accion,
      datosPrevios,
      datosNuevos,
    });
  }
}
