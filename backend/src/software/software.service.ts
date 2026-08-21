import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSoftwareDto } from './dto/create-software.dto';
import { UpdateSoftwareDto } from './dto/update-software.dto';
import { CreateAulaSoftwareDto } from './dto/create-aula-software.dto';
import {
  FilaImportacionSoftwareDto,
  ImportarSoftwareDto,
} from './dto/importar-software.dto';

type PrismaError = { code?: unknown };
type ResultadoImportacionSoftware = 'EXITOSA' | 'PARCIAL' | 'FALLIDA';
type ImportacionSoftwareError = {
  fila: number;
  aulaCodigo: string;
  nombre: string;
  version: string;
  error: string;
};

const RESULTADO_IMPORTACION_SOFTWARE = {
  EXITOSA: 'EXITOSA',
  PARCIAL: 'PARCIAL',
  FALLIDA: 'FALLIDA',
} as const;

const hasPrismaCode = (error: unknown, code: string): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as PrismaError).code === code;

@Injectable()
export class SoftwareService {
  constructor(private readonly prisma: PrismaService) {}

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

    const associations = await this.prisma.aulaSoftware.count({
      where: { softwareId: id },
    });

    if (associations > 0) {
      throw new ConflictException(
        'No se puede eliminar software asociado a una o mas aulas.',
      );
    }

    return this.prisma.software.delete({ where: { id } });
  }

  async assignToAula(createAulaSoftwareDto: CreateAulaSoftwareDto) {
    const { aulaId, softwareId, instaladoEn } = createAulaSoftwareDto;

    await Promise.all([
      this.ensureAulaExists(aulaId),
      this.ensureSoftwareExists(softwareId),
    ]);

    try {
      return await this.prisma.aulaSoftware.create({
        data: {
          aulaId,
          softwareId,
          ...(instaladoEn && { instaladoEn: new Date(instaladoEn) }),
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

  findImportaciones() {
    return this.prisma.importacionSoftware.findMany({
      include: { usuario: true },
      orderBy: { creadoEn: 'desc' },
    });
  }

  async importInventory(importarSoftwareDto: ImportarSoftwareDto) {
    const { filas, nombreArchivo, usuarioId } = importarSoftwareDto;

    if (usuarioId) {
      const usuario = await this.prisma.usuario.findUnique({
        where: { id: usuarioId },
        select: { id: true },
      });

      if (!usuario) {
        throw new NotFoundException(`No existe usuario con id ${usuarioId}.`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const errores: ImportacionSoftwareError[] = [];
      let registrosProcesados = 0;

      for (const [index, fila] of filas.entries()) {
        const normalized = this.normalizeImportRow(fila);

        try {
          const aula = await tx.aula.findUnique({
            where: { codigo: normalized.aulaCodigo },
            select: { id: true },
          });

          if (!aula) {
            errores.push({
              fila: index + 1,
              aulaCodigo: normalized.aulaCodigo,
              nombre: normalized.nombre,
              version: normalized.version,
              error: 'No existe un aula con el codigo indicado.',
            });
            continue;
          }

          const software = await tx.software.upsert({
            where: {
              nombre_version: {
                nombre: normalized.nombre,
                version: normalized.version,
              },
            },
            create: {
              nombre: normalized.nombre,
              version: normalized.version,
              descripcion: normalized.descripcion,
            },
            update: {
              descripcion: normalized.descripcion,
            },
          });

          await tx.aulaSoftware.upsert({
            where: {
              aulaId_softwareId: {
                aulaId: aula.id,
                softwareId: software.id,
              },
            },
            create: {
              aulaId: aula.id,
              softwareId: software.id,
            },
            update: {},
          });

          registrosProcesados += 1;
        } catch (error: unknown) {
          errores.push({
            fila: index + 1,
            aulaCodigo: normalized.aulaCodigo,
            nombre: normalized.nombre,
            version: normalized.version,
            error: this.getErrorMessage(error),
          });
        }
      }

      const resultado = this.getImportResult(filas.length, registrosProcesados);

      const importacion = await tx.importacionSoftware.create({
        data: {
          usuarioId,
          nombreArchivo,
          totalRegistros: filas.length,
          registrosProcesados,
          registrosConError: errores.length,
          resultado,
          ...(errores.length > 0 && { errores }),
        },
        include: { usuario: true },
      });

      return {
        importacion,
        resumen: {
          totalRegistros: filas.length,
          registrosProcesados,
          registrosConError: errores.length,
          resultado,
        },
        errores,
      };
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

  private normalizeImportRow(
    input: FilaImportacionSoftwareDto,
  ): FilaImportacionSoftwareDto {
    return {
      aulaCodigo: input.aulaCodigo.trim(),
      nombre: input.nombre.trim(),
      version: input.version.trim(),
      ...(input.descripcion !== undefined && {
        descripcion: input.descripcion.trim(),
      }),
    };
  }

  private getImportResult(
    totalRegistros: number,
    registrosProcesados: number,
  ): ResultadoImportacionSoftware {
    if (registrosProcesados === totalRegistros) {
      return RESULTADO_IMPORTACION_SOFTWARE.EXITOSA;
    }

    if (registrosProcesados > 0) {
      return RESULTADO_IMPORTACION_SOFTWARE.PARCIAL;
    }

    return RESULTADO_IMPORTACION_SOFTWARE.FALLIDA;
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error
      ? error.message
      : 'No fue posible procesar la fila.';
  }
}
