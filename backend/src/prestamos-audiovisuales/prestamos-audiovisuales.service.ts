import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { EstadoEquipo, EstadoPrestamo, type Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
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

const ENFRIAMIENTO_VIDEOBEAM_MS = 20 * 60 * 1000;

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
        include: {
          detallesPrestamo: {
            select: {
              prestamo: {
                select: { salidaEn: true, devolucionReal: true },
              },
            },
          },
        },
        orderBy: { codigoInventario: 'asc' },
        skip: (pagina - 1) * limite,
        take: limite,
      }),
      this.prisma.equipoAudiovisual.count({ where }),
    ]);
    return {
      datos: datos.map((equipo) => {
        const usoMinutos = equipo.detallesPrestamo.reduce(
          (totalUso, detalle) => {
            const inicio = detalle.prestamo.salidaEn;
            const fin = detalle.prestamo.devolucionReal;
            if (!inicio || !fin) return totalUso;
            return (
              totalUso + Math.max(0, fin.getTime() - inicio.getTime()) / 60_000
            );
          },
          0,
        );
        const { detallesPrestamo, ...base } = equipo;
        const ultimaDevolucion = detallesPrestamo
          .map((detalle) => detalle.prestamo.devolucionReal)
          .filter((fecha): fecha is Date => Boolean(fecha))
          .sort((a, b) => b.getTime() - a.getTime())[0];
        const disponibleDesde = ultimaDevolucion
          ? new Date(ultimaDevolucion.getTime() + ENFRIAMIENTO_VIDEOBEAM_MS)
          : null;
        return {
          ...base,
          cantidadPrestamos: detallesPrestamo.length,
          minutosUsoAcumulado: Math.round(usoMinutos),
          disponibleDesde:
            disponibleDesde && disponibleDesde > new Date()
              ? disponibleDesde
              : null,
        };
      }),
      total,
      pagina,
      limite,
    };
  }

  findDocentes(nombre?: string) {
    const query = nombre?.trim();
    if (!query) return Promise.resolve([]);
    return this.prisma.docente.findMany({
      where: {
        nombre: { contains: query, mode: 'insensitive' },
        documento: { not: null },
      },
      select: { id: true, nombre: true, documento: true, correo: true },
      orderBy: { nombre: 'asc' },
      take: 8,
    });
  }

  findResponsables() {
    return this.prisma.usuario.findMany({
      where: {
        estado: 'ACTIVA',
        OR: [
          { cargo: null },
          {
            cargo: {
              not: 'ADMINISTRADOR',
            },
          },
        ],
        roles: {
          none: {
            rol: {
              nombre: { equals: 'ADMINISTRADOR', mode: 'insensitive' },
            },
          },
        },
      },
      select: {
        id: true,
        nombreCompleto: true,
        nombreUsuario: true,
        cargo: true,
      },
      orderBy: { nombreCompleto: 'asc' },
    });
  }

  async importarEquipos(
    archivo: { buffer: Buffer; originalname: string } | undefined,
    usuarioId?: string,
  ) {
    if (
      !archivo?.buffer?.length ||
      !/\.(xlsx|xls)$/i.test(archivo.originalname)
    ) {
      throw new BadRequestException(
        'Debe adjuntar un archivo Excel .xlsx o .xls.',
      );
    }
    let filas: Array<Record<string, unknown>>;
    try {
      const libro = XLSX.read(archivo.buffer, { type: 'buffer' });
      const hoja = libro.Sheets[libro.SheetNames[0]];
      filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, {
        defval: '',
        raw: false,
      });
    } catch {
      throw new BadRequestException('No fue posible leer el archivo Excel.');
    }
    if (!filas.length || filas.length > 2_000) {
      throw new BadRequestException(
        'El Excel debe contener entre 1 y 2.000 videobeams.',
      );
    }
    const normalizar = (valor: string) =>
      valor
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
    const leer = (fila: Record<string, unknown>, columna: string) => {
      const clave = Object.keys(fila).find(
        (item) => normalizar(item) === normalizar(columna),
      );
      return clave ? String(fila[clave] ?? '').trim() : '';
    };
    const registros = filas.map((fila, indice) => ({
      fila: indice + 2,
      marca: leer(fila, 'Marca'),
      codigoInventario: leer(fila, 'Numero Interno'),
      modelo: leer(fila, 'Modelo'),
    }));
    const invalido = registros.find(
      (item) => !item.marca || !item.codigoInventario || !item.modelo,
    );
    if (invalido) {
      throw new BadRequestException(
        `La fila ${invalido.fila} debe incluir Marca, Numero Interno y Modelo.`,
      );
    }
    const codigos = registros.map((item) => item.codigoInventario);
    if (
      new Set(codigos.map((item) => item.toUpperCase())).size !== codigos.length
    ) {
      throw new BadRequestException(
        'El Excel contiene números internos repetidos.',
      );
    }
    const existentes = await this.prisma.equipoAudiovisual.findMany({
      where: { codigoInventario: { in: codigos } },
      select: { codigoInventario: true },
    });
    if (existentes.length) {
      throw new ConflictException(
        `Ya existen equipos con estos números internos: ${existentes.map((item) => item.codigoInventario).join(', ')}.`,
      );
    }
    const creados = await this.prisma.$transaction(
      registros.map((item) =>
        this.prisma.equipoAudiovisual.create({
          data: {
            codigoInventario: item.codigoInventario,
            marca: item.marca,
            modelo: item.modelo,
            nombre: `Videobeam ${item.marca} ${item.modelo}`,
            tipo: 'Videobeam',
            estado: EstadoEquipo.DISPONIBLE,
          },
        }),
      ),
    );
    await this.registrar(
      usuarioId,
      'EquipoAudiovisual',
      creados[0].id,
      'CREATE',
      undefined,
      {
        cargaMasiva: true,
        archivo: archivo.originalname,
        cantidad: creados.length,
      },
    );
    return { creados: creados.length, archivo: archivo.originalname };
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

  async removeEquipo(id: string, usuarioId?: string) {
    const previo = await this.findEquipo(id);
    if (previo.estado === EstadoEquipo.PRESTADO) {
      throw new ConflictException('No se puede eliminar un equipo prestado.');
    }
    if (previo.detallesPrestamo.length) {
      throw new ConflictException(
        'No se puede eliminar un equipo con historial de préstamos.',
      );
    }
    const equipo = await this.prisma.equipoAudiovisual.delete({
      where: { id },
    });
    await this.registrar(
      usuarioId,
      'EquipoAudiovisual',
      id,
      'DELETE',
      previo,
      undefined,
    );
    return equipo;
  }

  async create(dto: CreatePrestamoAudiovisualDto, usuarioId?: string) {
    const salidaEn = dto.salidaEn ? new Date(dto.salidaEn) : new Date();
    const devolucionEstimada = new Date(dto.devolucionEstimada);
    this.validarRangoFechas(salidaEn, devolucionEstimada);

    const prestamo = await this.prisma.$transaction(async (tx) => {
      await this.validarReferenciasPrestamo(tx, dto, usuarioId);
      await this.validarDocenteSinPrestamoActivo(tx, dto);
      await this.reservarEquipos(
        tx,
        dto.equipos.map((equipo) => equipo.equipoId),
      );
      return tx.prestamoAudiovisual.create({
        data: {
          ...(dto.docenteId && { docenteId: dto.docenteId }),
          ...(dto.aulaId && { aulaId: dto.aulaId }),
          ...((dto.entregadoPorId || usuarioId) && {
            entregadoPorId: dto.entregadoPorId || usuarioId,
          }),
          responsableTipo: dto.responsableTipo ?? 'MONITOR',
          docenteNombre: dto.docenteNombre?.trim() ?? 'Sin información',
          docenteDocumento: dto.docenteDocumento?.trim() ?? 'Sin información',
          salonTexto: dto.salonTexto?.trim() ?? 'Sin ubicación registrada',
          ...(dto.elementosAdicionales && {
            elementosAdicionales: dto.elementosAdicionales.map((item) =>
              item.trim(),
            ),
          }),
          observacionesPrestamo: dto.observaciones?.trim() || null,
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

  /** Contrato interno para Core: préstamos que ocupan un aula durante una fecha local. */
  async findPrestamosPorAulaYDia(aulaId: string, fecha: string) {
    const inicio = new Date(`${fecha}T00:00:00.000-05:00`);
    const fin = new Date(`${fecha}T23:59:59.999-05:00`);
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
      throw new BadRequestException('fecha debe tener formato YYYY-MM-DD.');
    }
    await this.validarAulaParaConsulta(aulaId);
    return this.prisma.prestamoAudiovisual.findMany({
      where: { aulaId, salidaEn: { gte: inicio, lte: fin } },
      include: prestamoInclude,
      orderBy: { salidaEn: 'asc' },
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
      if (dto.recibidoPorId) {
        const receptor = await tx.usuario.findFirst({
          where: { id: dto.recibidoPorId, estado: 'ACTIVA' },
          select: { id: true },
        });
        if (!receptor) {
          throw new NotFoundException(
            'El usuario que recibe no existe o está inactivo.',
          );
        }
      }
      const previo = await this.obtenerPrestamoParaCambio(tx, id);
      this.validarPrestamoRetornable(previo, devolucionReal);
      this.validarEquiposDevolucion(previo.detalles, dto);
      if (!dto.devolucionCompleta && !dto.observaciones?.trim()) {
        throw new BadRequestException(
          'Debe describir qué elemento faltó o qué novedad ocurrió en la devolución.',
        );
      }
      for (const detalle of dto.equipos) {
        const estado = dto.devolucionCompleta
          ? this.estadoTrasDevolucion(detalle.estadoFuncionalDevolucion)
          : EstadoEquipo.MANTENIMIENTO;
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
          estado: dto.devolucionCompleta
            ? EstadoPrestamo.DEVUELTO
            : EstadoPrestamo.DEVUELTO_INCOMPLETO,
          devolucionReal,
          ...((dto.recibidoPorId || usuarioId) && {
            recibidoPorId: dto.recibidoPorId || usuarioId,
          }),
          recibidoPorTipo: dto.recibidoPorTipo,
          observacionesDevolucion: dto.observaciones?.trim() || null,
          devolucionCompleta: dto.devolucionCompleta,
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
      ...(dto.marca !== undefined && { marca: dto.marca.trim() || null }),
      ...(dto.modelo !== undefined && { modelo: dto.modelo.trim() || null }),
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
      dto.docenteId
        ? tx.docente.findUnique({
            where: { id: dto.docenteId },
            select: { id: true },
          })
        : Promise.resolve(null),
      dto.aulaId
        ? tx.aula.findUnique({
            where: { id: dto.aulaId },
            select: { id: true },
          })
        : Promise.resolve(null),
      usuarioId
        ? tx.usuario.findUnique({
            where: { id: usuarioId },
            select: { id: true },
          })
        : Promise.resolve({ id: null }),
    ]);
    if (dto.docenteId && !docente)
      throw new NotFoundException('El docente indicado no existe.');
    if (dto.aulaId && !aula)
      throw new NotFoundException('El aula indicada no existe.');
    if (!usuario) {
      throw new NotFoundException('El usuario autenticado no existe.');
    }
    const responsableIds = [dto.entregadoPorId ?? usuarioId].filter(
      Boolean,
    ) as string[];
    if (responsableIds.length) {
      const responsables = await tx.usuario.count({
        where: {
          id: { in: responsableIds },
          estado: 'ACTIVA',
          OR: [
            { cargo: null },
            {
              cargo: {
                not: 'ADMINISTRADOR',
              },
            },
          ],
          roles: {
            none: {
              rol: {
                nombre: { equals: 'ADMINISTRADOR', mode: 'insensitive' },
              },
            },
          },
        },
      });
      if (responsables !== responsableIds.length) {
        throw new NotFoundException(
          'El usuario que entrega no existe, está inactivo o es administrador.',
        );
      }
    }
  }

  private async validarAulaParaConsulta(aulaId: string) {
    const aula = await this.prisma.aula.findUnique({
      where: { id: aulaId },
      select: { id: true },
    });
    if (!aula) throw new NotFoundException('El aula indicada no existe.');
  }

  private async reservarEquipos(tx: Prisma.TransactionClient, ids: string[]) {
    if (!ids.length) return;
    const enfriamientoDesde = new Date(Date.now() - ENFRIAMIENTO_VIDEOBEAM_MS);
    const equipos = await tx.equipoAudiovisual.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        estado: true,
        detallesPrestamo: {
          where: {
            prestamo: { devolucionReal: { gt: enfriamientoDesde } },
          },
          select: { equipoId: true },
          take: 1,
        },
      },
    });
    if (equipos.length !== ids.length) {
      throw new NotFoundException(
        'Uno o más equipos audiovisuales no existen.',
      );
    }
    if (equipos.some((equipo) => equipo.estado !== EstadoEquipo.DISPONIBLE)) {
      throw new ConflictException('Uno o más equipos no están disponibles.');
    }
    if (equipos.some((equipo) => equipo.detallesPrestamo.length > 0)) {
      throw new ConflictException(
        'Uno o más videobeams aún están en su periodo de enfriamiento de 20 minutos.',
      );
    }
    for (const id of ids) {
      const actualizado = await tx.equipoAudiovisual.updateMany({
        where: {
          id,
          estado: EstadoEquipo.DISPONIBLE,
          detallesPrestamo: {
            none: { prestamo: { devolucionReal: { gt: enfriamientoDesde } } },
          },
        },
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

  private async validarDocenteSinPrestamoActivo(
    tx: Prisma.TransactionClient,
    dto: CreatePrestamoAudiovisualDto,
  ) {
    const prestamoActivo = await tx.prestamoAudiovisual.findFirst({
      where: {
        estado: { in: [EstadoPrestamo.ACTIVO, EstadoPrestamo.VENCIDO] },
        OR: [
          ...(dto.docenteId ? [{ docenteId: dto.docenteId }] : []),
          {
            docenteDocumento: {
              equals: dto.docenteDocumento.trim(),
              mode: 'insensitive',
            },
          },
        ],
      },
      select: { id: true },
    });
    if (prestamoActivo) {
      throw new ConflictException(
        'El profesor ya tiene un préstamo audiovisual activo o pendiente de devolución.',
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
    const fechaLocal = (fecha: Date) =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(fecha);
    if (fechaLocal(salidaEn) !== fechaLocal(devolucionEstimada)) {
      throw new BadRequestException(
        'El préstamo y la devolución estimada deben ser del mismo día.',
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
    accion: 'CREATE' | 'UPDATE' | 'CANCEL' | 'DELETE',
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
