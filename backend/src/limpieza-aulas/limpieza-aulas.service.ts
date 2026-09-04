import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  EstadoAula,
} from '../../generated/prisma/enums.js';
import type { Prisma } from '@prisma/client';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLimpiezaAulaDto } from './dto/create-limpieza-aula.dto';
import {
  ConsultarIndicadoresLimpiezaDto,
  ConsultarMatrizLimpiezaDto,
  ConsultarSugerenciasLimpiezaDto,
  FindLimpiezaAulasDto,
} from './dto/find-limpieza-aulas.dto';
import { UpdateLimpiezaAulaDto } from './dto/update-limpieza-aula.dto';

const limpiezaInclude = {
  aula: { select: { id: true, codigo: true, ubicacion: true } },
  responsable: {
    select: { id: true, nombreCompleto: true, nombreUsuario: true },
  },
} as const;

type RangoFechas = { desde?: Date; hasta?: Date };

@Injectable()
export class LimpiezaAulasService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly auditoria?: AuditoriaService,
  ) {}

  async create(input: CreateLimpiezaAulaDto, usuarioId?: string) {
    await this.ensureAulaExists(input.aulaId);
    const realizadaEn = input.realizadaEn ? this.toDate(input.realizadaEn) : new Date();
    this.asegurarFechaEditable(realizadaEn);
    await this.asegurarIntervaloEntreLimpiezas(input.aulaId, realizadaEn);
    const limpieza = await this.prisma.limpieza.create({
      data: {
        aulaId: input.aulaId,
        ...(usuarioId && { responsableId: usuarioId }),
        realizadaEn,
        estado: input.estado ?? 'REALIZADA',
        ...(input.observacion !== undefined && {
          observacion: this.normalizarObservacion(input.observacion),
        }),
      },
      include: limpiezaInclude,
    });
    await this.registrar(usuarioId, limpieza.id, 'CREATE', undefined, limpieza);
    return limpieza;
  }

  findAll(filters: FindLimpiezaAulasDto = {}) {
    const rango = this.normalizarRango(filters);
    const where: Prisma.LimpiezaWhereInput = {
      ...(filters.aulaId && { aulaId: filters.aulaId }),
      ...((rango.desde || rango.hasta) && {
        realizadaEn: {
          ...(rango.desde && { gte: rango.desde }),
          ...(rango.hasta && { lte: rango.hasta }),
        },
      }),
    };
    return this.prisma.limpieza.findMany({
      where,
      include: limpiezaInclude,
      orderBy: [{ realizadaEn: 'desc' }, { id: 'desc' }],
    });
  }

  async findOne(id: string) {
    const limpieza = await this.prisma.limpieza.findUnique({
      where: { id },
      include: limpiezaInclude,
    });
    if (!limpieza) {
      throw new NotFoundException(`No existe limpieza con id ${id}.`);
    }
    return limpieza;
  }

  async update(id: string, input: UpdateLimpiezaAulaDto, usuarioId?: string) {
    const previa = await this.findOne(id);
    const realizadaEn = input.realizadaEn
      ? this.toDate(input.realizadaEn)
      : previa.realizadaEn;
    this.asegurarFechaEditable(realizadaEn);
    if (input.aulaId && input.aulaId !== previa.aulaId) {
      await this.ensureAulaExists(input.aulaId);
    }
    await this.asegurarIntervaloEntreLimpiezas(
      input.aulaId ?? previa.aulaId,
      realizadaEn,
      id,
    );
    const limpieza = await this.prisma.limpieza.update({
      where: { id },
      data: {
        ...(input.aulaId !== undefined && { aulaId: input.aulaId }),
        ...(input.realizadaEn !== undefined && { realizadaEn }),
        ...(input.estado !== undefined && { estado: input.estado }),
        ...(input.limpiarObservacion && { observacion: null }),
        ...(!input.limpiarObservacion && input.observacion !== undefined && {
          observacion: this.normalizarObservacion(input.observacion),
        }),
      },
      include: limpiezaInclude,
    });
    await this.registrar(usuarioId, id, 'UPDATE', previa, limpieza);
    return limpieza;
  }

  async remove(id: string, usuarioId?: string) {
    const previa = await this.findOne(id);
    this.asegurarFechaEditable(previa.realizadaEn);
    const limpieza = await this.prisma.limpieza.delete({ where: { id } });
    await this.registrar(usuarioId, id, 'DELETE', previa);
    return limpieza;
  }

  async findSugerencias(query: ConsultarSugerenciasLimpiezaDto) {
    const { inicio } = this.rangoDiaBogota(this.toDate(query.fecha));
    const aulas = await this.prisma.aula.findMany({
        where: { estado: EstadoAula.OPERATIVA },
        select: {
          id: true,
          codigo: true,
          ubicacion: true,
          limpiezas: {
            select: { realizadaEn: true },
            orderBy: { realizadaEn: 'desc' },
            take: 1,
          },
        },
        orderBy: { codigo: 'asc' },
      });
    const sugerencias = aulas
      .map((aula) => {
        const ultimaLimpieza = aula.limpiezas[0]?.realizadaEn ?? null;
        const diasSinLimpieza = ultimaLimpieza
          ? Math.max(
              0,
              Math.floor(
                (inicio.getTime() - ultimaLimpieza.getTime()) /
                  (24 * 60 * 60 * 1000),
              ),
            )
          : null;
        return {
          aula: { id: aula.id, codigo: aula.codigo, ubicacion: aula.ubicacion },
          ultimaLimpieza,
          diasSinLimpieza,
          motivo: ultimaLimpieza
            ? `Última limpieza hace ${diasSinLimpieza} día(s).`
            : 'Disponible y sin historial de limpieza registrado.',
        };
      })
      .filter(({ diasSinLimpieza }) =>
        diasSinLimpieza === null || diasSinLimpieza >= 2,
      )
      .sort((a, b) => {
        const prioridadA = a.diasSinLimpieza ?? Number.MAX_SAFE_INTEGER;
        const prioridadB = b.diasSinLimpieza ?? Number.MAX_SAFE_INTEGER;
        return (
          prioridadB - prioridadA || a.aula.codigo.localeCompare(b.aula.codigo)
        );
      })
      .slice(0, query.limite ?? 10);

    return {
      fecha: query.fecha,
      criterio:
        'Aulas operativas con dos o más días sin limpieza, ordenadas desde la que lleva más tiempo sin atención.',
      sugerencias,
    };
  }

  async findMatriz(query: ConsultarMatrizLimpiezaDto) {
    const rango = this.normalizarRango(query, true);
    const [aulas, limpiezas] = await Promise.all([
      this.prisma.aula.findMany({
        where: query.aulaId ? { id: query.aulaId } : undefined,
        select: { id: true, codigo: true, ubicacion: true },
        orderBy: { codigo: 'asc' },
      }),
      this.prisma.limpieza.findMany({
        where: {
          ...(query.aulaId && { aulaId: query.aulaId }),
          realizadaEn: { gte: rango.desde!, lte: rango.hasta! },
        },
        select: {
          id: true,
          aulaId: true,
          realizadaEn: true,
          estado: true,
          observacion: true,
        },
        orderBy: { realizadaEn: 'asc' },
      }),
    ]);
    const fechas = this.construirFechas(rango.desde!, rango.hasta!);
    const registrosPorCelda = new Map<string, typeof limpiezas>();
    for (const limpieza of limpiezas) {
      const clave = `${limpieza.aulaId}:${this.fechaBogota(limpieza.realizadaEn)}`;
      registrosPorCelda.set(clave, [
        ...(registrosPorCelda.get(clave) ?? []),
        limpieza,
      ]);
    }
    return {
      desde: rango.desde,
      hasta: rango.hasta,
      fechas,
      aulas: aulas.map((aula) => ({
        ...aula,
        jornadas: fechas.map((fecha) => {
          const registros = registrosPorCelda.get(`${aula.id}:${fecha}`) ?? [];
          return { fecha, realizada: registros.length > 0, registros };
        }),
      })),
    };
  }

  async findIndicadores(query: ConsultarIndicadoresLimpiezaDto) {
    const rango = this.normalizarRango(query);
    const [aulas, limpiezas] = await Promise.all([
      this.prisma.aula.findMany({
        where: query.aulaId ? { id: query.aulaId } : undefined,
        select: { id: true, codigo: true, ubicacion: true },
        orderBy: { codigo: 'asc' },
      }),
      this.prisma.limpieza.findMany({
        where: {
          ...(query.aulaId && { aulaId: query.aulaId }),
          ...((rango.desde || rango.hasta) && {
            realizadaEn: {
              ...(rango.desde && { gte: rango.desde }),
              ...(rango.hasta && { lte: rango.hasta }),
            },
          }),
        },
        select: { aulaId: true, realizadaEn: true },
        orderBy: { realizadaEn: 'desc' },
      }),
    ]);
    const ahora = new Date();
    const porAula = aulas.map((aula) => {
      const registros = limpiezas.filter(
        (limpieza) => limpieza.aulaId === aula.id,
      );
      const ultimaLimpieza = registros[0]?.realizadaEn ?? null;
      return {
        aula,
        totalLimpiezas: registros.length,
        ultimaLimpieza,
        diasSinLimpieza: ultimaLimpieza
          ? Math.max(
              0,
              Math.floor(
                (ahora.getTime() - ultimaLimpieza.getTime()) /
                  (24 * 60 * 60 * 1000),
              ),
            )
          : null,
      };
    });
    return {
      rango,
      totalLimpiezas: limpiezas.length,
      aulasAtendidas: porAula.filter(({ totalLimpiezas }) => totalLimpiezas > 0)
        .length,
      aulasSinHistorial: porAula.filter(({ ultimaLimpieza }) => !ultimaLimpieza)
        .length,
      promedioLimpiezasPorAula:
        aulas.length === 0
          ? 0
          : Number((limpiezas.length / aulas.length).toFixed(2)),
      aulasConMayorTiempoSinLimpieza: [...porAula]
        .sort((a, b) => {
          const diasA = a.diasSinLimpieza ?? Number.MAX_SAFE_INTEGER;
          const diasB = b.diasSinLimpieza ?? Number.MAX_SAFE_INTEGER;
          return diasB - diasA || a.aula.codigo.localeCompare(b.aula.codigo);
        })
        .slice(0, 10),
      porAula,
    };
  }

  private async ensureAulaExists(aulaId: string): Promise<void> {
    const aula = await this.prisma.aula.findUnique({
      where: { id: aulaId },
      select: { id: true },
    });
    if (!aula) throw new NotFoundException(`No existe aula con id ${aulaId}.`);
  }

  private normalizarRango(
    query: FindLimpiezaAulasDto,
    predeterminadoSieteDias = false,
  ): RangoFechas {
    let desde = query.desde ? this.toDate(query.desde) : undefined;
    let hasta = query.hasta ? this.toEndOfDay(query.hasta) : undefined;
    if (predeterminadoSieteDias && !desde && !hasta) {
      hasta = this.toEndOfDay(new Date().toISOString().slice(0, 10));
      desde = new Date(hasta);
      desde.setUTCDate(desde.getUTCDate() - 6);
      desde.setUTCHours(0, 0, 0, 0);
    }
    if (desde && hasta && desde > hasta) {
      throw new BadRequestException('desde debe ser anterior o igual a hasta.');
    }
    return { desde, hasta };
  }

  private normalizarObservacion(value: string): string | null {
    const observacion = value.trim();
    if (!observacion) {
      throw new BadRequestException('La observación no puede estar vacía.');
    }
    return observacion;
  }

  private toDate(value: string): Date {
    const fecha = new Date(value);
    if (Number.isNaN(fecha.getTime())) {
      throw new BadRequestException('La fecha de limpieza no es válida.');
    }
    return fecha;
  }

  private toEndOfDay(value: string): Date {
    return /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T23:59:59.999Z`)
      : this.toDate(value);
  }

  private asegurarFechaEditable(fecha: Date): void {
    const hoy = this.fechaBogota(new Date());
    const ayer = new Date(`${hoy}T12:00:00.000Z`);
    ayer.setUTCDate(ayer.getUTCDate() - 1);
    const fechaRegistro = this.fechaBogota(fecha);
    if (fechaRegistro > hoy) {
      throw new BadRequestException(
        'No se permite registrar ni modificar una limpieza con fecha futura.',
      );
    }
    if (fechaRegistro !== hoy && fechaRegistro !== ayer.toISOString().slice(0, 10)) {
      throw new BadRequestException(
        'Solo se pueden registrar o modificar limpiezas del día actual o del día anterior.',
      );
    }
  }

  private async asegurarIntervaloEntreLimpiezas(
    aulaId: string,
    fecha: Date,
    excluirId?: string,
  ): Promise<void> {
    const { inicio, fin } = this.rangoDiaBogota(fecha);
    const registroReciente = await this.prisma.limpieza.findFirst({
      where: {
        aulaId,
        ...(excluirId && { id: { not: excluirId } }),
        realizadaEn: {
          gte: this.inicioDiasAntes(inicio, 2),
          lt: fin,
        },
      },
      select: { id: true },
    });
    if (registroReciente) {
      throw new BadRequestException(
        'No se permite registrar limpieza: el aula ya fue atendida hoy o durante los dos días anteriores.',
      );
    }
  }

  private inicioDiasAntes(inicioDia: Date, dias: number): Date {
    const inicioAnterior = new Date(inicioDia);
    inicioAnterior.setDate(inicioAnterior.getDate() - dias);
    return inicioAnterior;
  }

  private rangoDiaBogota(fecha: Date) {
    const texto = fecha.toISOString().slice(0, 10);
    const inicio = new Date(`${texto}T00:00:00.000-05:00`);
    const fin = new Date(`${texto}T23:59:59.999-05:00`);
    return { inicio, fin, diaSemana: inicio.getUTCDay() };
  }

  private construirFechas(desde: Date, hasta: Date): string[] {
    const dias: string[] = [];
    const cursor = new Date(desde);
    cursor.setUTCHours(0, 0, 0, 0);
    const limite = new Date(hasta);
    limite.setUTCHours(0, 0, 0, 0);
    while (cursor <= limite) {
      dias.push(cursor.toISOString().slice(0, 10));
      if (dias.length > 31) {
        throw new BadRequestException(
          'La matriz admite un rango máximo de 31 días.',
        );
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return dias;
  }

  private fechaBogota(fecha: Date): string {
    const partes = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(fecha);
    const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
      partes.find((parte) => parte.type === tipo)?.value;
    return `${valor('year')}-${valor('month')}-${valor('day')}`;
  }

  private registrar(
    usuarioId: string | undefined,
    entidadId: string,
    accion: 'CREATE' | 'UPDATE' | 'DELETE',
    datosPrevios?: unknown,
    datosNuevos?: unknown,
  ) {
    return this.auditoria?.registrar({
      usuarioId,
      entidad: 'Limpieza',
      entidadId,
      accion,
      datosPrevios,
      datosNuevos,
    });
  }
}
