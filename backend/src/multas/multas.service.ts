import {
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { EstadoMulta, Prisma } from '../../generated/prisma/client.js';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { PrismaService } from '../prisma/prisma.service';
import { AnularMultaDto } from './dto/anular-multa.dto';
import { CumplirMultaDto } from './dto/cumplir-multa.dto';
import { CreateMotivoMultaDto } from './dto/create-motivo-multa.dto';
import { CreateMultaDto } from './dto/create-multa.dto';
import { UpdateMultaDto } from './dto/update-multa.dto';

const includeMulta = {
  estudiante: { select: { id: true, codigo: true, nombre: true } },
  motivo: true,
  impuestaPor: {
    select: { id: true, nombreCompleto: true, nombreUsuario: true },
  },
  cumplidaPor: {
    select: { id: true, nombreCompleto: true, nombreUsuario: true },
  },
  anuladaPor: {
    select: { id: true, nombreCompleto: true, nombreUsuario: true },
  },
} as const;

@Injectable()
export class MultasService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly auditoria?: AuditoriaService,
  ) {}

  async create(dto: CreateMultaDto, usuarioId?: string) {
    const estudiante = await this.resolveEstudiante(dto);
    const motivo = await this.prisma.motivoMulta.findUnique({
      where: { id: dto.motivoId },
      select: { id: true },
    });
    if (!motivo) throw new NotFoundException('El motivo de multa no existe.');

    const multa = await this.prisma.multa.create({
      data: {
        estudianteId: estudiante.id,
        motivoId: motivo.id,
        ...(dto.descripcion && { descripcion: dto.descripcion }),
        ...(usuarioId && { impuestaPorId: usuarioId }),
      },
      include: includeMulta,
    });
    await this.registrar(usuarioId, multa.id, 'CREATE', undefined, multa);
    return multa;
  }

  findAll(
    filters: { estado?: string; estudianteId?: string; codigo?: string } = {},
  ) {
    const estado = this.parseEstado(filters.estado);
    const where: Prisma.MultaWhereInput = {
      ...(estado && { estado }),
      ...(filters.estudianteId && { estudianteId: filters.estudianteId }),
      ...(filters.codigo && {
        estudiante: {
          codigo: { equals: filters.codigo.trim(), mode: 'insensitive' },
        },
      }),
    };
    return this.prisma.multa.findMany({
      where,
      include: includeMulta,
      orderBy: { fecha: 'desc' },
    });
  }

  async findOne(id: string) {
    const multa = await this.prisma.multa.findUnique({
      where: { id },
      include: includeMulta,
    });
    if (!multa) throw new NotFoundException('La multa no existe.');
    return multa;
  }

  async cumplir(id: string, dto: CumplirMultaDto, usuarioId?: string) {
    const previa = await this.findOne(id);
    if (previa.estado !== EstadoMulta.ACTIVA) {
      throw new ConflictException('Solo una multa activa puede cumplirse.');
    }
    const multa = await this.prisma.multa.update({
      where: { id },
      data: {
        estado: EstadoMulta.CUMPLIDA,
        cumplidaEn: new Date(),
        ...(usuarioId && { cumplidaPorId: usuarioId }),
        elementosEntregados: dto.elementosEntregados,
      },
      include: includeMulta,
    });
    await this.registrar(usuarioId, id, 'UPDATE', previa, multa);
    return multa;
  }

  async anular(id: string, dto: AnularMultaDto, usuarioId?: string) {
    const previa = await this.findOne(id);
    if (previa.estado !== EstadoMulta.ACTIVA) {
      throw new ConflictException('Solo una multa activa puede anularse.');
    }
    const multa = await this.prisma.multa.update({
      where: { id },
      data: {
        estado: EstadoMulta.ANULADA,
        anuladaEn: new Date(),
        ...(usuarioId && { anuladaPorId: usuarioId }),
        motivoAnulacion: dto.motivoAnulacion,
      },
      include: includeMulta,
    });
    await this.registrar(usuarioId, id, 'CANCEL', previa, multa);
    return multa;
  }

  findAllMotivos() {
    return this.prisma.motivoMulta.findMany({
      include: { _count: { select: { multas: true } } },
      orderBy: { nombre: 'asc' },
    });
  }

  async update(id: string, dto: UpdateMultaDto, usuarioId?: string) {
    const previa = await this.findOne(id);
    if (previa.estado !== EstadoMulta.ACTIVA)
      throw new ConflictException('Solo una multa activa puede editarse.');
    if (dto.motivoId) {
      const motivo = await this.prisma.motivoMulta.findUnique({
        where: { id: dto.motivoId },
        select: { id: true },
      });
      if (!motivo) throw new NotFoundException('El motivo de multa no existe.');
    }
    const multa = await this.prisma.multa.update({
      where: { id },
      data: {
        ...(dto.motivoId && { motivoId: dto.motivoId }),
        ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
      },
      include: includeMulta,
    });
    await this.registrar(usuarioId, id, 'UPDATE', previa, multa);
    return multa;
  }

  tieneMultaActiva(estudianteId: string) {
    return this.prisma.multa.findFirst({
      where: { estudianteId, estado: EstadoMulta.ACTIVA },
      select: { id: true, fecha: true, motivo: { select: { nombre: true } } },
    });
  }

  async createMotivo(dto: CreateMotivoMultaDto, usuarioId?: string) {
    try {
      const motivo = await this.prisma.motivoMulta.create({
        data: {
          nombre: dto.nombre,
          ...(dto.descripcion && { descripcion: dto.descripcion }),
        },
      });
      await this.registrar(usuarioId, motivo.id, 'CREATE', undefined, motivo);
      return motivo;
    } catch (error: unknown) {
      if (this.isPrismaError(error, 'P2002')) {
        throw new ConflictException(
          'Ya existe un motivo de multa con ese nombre.',
        );
      }
      throw error;
    }
  }

  private async resolveEstudiante(dto: CreateMultaDto) {
    const estudiante = await this.prisma.estudiante.findFirst({
      where: dto.estudianteId
        ? { id: dto.estudianteId }
        : {
            codigo: {
              equals: dto.codigoEstudiante?.trim(),
              mode: 'insensitive',
            },
          },
      select: { id: true },
    });
    if (!estudiante) throw new NotFoundException('El estudiante no existe.');
    return estudiante;
  }

  private parseEstado(value?: string): EstadoMulta | undefined {
    if (!value) return undefined;
    const estado = value.toUpperCase() as EstadoMulta;
    if (!Object.values(EstadoMulta).includes(estado)) {
      throw new ConflictException('El estado de multa no es válido.');
    }
    return estado;
  }

  private registrar(
    usuarioId: string | undefined,
    entidadId: string,
    accion: 'CREATE' | 'UPDATE' | 'CANCEL',
    datosPrevios?: unknown,
    datosNuevos?: unknown,
  ) {
    return this.auditoria?.registrar({
      usuarioId,
      entidad: 'Multa',
      entidadId,
      accion,
      datosPrevios,
      datosNuevos,
    });
  }

  private isPrismaError(error: unknown, code: string): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: string }).code === code
    );
  }
}
