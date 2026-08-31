import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { TipoObservacion } from '../../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service';
import { CreateObservacioneDto } from './dto/create-observacione.dto';
import { FindObservacionesDto } from './dto/find-observaciones.dto';
import { UpdateObservacioneDto } from './dto/update-observacione.dto';

@Injectable()
export class ObservacionesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateObservacioneDto) {
    await this.ensureAulaExists(input.aulaId);
    const tipo = input.tipo ?? TipoObservacion.GENERAL;
    const vigenteHasta = this.normalizarVigencia(input.vigenteHasta);
    this.validarVigencia(tipo, vigenteHasta, new Date());

    return this.prisma.observacion.create({
      data: {
        aulaId: input.aulaId,
        tipo,
        contenido: input.contenido.trim(),
        vigenteHasta,
      },
      include: { aula: true },
    });
  }

  findAll(filters: FindObservacionesDto = {}) {
    const where: Prisma.ObservacionWhereInput = {
      ...(filters.aulaId && { aulaId: filters.aulaId }),
      ...(filters.tipo && { tipo: filters.tipo }),
    };

    if (filters.vigentes) {
      const ahora = new Date();
      where.creadoEn = { lte: ahora };
      where.OR = [{ vigenteHasta: null }, { vigenteHasta: { gt: ahora } }];
    }

    return this.prisma.observacion.findMany({
      where,
      include: { aula: true },
      orderBy: { creadoEn: 'desc' },
    });
  }

  async findOne(id: string) {
    const observacion = await this.prisma.observacion.findUnique({
      where: { id },
      include: { aula: true },
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
    const vigenteHasta =
      input.vigenteHasta === undefined
        ? actual.vigenteHasta
        : this.normalizarVigencia(input.vigenteHasta);
    this.validarVigencia(tipo, vigenteHasta, actual.creadoEn);

    return this.prisma.observacion.update({
      where: { id },
      data: {
        ...(input.aulaId !== undefined && { aulaId: input.aulaId }),
        ...(input.tipo !== undefined && { tipo: input.tipo }),
        ...(input.contenido !== undefined && {
          contenido: input.contenido.trim(),
        }),
        ...(input.vigenteHasta !== undefined && { vigenteHasta }),
      },
      include: { aula: true },
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
      include: { aula: true },
    });
  }

  findRestriccionesVigentes(aulaId: string, fecha: Date, hasta?: Date) {
    return this.prisma.observacion.findMany({
      where: {
        aulaId,
        tipo: TipoObservacion.RESTRICCION,
        creadoEn: { lt: hasta ?? fecha },
        OR: [{ vigenteHasta: null }, { vigenteHasta: { gt: fecha } }],
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

  private validarVigencia(
    tipo: TipoObservacion,
    vigenteHasta: Date | null,
    inicio: Date,
  ): void {
    if (tipo === TipoObservacion.SEMANAL && !vigenteHasta) {
      throw new BadRequestException(
        'Una observación SEMANAL debe definir vigenteHasta.',
      );
    }
    if (vigenteHasta && vigenteHasta <= inicio) {
      throw new BadRequestException(
        'vigenteHasta debe ser posterior al inicio de la observación.',
      );
    }
  }
}
