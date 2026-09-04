import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TipoObservacion } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateObservacioneDto } from './dto/create-observacione.dto';
import { FindObservacionesDto } from './dto/find-observaciones.dto';
import { UpdateObservacioneDto } from './dto/update-observacione.dto';

@Injectable()
export class ObservacionesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateObservacioneDto, usuarioId?: string) {
    await this.ensureAulaExists(input.aulaId);
    const tipo = input.tipo ?? TipoObservacion.GENERAL;
    const vigenteDesde = this.normalizarVigencia(input.vigenteDesde);
    const vigenteHasta = this.normalizarVigencia(input.vigenteHasta);
    this.validarVigencia(tipo, vigenteDesde, vigenteHasta);

    return this.prisma.observacion.create({
      data: {
        aulaId: input.aulaId,
        autorId: usuarioId,
        tipo,
        contenido: input.contenido.trim(),
        vigenteDesde,
        vigenteHasta,
      },
      include: this.detalle(),
    });
  }

  findAll(filters: FindObservacionesDto = {}) {
    const where: Prisma.ObservacionWhereInput = {
      ...(filters.aulaId && { aulaId: filters.aulaId }),
      ...(filters.tipo && { tipo: filters.tipo }),
    };

    if (filters.vigentes) {
      const ahora = new Date();
      where.AND = [
        { OR: [{ vigenteDesde: null }, { vigenteDesde: { lte: ahora } }] },
        { OR: [{ vigenteHasta: null }, { vigenteHasta: { gt: ahora } }] },
      ];
    }

    return this.prisma.observacion.findMany({
      where,
      include: this.detalle(),
      orderBy: { creadoEn: 'desc' },
    });
  }

  async findOne(id: string) {
    const observacion = await this.prisma.observacion.findUnique({
      where: { id },
      include: this.detalle(),
    });

    if (!observacion) {
      throw new NotFoundException(`No existe observación con id ${id}.`);
    }

    return observacion;
  }

  async update(id: string, input: UpdateObservacioneDto) {
    const actual = await this.findOne(id);
    if (input.aulaId && input.aulaId !== actual.aulaId) {
      await this.ensureAulaExists(input.aulaId);
    }

    const tipo = input.tipo ?? actual.tipo;
    const vigenteDesde =
      input.vigenteDesde === undefined
        ? actual.vigenteDesde
        : this.normalizarVigencia(input.vigenteDesde);
    const vigenteHasta =
      input.vigenteHasta === undefined
        ? actual.vigenteHasta
        : this.normalizarVigencia(input.vigenteHasta);
    this.validarVigencia(tipo, vigenteDesde, vigenteHasta);

    return this.prisma.observacion.update({
      where: { id },
      data: {
        ...(input.aulaId !== undefined && { aulaId: input.aulaId }),
        ...(input.tipo !== undefined && { tipo: input.tipo }),
        ...(input.contenido !== undefined && {
          contenido: input.contenido.trim(),
        }),
        ...(input.vigenteDesde !== undefined && { vigenteDesde }),
        ...(input.vigenteHasta !== undefined && { vigenteHasta }),
      },
      include: this.detalle(),
    });
  }

  async remove(id: string) {
    const actual = await this.findOne(id);
    const ahora = new Date();
    const fechaCierre =
      actual.vigenteHasta && actual.vigenteHasta < ahora
        ? actual.vigenteHasta
        : ahora;
    return this.prisma.observacion.update({
      where: { id },
      data: { vigenteHasta: fechaCierre },
      include: this.detalle(),
    });
  }

  findRestriccionesVigentes(aulaId: string, fecha: Date, hasta?: Date) {
    return this.prisma.observacion.findMany({
      where: {
        aulaId,
        tipo: TipoObservacion.RESTRICCION,
        OR: [
          { vigenteDesde: null },
          { vigenteDesde: { lt: hasta ?? fecha } },
        ],
        AND: [{ OR: [{ vigenteHasta: null }, { vigenteHasta: { gt: fecha } }] }],
      },
      orderBy: { creadoEn: 'desc' },
    });
  }

  private async ensureAulaExists(aulaId: string): Promise<void> {
    const aula = await this.prisma.aula.findUnique({
      where: { id: aulaId },
      select: { id: true },
    });
    if (!aula) {
      throw new NotFoundException(`No existe aula con id ${aulaId}.`);
    }
  }

  private normalizarVigencia(value?: string | null): Date | null {
    return value ? new Date(value) : null;
  }

  private validarVigencia(tipo: TipoObservacion, vigenteDesde: Date | null, vigenteHasta: Date | null): void {
    if (tipo === TipoObservacion.RESTRICCION && (!vigenteDesde || !vigenteHasta)) {
      throw new BadRequestException('Una restricción debe definir las fechas desde y hasta.');
    }
    if (vigenteDesde && vigenteHasta && vigenteHasta <= vigenteDesde) {
      throw new BadRequestException(
        'La fecha hasta debe ser posterior a la fecha desde.',
      );
    }
  }

  private detalle() {
    return { aula: true, autor: { select: { id: true, nombreCompleto: true } } };
  }
}
