import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSoftwareDto } from './dto/create-software.dto';
import { UpdateSoftwareDto } from './dto/update-software.dto';
import { CreateAulaSoftwareDto } from './dto/create-aula-software.dto';
import type { SoftwarePrismaService } from './software-prisma.service';
import { SOFTWARE_PRISMA } from './software.constants';

type PrismaError = { code?: unknown };

const hasPrismaCode = (error: unknown, code: string): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as PrismaError).code === code;

@Injectable()
export class SoftwareService {
  constructor(
    @Inject(SOFTWARE_PRISMA)
    private readonly prisma: SoftwarePrismaService,
  ) {}

  async create(createSoftwareDto: CreateSoftwareDto) {
    try {
      return await this.prisma.software.create({
        data: this.normalizeCreateInput(createSoftwareDto),
      });
    } catch (error: unknown) {
      this.throwIfDuplicate(error);
      throw error;
    }
  }

  findAll() {
    return this.prisma.software.findMany({
      orderBy: [{ nombre: 'asc' }, { version: 'asc' }],
      include: {
        aulas: {
          include: { aula: true },
          orderBy: { instaladoEn: 'desc' },
        },
      },
    });
  }

  async findOne(id: string) {
    const software = await this.prisma.software.findUnique({
      where: { id },
      include: { aulas: { include: { aula: true } } },
    });

    if (!software) {
      throw new NotFoundException(`No existe software con id ${id}.`);
    }

    return software;
  }

  async update(id: string, updateSoftwareDto: UpdateSoftwareDto) {
    await this.ensureSoftwareExists(id);

    try {
      return await this.prisma.software.update({
        where: { id },
        data: this.normalizeUpdateInput(updateSoftwareDto),
      });
    } catch (error: unknown) {
      this.throwIfDuplicate(error);
      throw error;
    }
  }

  async remove(id: string) {
    await this.ensureSoftwareExists(id);
    return this.prisma.software.delete({ where: { id } });
  }

  async assignToAula(createAulaSoftwareDto: CreateAulaSoftwareDto) {
    const { aulaId, softwareId } = createAulaSoftwareDto;

    await Promise.all([
      this.ensureAulaExists(aulaId),
      this.ensureSoftwareExists(softwareId),
    ]);

    try {
      return await this.prisma.aulaSoftware.create({
        data: {
          aulaId,
          softwareId,
        },
        include: { aula: true, software: true },
      });
    } catch (error: unknown) {
      if (hasPrismaCode(error, 'P2002')) {
        throw new ConflictException(
          'El software ya está asociado con esta aula.',
        );
      }
      throw error;
    }
  }

  async removeFromAula(aulaId: string, softwareId: string) {
    const association = await this.prisma.aulaSoftware.findUnique({
      where: { aulaId_softwareId: { aulaId, softwareId } },
    });

    if (!association) {
      throw new NotFoundException(
        'El software no está asociado con el aula indicada.',
      );
    }

    return this.prisma.aulaSoftware.delete({
      where: { aulaId_softwareId: { aulaId, softwareId } },
    });
  }

  async findByAula(aulaId: string) {
    await this.ensureAulaExists(aulaId);
    return this.prisma.aulaSoftware.findMany({
      where: { aulaId },
      include: { software: true },
      orderBy: { software: { nombre: 'asc' } },
    });
  }

  async findAulasBySoftware(softwareId: string) {
    await this.ensureSoftwareExists(softwareId);
    return this.prisma.aulaSoftware.findMany({
      where: { softwareId },
      include: { aula: true },
      orderBy: { aula: { codigo: 'asc' } },
    });
  }

  findAulasByMultipleSoftware(softwareIds: string[]) {
    return this.prisma.aula.findMany({
      where: {
        AND: softwareIds.map((softwareId) => ({
          softwares: { some: { softwareId } },
        })),
      },
      include: {
        softwares: {
          where: { softwareId: { in: softwareIds } },
          include: { software: true },
        },
      },
      orderBy: { codigo: 'asc' },
    });
  }

  upsertCatalogEntry(createSoftwareDto: CreateSoftwareDto) {
    const normalized = this.normalizeCreateInput(createSoftwareDto);
    const { nombre, version, descripcion } = normalized;

    return this.prisma.software.upsert({
      where: { nombre_version: { nombre, version } },
      create: normalized,
      update: { descripcion },
    });
  }

  ensureAulaAssociation(
    aulaId: string,
    softwareId: string,
    instaladoEn?: Date,
  ) {
    return this.prisma.aulaSoftware.upsert({
      where: { aulaId_softwareId: { aulaId, softwareId } },
      create: {
        aulaId,
        softwareId,
        ...(instaladoEn && { instaladoEn }),
      },
      update: instaladoEn ? { instaladoEn } : {},
      include: { aula: true, software: true },
    });
  }

  private async ensureSoftwareExists(id: string): Promise<void> {
    const software = await this.prisma.software.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!software) {
      throw new NotFoundException(`No existe software con id ${id}.`);
    }
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

  private throwIfDuplicate(error: unknown): void {
    if (hasPrismaCode(error, 'P2002')) {
      throw new ConflictException(
        'Ya existe software con el mismo nombre y versión.',
      );
    }
  }

  private normalizeCreateInput(input: CreateSoftwareDto): CreateSoftwareDto {
    return {
      nombre: input.nombre.trim(),
      version: input.version.trim(),
      ...(input.descripcion !== undefined && {
        descripcion: input.descripcion.trim(),
      }),
    };
  }

  private normalizeUpdateInput(input: UpdateSoftwareDto): UpdateSoftwareDto {
    return {
      ...(input.nombre !== undefined && { nombre: input.nombre.trim() }),
      ...(input.version !== undefined && { version: input.version.trim() }),
      ...(input.descripcion !== undefined && {
        descripcion: input.descripcion.trim(),
      }),
    };
  }
}
