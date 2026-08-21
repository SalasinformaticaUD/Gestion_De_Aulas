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
import { Aula, HistorialAula } from './entities/aula.entity';

type PrismaError = { code?: unknown };

const hasPrismaCode = (error: unknown, code: string): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as PrismaError).code === code;

const aulaPublicaSelect = {
  id: true,
  codigo: true,
  ubicacion: true,
  capacidad: true,
  caracteristicas: true,
  estado: true,
  proyectoCurricular: { select: { id: true, nombre: true } },
  softwares: {
    select: {
      instaladoEn: true,
      software: {
        select: { id: true, nombre: true, version: true, descripcion: true },
      },
    },
    orderBy: { instaladoEn: 'desc' },
  },
  observaciones: {
    select: { id: true, tipo: true, contenido: true, creadoEn: true },
    orderBy: { creadoEn: 'desc' },
    take: 5,
  },
  tareas: {
    select: {
      id: true,
      titulo: true,
      estado: true,
      inicio: true,
      fin: true,
      responsable: { select: { nombreCompleto: true } },
    },
    orderBy: { inicio: 'desc' },
    take: 5,
  },
  limpiezas: {
    select: { id: true, realizadaEn: true, observacion: true },
    orderBy: { realizadaEn: 'desc' },
    take: 5,
  },
  practicasLibres: {
    select: {
      id: true,
      inicio: true,
      estado: true,
      estudiante: { select: { codigo: true, nombre: true } },
    },
    orderBy: { inicio: 'desc' },
    take: 5,
  },
  prestamosDocentes: {
    select: {
      id: true,
      inicio: true,
      estado: true,
      motivo: true,
      docente: { select: { nombre: true } },
    },
    orderBy: { inicio: 'desc' },
    take: 5,
  },
  creadoEn: true,
  actualizadoEn: true,
} as const;

type AulaPublicaSource = Prisma.AulaGetPayload<{
  select: typeof aulaPublicaSelect;
}>;

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

  async findAll(filters: FindAulasDto = {}): Promise<Aula[]> {
    const where: Prisma.AulaWhereInput = {
      ...(filters.estado && { estado: filters.estado }),
      ...(filters.ubicacion && {
        ubicacion: { contains: filters.ubicacion, mode: 'insensitive' },
      }),
      ...(filters.proyectoCurricularId && {
        proyectoCurricularId: filters.proyectoCurricularId,
      }),
    };

    const aulas = await this.prisma.aula.findMany({
      where,
      select: aulaPublicaSelect,
      orderBy: { codigo: 'asc' },
    });
    return aulas.map((aula) => this.toPublicResponse(aula));
  }

  async findOne(id: string) {
    const aula = await this.prisma.aula.findUnique({
      where: { id },
      select: aulaPublicaSelect,
    });

    if (!aula) {
      throw new NotFoundException(`No existe aula con id ${id}.`);
    }

    return this.toPublicResponse(aula);
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

  private toPublicResponse(aula: AulaPublicaSource): Aula {
    return {
      id: aula.id,
      codigo: aula.codigo,
      ubicacion: aula.ubicacion,
      piso: this.extraerPiso(aula.ubicacion),
      capacidad: aula.capacidad,
      estado: aula.estado,
      caracteristicas: aula.caracteristicas,
      proyectoCurricular: aula.proyectoCurricular,
      software: aula.softwares.map(({ software, instaladoEn }) => ({
        ...software,
        instaladoEn,
      })),
      historial: this.construirHistorial(aula),
      creadoEn: aula.creadoEn,
      actualizadoEn: aula.actualizadoEn,
    };
  }

  private construirHistorial(aula: AulaPublicaSource): HistorialAula[] {
    const historial: HistorialAula[] = [
      ...aula.softwares.map(({ software, instaladoEn }) => ({
        id: `software:${software.id}`,
        fecha: instaladoEn,
        tipo: 'SOFTWARE_INSTALADO' as const,
        descripcion: `Instalación de ${software.nombre} ${software.version}.`,
        responsable: null,
      })),
      ...aula.observaciones.map((observacion) => ({
        id: `observacion:${observacion.id}`,
        fecha: observacion.creadoEn,
        tipo: 'OBSERVACION' as const,
        descripcion: `${observacion.tipo}: ${observacion.contenido}`,
        responsable: null,
      })),
      ...aula.tareas.flatMap((tarea): HistorialAula[] => {
        const fecha = tarea.fin ?? tarea.inicio;
        return fecha
          ? [
              {
                id: `tarea:${tarea.id}`,
                fecha,
                tipo: 'TAREA',
                descripcion: `${tarea.titulo} (${tarea.estado}).`,
                responsable: tarea.responsable?.nombreCompleto ?? null,
              },
            ]
          : [];
      }),
      ...aula.limpiezas.map((limpieza) => ({
        id: `limpieza:${limpieza.id}`,
        fecha: limpieza.realizadaEn,
        tipo: 'LIMPIEZA' as const,
        descripcion: limpieza.observacion
          ? `Limpieza: ${limpieza.observacion}`
          : 'Limpieza registrada.',
        responsable: null,
      })),
      ...aula.practicasLibres.map((practica) => ({
        id: `practica:${practica.id}`,
        fecha: practica.inicio,
        tipo: 'PRACTICA_LIBRE' as const,
        descripcion: `Práctica libre (${practica.estado}).`,
        responsable: `${practica.estudiante.nombre} (${practica.estudiante.codigo})`,
      })),
      ...aula.prestamosDocentes.map((prestamo) => ({
        id: `prestamo:${prestamo.id}`,
        fecha: prestamo.inicio,
        tipo: 'PRESTAMO_DOCENTE' as const,
        descripcion: prestamo.motivo
          ? `${prestamo.motivo} (${prestamo.estado}).`
          : `Préstamo docente (${prestamo.estado}).`,
        responsable: prestamo.docente.nombre,
      })),
    ];

    return historial
      .sort((a, b) => b.fecha.getTime() - a.fecha.getTime())
      .slice(0, 10);
  }

  private extraerPiso(ubicacion: string): number | null {
    const match = /piso\s*(\d+)/i.exec(ubicacion);
    return match ? Number(match[1]) : null;
  }
}
