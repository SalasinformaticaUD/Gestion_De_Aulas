import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as XLSX from 'xlsx';
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
    const { aulaId, instaladoEn } = createAulaSoftwareDto;

    await this.ensureAulaExists(aulaId);
    const softwareId = await this.resolverSoftwareParaAsignacion(
      createAulaSoftwareDto,
    );

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

  private async resolverSoftwareParaAsignacion(
    dto: CreateAulaSoftwareDto,
  ): Promise<string> {
    if (dto.softwareId) {
      await this.ensureSoftwareExists(dto.softwareId);
      return dto.softwareId;
    }
    if (!dto.nombre || !dto.version) {
      throw new NotFoundException(
        'Debe indicar softwareId o nombre y versión del software.',
      );
    }
    return (
      await this.upsertCatalogEntry({
        nombre: dto.nombre,
        version: dto.version,
        ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
      })
    ).id;
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

  async importInventory(
    importarSoftwareDto: ImportarSoftwareDto,
    reemplazarAnterior = false,
  ) {
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
      const asociacionesCargadas = new Map<
        string,
        { aulaId: string; softwareId: string }
      >();
      let registrosProcesados = 0;
      const aulas = await tx.aula.findMany({
        where: { eliminadoEn: null },
        select: { id: true, codigo: true },
      });
      const aulasPorCodigo = new Map<string, string>();
      aulas.forEach((aula) => {
        aulasPorCodigo.set(this.normalizarCodigoAula(aula.codigo), aula.id);
        if (/^\d+[A-Z]?$/i.test(aula.codigo.trim())) {
          aulasPorCodigo.set(
            this.normalizarCodigoAula(`Aula ${aula.codigo}`),
            aula.id,
          );
        }
      });
      const asociacionesExistentes = await tx.aulaSoftware.findMany({
        include: { software: { select: { nombre: true } } },
      });
      const asociacionesPorAulaYNombre = new Map<
        string,
        { aulaId: string; softwareId: string; software: { nombre: string } }
      >(
        asociacionesExistentes.map((asociacion) => [
          this.claveAsociacionAulaSoftware(
            asociacion.aulaId,
            asociacion.software.nombre,
          ),
          asociacion,
        ]),
      );

      for (const [index, fila] of filas.entries()) {
        const normalized = this.normalizeImportRow(fila);
        // `filas` no incluye la fila de encabezados que XLSX elimina al
        // convertir la hoja a objetos. Excel, en cambio, numera la primera
        // fila de datos como la fila 2.
        const filaExcel = index + 2;

        try {
          if (!normalized.aulaCodigo || !normalized.nombre || !normalized.version) {
            errores.push({
              fila: filaExcel,
              aulaCodigo: normalized.aulaCodigo,
              nombre: normalized.nombre,
              version: normalized.version,
              error: 'Aula, Software y Software Versión son obligatorios.',
            });
            continue;
          }
          const aulaId = aulasPorCodigo.get(
            this.normalizarCodigoAula(normalized.aulaCodigo),
          );

          if (!aulaId) {
            errores.push({
              fila: filaExcel,
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

          const claveAsociacion = this.claveAsociacionAulaSoftware(
            aulaId,
            normalized.nombre,
          );
          const asociacionExistente = asociacionesPorAulaYNombre.get(
            claveAsociacion,
          );

          // La identidad de una instalación es Aula + nombre del software.
          // Si el archivo trae otra versión, se reemplaza esa asociación en
          // lugar de dejar ambas versiones instaladas en la misma aula.
          if (
            asociacionExistente &&
            asociacionExistente.softwareId !== software.id
          ) {
            await tx.aulaSoftware.delete({
              where: {
                aulaId_softwareId: {
                  aulaId,
                  softwareId: asociacionExistente.softwareId,
                },
              },
            });
          }

          await tx.aulaSoftware.upsert({
            where: {
              aulaId_softwareId: {
                aulaId,
                softwareId: software.id,
              },
            },
            create: {
              aulaId,
              softwareId: software.id,
            },
            update: {},
          });

          asociacionesPorAulaYNombre.set(claveAsociacion, {
            aulaId,
            softwareId: software.id,
            software: { nombre: normalized.nombre },
          });
          asociacionesCargadas.set(claveAsociacion, { aulaId, softwareId: software.id });
          registrosProcesados += 1;
        } catch (error: unknown) {
          errores.push({
            fila: filaExcel,
            aulaCodigo: normalized.aulaCodigo,
            nombre: normalized.nombre,
            version: normalized.version,
            error: this.getErrorMessage(error),
          });
        }
      }

      let asociacionesReemplazadas = 0;
      const asociacionesFinales = [...asociacionesCargadas.values()];
      if (reemplazarAnterior && errores.length === 0 && asociacionesFinales.length > 0) {
        const eliminacion = await tx.aulaSoftware.deleteMany({
          where: {
            NOT: {
              OR: asociacionesFinales.map((asociacion) => ({
                aulaId: asociacion.aulaId,
                softwareId: asociacion.softwareId,
              })),
            },
          },
        });
        asociacionesReemplazadas = eliminacion.count;
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
          asociacionesReemplazadas,
          reemplazoAplicado: reemplazarAnterior && errores.length === 0,
        },
        errores,
      };
    }, {
      // Un inventario institucional puede contener miles de instalaciones.
      // El valor predeterminado de Prisma (5 s) finaliza antes de completar
      // un archivo grande aunque sus filas sean válidas.
      maxWait: 30_000,
      timeout: 1_800_000,
    });
  }

  async importInventoryExcel(
    archivo:
      | { buffer: Buffer; originalname: string; mimetype: string }
      | undefined,
  ) {
    if (!archivo?.buffer.length) {
      throw new BadRequestException('Debe adjuntar un archivo Excel.');
    }
    if (!/\.(xlsx|xls)$/i.test(archivo.originalname)) {
      throw new BadRequestException('El archivo debe tener extensión .xlsx o .xls.');
    }

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(archivo.buffer, { type: 'buffer' });
    } catch {
      throw new BadRequestException('No fue posible leer el archivo Excel.');
    }
    const hoja = workbook.Sheets[workbook.SheetNames[0] ?? ''];
    if (!hoja) throw new BadRequestException('El archivo Excel no contiene hojas.');
    const registros = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, {
      defval: '',
    });
    if (!registros.length) {
      throw new BadRequestException('El archivo Excel no contiene filas de software.');
    }

    const filas = registros.map((fila) => ({
      aulaCodigo: this.valorExcel(fila, 'AULA'),
      nombre: this.valorExcel(fila, 'SOFTWARE'),
      version:
        this.valorExcel(fila, 'SOFTWARE VERSION') ||
        this.valorExcel(fila, 'SOFTWARE VERSIONES') ||
        this.valorExcel(fila, 'VERSION'),
    }));
    if (!filas.some((fila) => fila.aulaCodigo || fila.nombre || fila.version)) {
      throw new BadRequestException('El archivo Excel no contiene datos válidos.');
    }
    return this.importInventory(
      { filas, nombreArchivo: archivo.originalname },
      true,
    );
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
      ...(input.estado !== undefined && { estado: input.estado }),
    };
  }

  private normalizeUpdateInput(input: UpdateSoftwareDto): UpdateSoftwareDto {
    return {
      ...(input.nombre !== undefined && { nombre: input.nombre.trim() }),
      ...(input.version !== undefined && { version: input.version.trim() }),
      ...(input.descripcion !== undefined && {
        descripcion: input.descripcion.trim(),
      }),
      ...(input.estado !== undefined && { estado: input.estado }),
    };
  }

  private normalizeImportRow(
    input: FilaImportacionSoftwareDto,
  ): FilaImportacionSoftwareDto {
    return {
      aulaCodigo: String(input.aulaCodigo ?? '').trim(),
      nombre: String(input.nombre ?? '').trim(),
      version: String(input.version ?? '').trim(),
      ...(input.descripcion !== undefined && {
        descripcion: input.descripcion.trim(),
      }),
    };
  }

  private valorExcel(fila: Record<string, unknown>, encabezado: string): string {
    const clave = this.normalizarEncabezado(encabezado);
    const encontrada = Object.entries(fila).find(
      ([nombre]) => this.normalizarEncabezado(nombre) === clave,
    );
    return encontrada ? String(encontrada[1] ?? '').trim() : '';
  }

  private normalizarEncabezado(valor: string): string {
    return valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();
  }

  private normalizarCodigoAula(valor: string): string {
    return valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  private claveAsociacionAulaSoftware(
    aulaId: string,
    nombreSoftware: string,
  ): string {
    return `${aulaId}:${nombreSoftware.trim().toLocaleLowerCase('es')}`;
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
