import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FindAuditoriaDto } from './dto/find-auditoria.dto';

export const AUDIT_ACTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'DISABLE',
  'APPROVE',
  'CANCEL',
  'LOGIN',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditEntry = {
  usuarioId?: string | null;
  entidad: string;
  entidadId: string;
  accion: AuditAction;
  datosPrevios?: unknown;
  datosNuevos?: unknown;
};

const sensitiveField = /password|contrasena|secret|token|authorization/i;

@Injectable()
export class AuditoriaService {
  constructor(private readonly prisma: PrismaService) {}

  registrar(entry: AuditEntry) {
    return this.prisma.auditoria.create({
      data: {
        usuarioId: entry.usuarioId ?? null,
        entidad: entry.entidad,
        entidadId: entry.entidadId,
        accion: entry.accion,
        ...(entry.datosPrevios !== undefined && {
          datosPrevios: this.sanitizar(entry.datosPrevios),
        }),
        ...(entry.datosNuevos !== undefined && {
          datosNuevos: this.sanitizar(entry.datosNuevos),
        }),
      },
    });
  }

  findAll(filters: FindAuditoriaDto) {
    const where: Prisma.AuditoriaWhereInput = {
      ...(filters.entidad && { entidad: filters.entidad }),
      ...(filters.entidadId && { entidadId: filters.entidadId }),
      ...(filters.usuarioId && { usuarioId: filters.usuarioId }),
      ...((filters.desde || filters.hasta) && {
        creadoEn: {
          ...(filters.desde && { gte: new Date(filters.desde) }),
          ...(filters.hasta && { lte: new Date(filters.hasta) }),
        },
      }),
    };
    return this.prisma.auditoria.findMany({
      where,
      include: {
        usuario: {
          select: { id: true, nombreCompleto: true, nombreUsuario: true },
        },
      },
      orderBy: { creadoEn: 'desc' },
    });
  }

  async findOne(id: string) {
    const audit = await this.prisma.auditoria.findUnique({
      where: { id },
      include: {
        usuario: {
          select: { id: true, nombreCompleto: true, nombreUsuario: true },
        },
      },
    });
    if (!audit)
      throw new NotFoundException('Registro de auditoría no encontrado.');
    return audit;
  }

  sanitizar(value: unknown): Prisma.InputJsonValue {
    return this.toSafeJson(value) as Prisma.InputJsonValue;
  }

  private toSafeJson(value: unknown): unknown {
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    )
      return value;
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map((item) => this.toSafeJson(item));
    if (typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, nested]) => [
          key,
          sensitiveField.test(key) ? '[REDACTED]' : this.toSafeJson(nested),
        ]),
      );
    }
    if (typeof value === 'bigint') return value.toString();
    if (typeof value === 'symbol') return value.description ?? '[symbol]';
    if (typeof value === 'function') return '[function]';
    return null;
  }
}
