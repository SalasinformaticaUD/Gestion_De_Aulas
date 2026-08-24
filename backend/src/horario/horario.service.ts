import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateClaseProgramadaDto } from './dto/create-clase-programada.dto';
import { CreatePeriodoAcademicoDto } from './dto/create-periodo-academico.dto';
import { FindClasesDto } from './dto/find-clases.dto';
import { UpdateClaseProgramadaDto } from './dto/update-clase-programada.dto';
import { UpdatePeriodoAcademicoDto } from './dto/update-periodo-academico.dto';
import {
  ClaseImportacionDto,
  ImportarHorarioDto,
} from './dto/importar-horario.dto';
import { ImportarHorarioExcelDto } from './dto/importar-horario-excel.dto';

type PrismaError = { code?: unknown };

type ClaseParaValidar = {
  periodoId: string;
  aulaId: string;
  docenteId: string;
  asignaturaId: string;
  proyectoCurricularId: string | null;
  diaSemana: number;
  horaInicio: Date;
  horaFin: Date;
};

type HorarioDatabase = Pick<
  Prisma.TransactionClient,
  | 'periodoAcademico'
  | 'aula'
  | 'docente'
  | 'asignatura'
  | 'proyectoCurricular'
  | 'claseProgramada'
>;

type ClaseImportada = Prisma.ClaseProgramadaGetPayload<{
  include: {
    periodo: true;
    aula: true;
    docente: true;
    asignatura: true;
    proyectoCurricular: true;
  };
}>;

const hasPrismaCode = (error: unknown, code: string): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as PrismaError).code === code;

@Injectable()
export class HorarioService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly auditoria?: AuditoriaService,
  ) {}

  async createPeriodo(dto: CreatePeriodoAcademicoDto, usuarioId?: string) {
    const fechaInicio = new Date(dto.fechaInicio);
    const fechaFin = new Date(dto.fechaFin);

    if (fechaInicio >= fechaFin) {
      throw new BadRequestException(
        'La fecha de inicio del período debe ser anterior a la fecha de fin.',
      );
    }

    const data = {
      nombre: dto.nombre.trim(),
      fechaInicio,
      fechaFin,
      activo: dto.activo ?? false,
    };

    try {
      const periodo = !data.activo
        ? await this.prisma.periodoAcademico.create({ data })
        : await this.prisma.$transaction(async (tx) => {
            await tx.periodoAcademico.updateMany({
              where: { activo: true },
              data: { activo: false },
            });
            return tx.periodoAcademico.create({ data });
          });
      await this.registrar(
        usuarioId,
        'PeriodoAcademico',
        periodo.id,
        'CREATE',
        undefined,
        periodo,
      );
      return periodo;
    } catch (error: unknown) {
      if (hasPrismaCode(error, 'P2002')) {
        throw new ConflictException(
          'Ya existe un período académico con el mismo nombre.',
        );
      }
      throw error;
    }
  }

  findPeriodos() {
    return this.prisma.periodoAcademico.findMany({
      include: { _count: { select: { clases: true } } },
      orderBy: [{ activo: 'desc' }, { fechaInicio: 'desc' }],
    });
  }

  async findPeriodo(id: string) {
    const periodo = await this.prisma.periodoAcademico.findUnique({
      where: { id },
      include: { _count: { select: { clases: true } } },
    });

    if (!periodo) {
      throw new NotFoundException(`No existe período académico con id ${id}.`);
    }

    return periodo;
  }

  async activarPeriodo(id: string, usuarioId?: string) {
    const previo = await this.findPeriodo(id);
    const periodo = await this.prisma.$transaction(async (tx) => {
      const periodo = await tx.periodoAcademico.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!periodo) {
        throw new NotFoundException(
          `No existe período académico con id ${id}.`,
        );
      }

      await tx.periodoAcademico.updateMany({
        where: { activo: true, id: { not: id } },
        data: { activo: false },
      });

      return tx.periodoAcademico.update({
        where: { id },
        data: { activo: true },
      });
    });
    await this.registrar(
      usuarioId,
      'PeriodoAcademico',
      id,
      'UPDATE',
      previo,
      periodo,
    );
    return periodo;
  }

  async updatePeriodo(
    id: string,
    dto: UpdatePeriodoAcademicoDto,
    usuarioId?: string,
  ) {
    const actual = await this.prisma.periodoAcademico.findUnique({
      where: { id },
    });

    if (!actual) {
      throw new NotFoundException(`No existe período académico con id ${id}.`);
    }

    const fechaInicio = dto.fechaInicio
      ? new Date(dto.fechaInicio)
      : actual.fechaInicio;
    const fechaFin = dto.fechaFin ? new Date(dto.fechaFin) : actual.fechaFin;
    this.validatePeriodoRange(fechaInicio, fechaFin);

    const data: Prisma.PeriodoAcademicoUpdateInput = {
      ...(dto.nombre !== undefined && { nombre: dto.nombre.trim() }),
      ...(dto.fechaInicio !== undefined && { fechaInicio }),
      ...(dto.fechaFin !== undefined && { fechaFin }),
      ...(dto.activo !== undefined && { activo: dto.activo }),
    };

    try {
      const periodo =
        dto.activo !== true
          ? await this.prisma.periodoAcademico.update({ where: { id }, data })
          : await this.prisma.$transaction(async (tx) => {
              await tx.periodoAcademico.updateMany({
                where: { activo: true, id: { not: id } },
                data: { activo: false },
              });
              return tx.periodoAcademico.update({ where: { id }, data });
            });
      await this.registrar(
        usuarioId,
        'PeriodoAcademico',
        id,
        'UPDATE',
        actual,
        periodo,
      );
      return periodo;
    } catch (error: unknown) {
      this.throwKnownPeriodoPersistenceError(error);
      throw error;
    }
  }

  async removePeriodo(id: string, usuarioId?: string) {
    const periodo = await this.prisma.periodoAcademico.findUnique({
      where: { id },
      select: { id: true, _count: { select: { clases: true } } },
    });

    if (!periodo) {
      throw new NotFoundException(`No existe período académico con id ${id}.`);
    }
    if (periodo._count.clases > 0) {
      throw new ConflictException(
        'El período académico tiene clases asociadas y no se puede eliminar.',
      );
    }

    try {
      const eliminado = await this.prisma.periodoAcademico.delete({
        where: { id },
      });
      await this.registrar(
        usuarioId,
        'PeriodoAcademico',
        id,
        'DELETE',
        eliminado,
      );
      return eliminado;
    } catch (error: unknown) {
      if (hasPrismaCode(error, 'P2003')) {
        throw new ConflictException(
          'El período académico tiene información asociada y no se puede eliminar.',
        );
      }
      throw error;
    }
  }

  findClases(filters: FindClasesDto = {}) {
    const where: Prisma.ClaseProgramadaWhereInput = {
      ...(filters.aulaId && { aulaId: filters.aulaId }),
      ...(filters.periodoId && { periodoId: filters.periodoId }),
      ...(filters.diaSemana !== undefined && {
        diaSemana: filters.diaSemana,
      }),
    };

    return this.prisma.claseProgramada.findMany({
      where,
      include: {
        periodo: true,
        aula: true,
        docente: true,
        asignatura: true,
        proyectoCurricular: true,
      },
      orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }],
    });
  }

  async createClase(dto: CreateClaseProgramadaDto, usuarioId?: string) {
    const clase = this.normalizeClase(dto);
    this.validateTimeRange(clase.horaInicio, clase.horaFin);
    await this.validateReferences(clase);
    await this.ensureNoOverlap(clase);

    try {
      const creada = await this.prisma.claseProgramada.create({
        data: {
          ...clase,
          grupo: dto.grupo.trim(),
          ...(dto.inscritos !== undefined && { inscritos: dto.inscritos }),
        },
        include: {
          periodo: true,
          aula: true,
          docente: true,
          asignatura: true,
          proyectoCurricular: true,
        },
      });
      await this.registrar(
        usuarioId,
        'ClaseProgramada',
        creada.id,
        'CREATE',
        undefined,
        creada,
      );
      return creada;
    } catch (error: unknown) {
      this.throwKnownClassPersistenceError(error);
      throw error;
    }
  }

  importar(dto: ImportarHorarioDto) {
    return this.prisma.$transaction(async (tx) => {
      const creadas: ClaseImportada[] = [];

      for (const [index, fila] of dto.clases.entries()) {
        try {
          const catalogos = await this.resolveImportCatalogs(
            fila,
            dto.formato,
            tx,
          );
          const entrada: CreateClaseProgramadaDto = {
            ...fila,
            periodoId: dto.periodoId,
            docenteId: catalogos.docenteId,
            asignaturaId: catalogos.asignaturaId,
          };
          const clase = this.normalizeClase(entrada);
          this.validateTimeRange(clase.horaInicio, clase.horaFin);
          await this.validateReferences(clase, tx);
          await this.ensureNoOverlap(clase, undefined, tx);

          const creada = await tx.claseProgramada.create({
            data: {
              ...clase,
              grupo: fila.grupo.trim(),
              ...(fila.inscritos !== undefined && {
                inscritos: fila.inscritos,
              }),
            },
            include: {
              periodo: true,
              aula: true,
              docente: true,
              asignatura: true,
              proyectoCurricular: true,
            },
          });
          creadas.push(creada);
        } catch (error: unknown) {
          this.throwImportError(error, index);
        }
      }

      return {
        formato: dto.formato,
        periodoId: dto.periodoId,
        nombreArchivo: dto.nombreArchivo ?? null,
        totalRecibidas: dto.clases.length,
        totalCreadas: creadas.length,
        clases: creadas,
      };
    });
  }

  async importarExcelOficial(
    archivo:
      { buffer: Buffer; originalname: string; mimetype: string } | undefined,
    dto: ImportarHorarioExcelDto,
  ) {
    if (!archivo || !archivo.buffer.length) {
      throw new BadRequestException(
        'Debe adjuntar un archivo Excel en el campo archivo.',
      );
    }
    if (!/\.(xlsx|xls)$/i.test(archivo.originalname)) {
      throw new BadRequestException(
        'El archivo debe tener extensión .xlsx o .xls.',
      );
    }

    const periodo = await this.prisma.periodoAcademico.findUnique({
      where: { id: dto.periodoId },
      select: { id: true, activo: true },
    });
    if (!periodo)
      throw new NotFoundException('El período académico indicado no existe.');
    if (!periodo.activo) {
      throw new ConflictException(
        'La importación oficial solo está permitida para el período académico activo.',
      );
    }

    const filas = this.leerFilasExcel(archivo.buffer);
    const codigosAula = Array.from(
      new Set(
        filas.map((fila) => this.valorExcel(fila, 'AULA')).filter(Boolean),
      ),
    );
    const aulas = await this.prisma.aula.findMany({
      where: { codigo: { in: codigosAula } },
      select: { id: true, codigo: true },
    });
    const aulaPorCodigo = new Map(aulas.map((aula) => [aula.codigo, aula.id]));
    const rechazadas: Array<{ fila: number; motivo: string }> = [];
    const entradas: Array<{ fila: number; clase: ClaseImportacionDto }> = [];

    filas.forEach((fila, index) => {
      try {
        const codigoAula = this.valorExcel(fila, 'AULA');
        const aulaId = aulaPorCodigo.get(codigoAula);
        if (!aulaId) {
          rechazadas.push({
            fila: index + 2,
            motivo: `Aula ${codigoAula || '(vacía)'} no pertenece al catálogo de Aulas de Software.`,
          });
          return;
        }
        entradas.push({
          fila: index + 2,
          clase: this.convertirFilaExcel(fila, aulaId),
        });
      } catch (error: unknown) {
        rechazadas.push({ fila: index + 2, motivo: this.mensajeError(error) });
      }
    });

    const resultado = await this.prisma.$transaction(async (tx) => {
      const idsConservados: string[] = [];
      let creados = 0;
      let actualizados = 0;

      for (const entrada of entradas) {
        try {
          const catalogos = await this.resolveImportCatalogs(
            entrada.clase,
            'JSON_V2',
            tx,
          );
          const clase = this.normalizeClase({
            ...entrada.clase,
            periodoId: dto.periodoId,
            docenteId: catalogos.docenteId,
            asignaturaId: catalogos.asignaturaId,
          });
          this.validateTimeRange(clase.horaInicio, clase.horaFin);
          await this.validateReferences(clase, tx);
          const existente = await tx.claseProgramada.findFirst({
            where: {
              periodoId: dto.periodoId,
              aulaId: clase.aulaId,
              diaSemana: clase.diaSemana,
              horaInicio: clase.horaInicio,
              horaFin: clase.horaFin,
            },
            select: { id: true },
          });
          await this.ensureNoOverlap(clase, existente?.id, tx);
          const data = {
            ...clase,
            grupo: entrada.clase.grupo.trim(),
            ...(entrada.clase.inscritos !== undefined && {
              inscritos: entrada.clase.inscritos,
            }),
          };
          if (existente) {
            await tx.claseProgramada.update({
              where: { id: existente.id },
              data,
            });
            idsConservados.push(existente.id);
            actualizados += 1;
          } else {
            const creada = await tx.claseProgramada.create({ data });
            idsConservados.push(creada.id);
            creados += 1;
          }
        } catch (error: unknown) {
          rechazadas.push({
            fila: entrada.fila,
            motivo: this.mensajeError(error),
          });
        }
      }

      let eliminados = 0;
      if (dto.reemplazarAnterior) {
        const eliminacion = await tx.claseProgramada.deleteMany({
          where: {
            periodoId: dto.periodoId,
            ...(idsConservados.length > 0 && { id: { notIn: idsConservados } }),
          },
        });
        eliminados = eliminacion.count;
      }
      return { creados, actualizados, eliminados };
    });

    return {
      formato: 'EXCEL_OFICIAL_V1',
      periodoId: dto.periodoId,
      nombreArchivo: archivo.originalname,
      reemplazoAutorizado: Boolean(dto.reemplazarAnterior),
      procesados: filas.length,
      creados: resultado.creados,
      actualizados: resultado.actualizados,
      rechazados: rechazadas.length,
      filtrados: rechazadas.filter((fila) =>
        fila.motivo.includes('Aulas de Software'),
      ).length,
      eliminadosPorReemplazo: resultado.eliminados,
      detallesRechazados: rechazadas,
    };
  }

  async updateClase(
    id: string,
    dto: UpdateClaseProgramadaDto,
    usuarioId?: string,
  ) {
    const current = await this.prisma.claseProgramada.findUnique({
      where: { id },
    });

    if (!current) {
      throw new NotFoundException(`No existe clase programada con id ${id}.`);
    }

    const merged: ClaseParaValidar = {
      periodoId: dto.periodoId ?? current.periodoId,
      aulaId: dto.aulaId ?? current.aulaId,
      docenteId: dto.docenteId ?? current.docenteId,
      asignaturaId: dto.asignaturaId ?? current.asignaturaId,
      proyectoCurricularId:
        dto.proyectoCurricularId ?? current.proyectoCurricularId,
      diaSemana: dto.diaSemana ?? current.diaSemana,
      horaInicio: dto.horaInicio
        ? this.parseTime(dto.horaInicio)
        : current.horaInicio,
      horaFin: dto.horaFin ? this.parseTime(dto.horaFin) : current.horaFin,
    };

    this.validateTimeRange(merged.horaInicio, merged.horaFin);
    await this.validateReferences(merged);
    await this.ensureNoOverlap(merged, id);

    const data: Prisma.ClaseProgramadaUncheckedUpdateInput = {
      ...(dto.periodoId !== undefined && { periodoId: dto.periodoId }),
      ...(dto.aulaId !== undefined && { aulaId: dto.aulaId }),
      ...(dto.docenteId !== undefined && { docenteId: dto.docenteId }),
      ...(dto.asignaturaId !== undefined && {
        asignaturaId: dto.asignaturaId,
      }),
      ...(dto.proyectoCurricularId !== undefined && {
        proyectoCurricularId: dto.proyectoCurricularId,
      }),
      ...(dto.diaSemana !== undefined && { diaSemana: dto.diaSemana }),
      ...(dto.horaInicio !== undefined && {
        horaInicio: this.parseTime(dto.horaInicio),
      }),
      ...(dto.horaFin !== undefined && {
        horaFin: this.parseTime(dto.horaFin),
      }),
      ...(dto.grupo !== undefined && { grupo: dto.grupo.trim() }),
      ...(dto.inscritos !== undefined && { inscritos: dto.inscritos }),
    };

    try {
      const actualizada = await this.prisma.claseProgramada.update({
        where: { id },
        data,
        include: {
          periodo: true,
          aula: true,
          docente: true,
          asignatura: true,
          proyectoCurricular: true,
        },
      });
      await this.registrar(
        usuarioId,
        'ClaseProgramada',
        id,
        'UPDATE',
        current,
        actualizada,
      );
      return actualizada;
    } catch (error: unknown) {
      this.throwKnownClassPersistenceError(error);
      throw error;
    }
  }

  async removeClase(id: string, usuarioId?: string) {
    const clase = await this.prisma.claseProgramada.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!clase) {
      throw new NotFoundException(`No existe clase programada con id ${id}.`);
    }

    try {
      const eliminada = await this.prisma.claseProgramada.delete({
        where: { id },
      });
      await this.registrar(
        usuarioId,
        'ClaseProgramada',
        id,
        'DELETE',
        eliminada,
      );
      return eliminada;
    } catch (error: unknown) {
      if (hasPrismaCode(error, 'P2003')) {
        throw new ConflictException(
          'La clase tiene asistencias asociadas y no se puede eliminar.',
        );
      }
      throw error;
    }
  }

  private registrar(
    usuarioId: string | undefined,
    entidad: string,
    entidadId: string,
    accion: 'CREATE' | 'UPDATE' | 'DELETE',
    datosPrevios?: unknown,
    datosNuevos?: unknown,
  ) {
    return this.auditoria?.registrar({
      usuarioId,
      entidad,
      entidadId,
      accion,
      datosPrevios,
      datosNuevos,
    });
  }

  private normalizeClase(dto: CreateClaseProgramadaDto): ClaseParaValidar {
    return {
      periodoId: dto.periodoId,
      aulaId: dto.aulaId,
      docenteId: dto.docenteId,
      asignaturaId: dto.asignaturaId,
      proyectoCurricularId: dto.proyectoCurricularId ?? null,
      diaSemana: dto.diaSemana,
      horaInicio: this.parseTime(dto.horaInicio),
      horaFin: this.parseTime(dto.horaFin),
    };
  }

  private parseTime(value: string): Date {
    const parts = value.split(':').map(Number);
    const [hours, minutes, seconds = 0] = parts;
    return new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds));
  }

  private validateTimeRange(horaInicio: Date, horaFin: Date): void {
    if (horaInicio >= horaFin) {
      throw new BadRequestException(
        'La hora de inicio debe ser anterior a la hora de fin.',
      );
    }
  }

  private validatePeriodoRange(fechaInicio: Date, fechaFin: Date): void {
    if (fechaInicio >= fechaFin) {
      throw new BadRequestException(
        'La fecha de inicio del período debe ser anterior a la fecha de fin.',
      );
    }
  }

  private throwKnownPeriodoPersistenceError(error: unknown): void {
    if (hasPrismaCode(error, 'P2002')) {
      throw new ConflictException(
        'Ya existe un período académico con el mismo nombre.',
      );
    }
  }

  private async validateReferences(
    clase: ClaseParaValidar,
    database: HorarioDatabase = this.prisma,
  ): Promise<void> {
    const [periodo, aula, docente, asignatura, proyectoCurricular] =
      await Promise.all([
        database.periodoAcademico.findUnique({
          where: { id: clase.periodoId },
          select: { id: true },
        }),
        database.aula.findUnique({
          where: { id: clase.aulaId },
          select: { id: true },
        }),
        database.docente.findUnique({
          where: { id: clase.docenteId },
          select: { id: true },
        }),
        database.asignatura.findUnique({
          where: { id: clase.asignaturaId },
          select: { id: true },
        }),
        clase.proyectoCurricularId
          ? database.proyectoCurricular.findUnique({
              where: { id: clase.proyectoCurricularId },
              select: { id: true },
            })
          : Promise.resolve({ id: null }),
      ]);

    if (!periodo) {
      throw new NotFoundException('El período académico indicado no existe.');
    }
    if (!aula) {
      throw new NotFoundException('El aula indicada no existe.');
    }
    if (!docente) {
      throw new NotFoundException('El docente indicado no existe.');
    }
    if (!asignatura) {
      throw new NotFoundException('La asignatura indicada no existe.');
    }
    if (!proyectoCurricular) {
      throw new NotFoundException('El proyecto curricular indicado no existe.');
    }
  }

  private async ensureNoOverlap(
    clase: ClaseParaValidar,
    excludeId?: string,
    database: HorarioDatabase = this.prisma,
  ): Promise<void> {
    const overlap = await database.claseProgramada.findFirst({
      where: {
        periodoId: clase.periodoId,
        aulaId: clase.aulaId,
        diaSemana: clase.diaSemana,
        horaInicio: { lt: clase.horaFin },
        horaFin: { gt: clase.horaInicio },
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: { id: true },
    });

    if (overlap) {
      throw new ConflictException(
        'La clase se cruza con otra clase programada en la misma aula.',
      );
    }
  }

  private throwKnownClassPersistenceError(error: unknown): void {
    if (hasPrismaCode(error, 'P2003')) {
      throw new NotFoundException(
        'Una de las entidades relacionadas con la clase ya no existe.',
      );
    }
  }

  private async resolveImportCatalogs(
    fila: ClaseImportacionDto,
    formato: ImportarHorarioDto['formato'],
    database: HorarioDatabase,
  ): Promise<{ docenteId: string; asignaturaId: string }> {
    if (formato === 'JSON_V1') {
      if (
        !fila.docenteId ||
        !fila.asignaturaId ||
        fila.docente ||
        fila.asignatura
      ) {
        throw new BadRequestException(
          'JSON_V1 requiere docenteId y asignaturaId y no admite catálogos embebidos.',
        );
      }
      return {
        docenteId: fila.docenteId,
        asignaturaId: fila.asignaturaId,
      };
    }

    this.validateExclusiveCatalogReference(
      fila.docenteId,
      fila.docente,
      'docente',
    );
    this.validateExclusiveCatalogReference(
      fila.asignaturaId,
      fila.asignatura,
      'asignatura',
    );

    const docenteId = fila.docenteId
      ? fila.docenteId
      : (
          await database.docente.upsert({
            where: { documento: fila.docente!.documento.trim() },
            update: {
              nombre: fila.docente!.nombre.trim(),
              ...(fila.docente!.correo && {
                correo: fila.docente!.correo.trim().toLowerCase(),
              }),
            },
            create: {
              documento: fila.docente!.documento.trim(),
              nombre: fila.docente!.nombre.trim(),
              ...(fila.docente!.correo && {
                correo: fila.docente!.correo.trim().toLowerCase(),
              }),
            },
            select: { id: true },
          })
        ).id;

    if (fila.asignatura && fila.proyectoCurricularId) {
      const proyecto = await database.proyectoCurricular.findUnique({
        where: { id: fila.proyectoCurricularId },
        select: { id: true },
      });
      if (!proyecto) {
        throw new NotFoundException(
          'El proyecto curricular de la asignatura no existe.',
        );
      }
    }

    const asignaturaId = fila.asignaturaId
      ? fila.asignaturaId
      : (
          await database.asignatura.upsert({
            where: { codigo: fila.asignatura!.codigo.trim() },
            update: {
              nombre: fila.asignatura!.nombre.trim(),
              ...(fila.proyectoCurricularId && {
                proyectoCurricularId: fila.proyectoCurricularId,
              }),
            },
            create: {
              codigo: fila.asignatura!.codigo.trim(),
              nombre: fila.asignatura!.nombre.trim(),
              ...(fila.proyectoCurricularId && {
                proyectoCurricularId: fila.proyectoCurricularId,
              }),
            },
            select: { id: true },
          })
        ).id;

    return { docenteId, asignaturaId };
  }

  private validateExclusiveCatalogReference(
    id: string | undefined,
    embedded: object | undefined,
    catalog: string,
  ): void {
    if (Boolean(id) === Boolean(embedded)) {
      throw new BadRequestException(
        `JSON_V2 requiere exactamente uno entre ${catalog}Id y ${catalog}.`,
      );
    }
  }

  private leerFilasExcel(buffer: Buffer): Array<Record<string, unknown>> {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
    } catch {
      throw new BadRequestException('No fue posible leer el archivo Excel.');
    }
    const nombreHoja = workbook.SheetNames[0];
    if (!nombreHoja)
      throw new BadRequestException('El archivo Excel no contiene hojas.');
    const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets[nombreHoja],
      { defval: '' },
    );
    if (filas.length === 0)
      throw new BadRequestException('El archivo Excel no contiene registros.');
    if (filas.length > 500)
      throw new BadRequestException(
        'El archivo Excel supera el máximo de 500 filas.',
      );
    const encabezados = new Set(
      Object.keys(filas[0]).map((encabezado) =>
        encabezado.trim().toUpperCase(),
      ),
    );
    const requeridos = [
      'AULA',
      'DIA_SEMANA',
      'HORA_INICIO',
      'HORA_FIN',
      'GRUPO',
      'DOCENTE_DOCUMENTO',
      'DOCENTE_NOMBRE',
      'ASIGNATURA_CODIGO',
      'ASIGNATURA_NOMBRE',
    ];
    const faltantes = requeridos.filter(
      (encabezado) => !encabezados.has(encabezado),
    );
    if (faltantes.length) {
      throw new BadRequestException(
        `Faltan columnas requeridas: ${faltantes.join(', ')}.`,
      );
    }
    return filas;
  }

  private convertirFilaExcel(
    fila: Record<string, unknown>,
    aulaId: string,
  ): ClaseImportacionDto {
    const diaSemana = Number(this.valorExcel(fila, 'DIA_SEMANA'));
    const inscritosTexto = this.valorExcel(fila, 'INSCRITOS');
    const inscritos = inscritosTexto ? Number(inscritosTexto) : undefined;
    if (!Number.isInteger(diaSemana) || diaSemana < 1 || diaSemana > 6) {
      throw new BadRequestException(
        'DIA_SEMANA debe ser un entero entre 1 y 6.',
      );
    }
    if (
      inscritos !== undefined &&
      (!Number.isInteger(inscritos) || inscritos < 0)
    ) {
      throw new BadRequestException(
        'INSCRITOS debe ser un entero positivo o cero.',
      );
    }
    const horaInicio = this.valorExcel(fila, 'HORA_INICIO');
    const horaFin = this.valorExcel(fila, 'HORA_FIN');
    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(horaInicio) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(horaFin)
    ) {
      throw new BadRequestException(
        'HORA_INICIO y HORA_FIN deben usar formato HH:mm.',
      );
    }
    const documento = this.valorExcel(fila, 'DOCENTE_DOCUMENTO');
    const nombreDocente = this.valorExcel(fila, 'DOCENTE_NOMBRE');
    const codigoAsignatura = this.valorExcel(fila, 'ASIGNATURA_CODIGO');
    const nombreAsignatura = this.valorExcel(fila, 'ASIGNATURA_NOMBRE');
    const grupo = this.valorExcel(fila, 'GRUPO');
    if (
      !documento ||
      !nombreDocente ||
      !codigoAsignatura ||
      !nombreAsignatura ||
      !grupo
    ) {
      throw new BadRequestException(
        'La fila contiene campos académicos requeridos vacíos.',
      );
    }
    const proyectoCurricularId =
      this.valorExcel(fila, 'PROYECTO_CURRICULAR_ID') || undefined;
    return {
      aulaId,
      diaSemana,
      horaInicio,
      horaFin,
      grupo,
      inscritos,
      proyectoCurricularId,
      docente: {
        documento,
        nombre: nombreDocente,
        ...(this.valorExcel(fila, 'DOCENTE_CORREO') && {
          correo: this.valorExcel(fila, 'DOCENTE_CORREO'),
        }),
      },
      asignatura: { codigo: codigoAsignatura, nombre: nombreAsignatura },
    };
  }

  private valorExcel(
    fila: Record<string, unknown>,
    encabezado: string,
  ): string {
    const clave = Object.keys(fila).find(
      (actual) => actual.trim().toUpperCase() === encabezado,
    );
    return clave && fila[clave] !== undefined ? String(fila[clave]).trim() : '';
  }

  private mensajeError(error: unknown): string {
    return error instanceof Error
      ? error.message
      : 'Error desconocido al procesar la fila.';
  }

  private throwImportError(error: unknown, index: number): never {
    const fila = index + 1;
    if (error instanceof HttpException) {
      throw new HttpException(
        `Fila ${fila}: ${error.message}`,
        error.getStatus(),
      );
    }
    if (hasPrismaCode(error, 'P2002')) {
      throw new ConflictException(
        `Fila ${fila}: el docente o la asignatura entra en conflicto con un catálogo existente.`,
      );
    }
    if (hasPrismaCode(error, 'P2003')) {
      throw new NotFoundException(
        `Fila ${fila}: una de las entidades relacionadas ya no existe.`,
      );
    }
    this.throwKnownClassPersistenceError(error);
    throw error;
  }
}
