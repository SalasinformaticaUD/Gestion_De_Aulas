import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { EstadoAsistencia } from '../../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAsistenciaDocenteDto } from './dto/create-asistencia-docente.dto';
import { FindAsistenciasDto } from './dto/find-asistencias.dto';
import { UpdateAsistenciaDocenteDto } from './dto/update-asistencia-docente.dto';

type PrismaError = { code?: unknown };

const hasPrismaCode = (error: unknown, code: string): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as PrismaError).code === code;

const asistenciaInclude = {
  clase: {
    include: {
      periodo: true,
      aula: true,
      docente: true,
      asignatura: true,
      proyectoCurricular: true,
    },
  },
  registradoPor: true,
} as const;

@Injectable()
export class AsistenciaDocenteService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAsistenciaDocenteDto, registradoPorId: string) {
    const fecha = this.parseDate(dto.fecha);
    await this.ensureClaseExists(dto.claseId);
    await this.ensureUsuarioExists(registradoPorId);

    const duplicate = await this.prisma.asistenciaDocente.findUnique({
      where: { claseId_fecha: { claseId: dto.claseId, fecha } },
      select: { id: true },
    });

    if (duplicate) {
      throw new ConflictException(
        'Ya existe un registro de asistencia para esta clase en la fecha indicada.',
      );
    }

    const estado = dto.estado ?? EstadoAsistencia.PENDIENTE;

    try {
      return await this.prisma.asistenciaDocente.create({
        data: {
          claseId: dto.claseId,
          fecha,
          estado,
          registradaEn:
            estado === EstadoAsistencia.PENDIENTE ? null : new Date(),
          registradoPorId,
          ...(dto.observacion !== undefined && {
            observacion: dto.observacion.trim(),
          }),
        },
        include: asistenciaInclude,
      });
    } catch (error: unknown) {
      this.throwKnownPersistenceError(error);
      throw error;
    }
  }

  findAll(filters: FindAsistenciasDto = {}) {
    const where: Prisma.AsistenciaDocenteWhereInput = {
      ...(filters.fecha && { fecha: this.parseDate(filters.fecha) }),
      ...(filters.estado && { estado: filters.estado }),
      ...(filters.aulaId && { clase: { aulaId: filters.aulaId } }),
    };

    return this.prisma.asistenciaDocente.findMany({
      where,
      include: asistenciaInclude,
      orderBy: [{ fecha: 'desc' }, { clase: { horaInicio: 'asc' } }],
    });
  }

  async findByClass(claseId: string) {
    await this.ensureClaseExists(claseId);

    return this.prisma.asistenciaDocente.findMany({
      where: { claseId },
      include: asistenciaInclude,
      orderBy: { fecha: 'desc' },
    });
  }

  async update(id: string, dto: UpdateAsistenciaDocenteDto) {
    const asistencia = await this.prisma.asistenciaDocente.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!asistencia) {
      throw new NotFoundException(
        `No existe registro de asistencia con id ${id}.`,
      );
    }

    const data: Prisma.AsistenciaDocenteUncheckedUpdateInput = {
      ...(dto.estado !== undefined && {
        estado: dto.estado,
        registradaEn:
          dto.estado === EstadoAsistencia.PENDIENTE ? null : new Date(),
      }),
      ...(dto.observacion !== undefined && {
        observacion: dto.observacion.trim(),
      }),
    };

    try {
      return await this.prisma.asistenciaDocente.update({
        where: { id },
        data,
        include: asistenciaInclude,
      });
    } catch (error: unknown) {
      this.throwKnownPersistenceError(error);
      throw error;
    }
  }

  private async ensureClaseExists(id: string): Promise<void> {
    const clase = await this.prisma.claseProgramada.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!clase) {
      throw new NotFoundException(`No existe clase programada con id ${id}.`);
    }
  }

  private async ensureUsuarioExists(id: string): Promise<void> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!usuario) {
      throw new NotFoundException(`No existe usuario con id ${id}.`);
    }
  }

  private parseDate(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private throwKnownPersistenceError(error: unknown): void {
    if (hasPrismaCode(error, 'P2002')) {
      throw new ConflictException(
        'Ya existe un registro de asistencia para esta clase en la fecha indicada.',
      );
    }

    if (hasPrismaCode(error, 'P2003')) {
      throw new NotFoundException(
        'La clase o el usuario relacionado ya no existe.',
      );
    }
  }
}
