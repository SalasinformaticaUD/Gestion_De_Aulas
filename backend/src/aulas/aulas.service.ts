import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { CreateAulaDto } from './dto/create-aula.dto';
import { UpdateAulaDto } from './dto/update-aula.dto';
import { FindAulasDto } from './dto/find-aulas.dto';
import { PrismaService } from '../prisma/prisma.service';

type PrismaError = { code?: unknown };

const hasPrismaCode = (error: unknown, code: string): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as PrismaError).code === code;

@Injectable()
export class AulasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createAulaDto: CreateAulaDto) {
    if (createAulaDto.proyectoCurricularId) {
      await this.ensureProyectoCurricularExists(
        createAulaDto.proyectoCurricularId,
      );
    }

    try {
      return await this.prisma.aula.create({
        data: this.normalizeCreateInput(createAulaDto),
      });
    } catch (error: unknown) {
      this.throwKnownPersistenceError(error);
      throw error;
    }
  }

  findAll(filters: FindAulasDto = {}) {
    const where: Prisma.AulaWhereInput = {
      ...(filters.estado && { estado: filters.estado }),
      ...(filters.ubicacion && {
        ubicacion: { contains: filters.ubicacion, mode: 'insensitive' },
      }),
      ...(filters.proyectoCurricularId && {
        proyectoCurricularId: filters.proyectoCurricularId,
      }),
    };

    return this.prisma.aula.findMany({
      where,
      include: {
        proyectoCurricular: true,
        softwares: { include: { software: true } },
      },
      orderBy: { codigo: 'asc' },
    });
  }

  async findOne(id: string) {
    const aula = await this.prisma.aula.findUnique({
      where: { id },
      include: {
        proyectoCurricular: true,
        softwares: { include: { software: true } },
      },
    });

    if (!aula) {
      throw new NotFoundException(`No existe aula con id ${id}.`);
    }

    return aula;
  }

  async update(id: string, updateAulaDto: UpdateAulaDto) {
    await this.ensureAulaExists(id);

    if (updateAulaDto.proyectoCurricularId) {
      await this.ensureProyectoCurricularExists(
        updateAulaDto.proyectoCurricularId,
      );
    }

    try {
      return await this.prisma.aula.update({
        where: { id },
        data: this.normalizeUpdateInput(updateAulaDto),
      });
    } catch (error: unknown) {
      this.throwKnownPersistenceError(error);
      throw error;
    }
  }

  async remove(id: string) {
    const aula = await this.prisma.aula.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: {
            clases: true,
            practicasLibres: true,
            prestamosDocentes: true,
            prestamosAudiovisuales: true,
            observaciones: true,
            tareas: true,
          },
        },
      },
    });

    if (!aula) {
      throw new NotFoundException(`No existe aula con id ${id}.`);
    }

    const hasOperationalHistory = Object.values(aula._count).some(
      (count) => count > 0,
    );

    if (hasOperationalHistory) {
      throw new ConflictException(
        'El aula tiene información operativa asociada. Cambie su estado a FUERA_DE_SERVICIO para conservar la trazabilidad.',
      );
    }

    return this.prisma.aula.delete({ where: { id } });
  }

  private async ensureAulaExists(id: string): Promise<void> {
    const aula = await this.prisma.aula.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!aula) {
      throw new NotFoundException(`No existe aula con id ${id}.`);
    }
  }

  private async ensureProyectoCurricularExists(id: string): Promise<void> {
    const proyecto = await this.prisma.proyectoCurricular.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!proyecto) {
      throw new NotFoundException(
        `No existe proyecto curricular con id ${id}.`,
      );
    }
  }

  private throwKnownPersistenceError(error: unknown): void {
    if (hasPrismaCode(error, 'P2002')) {
      throw new ConflictException('Ya existe un aula con el mismo código.');
    }

    if (hasPrismaCode(error, 'P2003')) {
      throw new NotFoundException('El proyecto curricular indicado no existe.');
    }
  }

  private normalizeCreateInput(
    input: CreateAulaDto,
  ): Prisma.AulaUncheckedCreateInput {
    return {
      codigo: input.codigo.trim(),
      ubicacion: input.ubicacion.trim(),
      capacidad: input.capacidad,
      ...(input.caracteristicas !== undefined && {
        caracteristicas: input.caracteristicas as Prisma.InputJsonValue,
      }),
      ...(input.estado !== undefined && { estado: input.estado }),
      ...(input.proyectoCurricularId !== undefined && {
        proyectoCurricularId: input.proyectoCurricularId,
      }),
    };
  }

  private normalizeUpdateInput(
    input: UpdateAulaDto,
  ): Prisma.AulaUncheckedUpdateInput {
    return {
      ...(input.codigo !== undefined && { codigo: input.codigo.trim() }),
      ...(input.ubicacion !== undefined && {
        ubicacion: input.ubicacion.trim(),
      }),
      ...(input.capacidad !== undefined && { capacidad: input.capacidad }),
      ...(input.caracteristicas !== undefined && {
        caracteristicas: input.caracteristicas as Prisma.InputJsonValue,
      }),
      ...(input.estado !== undefined && { estado: input.estado }),
      ...(input.proyectoCurricularId !== undefined && {
        proyectoCurricularId: input.proyectoCurricularId,
      }),
    };
  }
}
