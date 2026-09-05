import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
import { EstadoAsistencia } from '../../generated/prisma/enums.js';
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
  semana: number;
  modeloPc?: string | null;
  software?: string | null;
  hardware?: string | null;
};

type HorarioDatabase = Pick<
  Prisma.TransactionClient,
  | 'periodoAcademico'
  | 'aula'
  | 'docente'
  | 'asignatura'
  | 'proyectoCurricular'
  | 'claseProgramada'
  | 'asistenciaDocente'
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

  async findClases(filters: FindClasesDto = {}) {
    await this.cerrarAsistenciasVencidas(filters.fecha);
    const fecha = filters.fecha ? new Date(`${filters.fecha}T00:00:00.000Z`) : undefined;
    const diaSemana = fecha ? (fecha.getUTCDay() || 7) : filters.diaSemana;
    const where: Prisma.ClaseProgramadaWhereInput = {
      ...(filters.aulaId && { aulaId: filters.aulaId }),
      ...(filters.periodoId && { periodoId: filters.periodoId }),
      ...(diaSemana !== undefined && {
        diaSemana,
      }),
      ...(fecha && { periodo: { fechaInicio: { lte: fecha }, fechaFin: { gte: fecha } } }),
    };

    return this.prisma.claseProgramada.findMany({
      where,
      include: {
        periodo: true,
        aula: true,
        docente: true,
        asignatura: true,
        proyectoCurricular: true,
        asistencias: {
          ...(fecha && { where: { fecha } }),
          orderBy: { fecha: 'desc' },
        },
      },
      orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }],
    });
  }

  async createClase(dto: CreateClaseProgramadaDto, usuarioId?: string) {
    const clase = this.normalizeClase({
      ...dto,
      semana: 1,
    });
    this.validateTimeRange(clase.horaInicio, clase.horaFin);
    await this.validateReferences(clase);
    await this.ensureNoOverlap(clase);

    try {
      const creada = await this.prisma.claseProgramada.create({
        data: {
          ...clase,
          grupo: dto.grupo.trim(),
          ...(dto.inscritos !== undefined && { inscritos: dto.inscritos }),
          modeloPc: dto.modeloPc?.trim() || null,
          software: dto.software?.trim() || null,
          hardware: dto.hardware?.trim() || null,
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
      const periodo = await tx.periodoAcademico.findUnique({
        where: { id: dto.periodoId },
        select: { fechaInicio: true },
      });
      const semanaPorDefecto = periodo?.fechaInicio
        ? this.calcularSemanaSemestre(periodo.fechaInicio)
        : 1;

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
            semana: fila.semana ?? semanaPorDefecto,
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
              modeloPc: fila.modeloPc?.trim() || null,
              software: fila.software?.trim() || null,
              hardware: fila.hardware?.trim() || null,
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
      select: { id: true, activo: true, fechaInicio: true },
    });
    if (!periodo)
      throw new NotFoundException('El período académico indicado no existe.');
    if (!periodo.activo) {
      throw new ConflictException(
        'La importación oficial solo está permitida para el período académico activo.',
      );
    }

    const filas = this.leerFilasExcel(archivo.buffer);
    const aulas = await this.prisma.aula.findMany({
      select: { id: true, codigo: true },
    });
    const aulaPorCodigo = new Map<string, string>();
    const aulaPorNumero = new Map<string, string | undefined>();
    aulas.forEach((aula) => {
      const codigo = aula.codigo.trim();
      aulaPorCodigo.set(this.normalizarCodigoAula(codigo), aula.id);
      aulaPorCodigo.set(this.normalizarCodigoAula(`AULA ${codigo}`), aula.id);
      // Solo las aulas cuyo código es exclusivamente numérico pueden
      // encontrarse como alternativa por número. Así, “AULA 403” no se
      // confunde con “SALA ESPECIALIZADA 403”.
      const numero = /^\d+[A-Z]?$/i.test(codigo) ? codigo : undefined;
      if (numero) {
        const previo = aulaPorNumero.get(numero.toUpperCase());
        aulaPorNumero.set(
          numero.toUpperCase(),
          previo && previo !== aula.id ? undefined : aula.id,
        );
      }
    });
    const rechazadas: Array<{ fila: number; motivo: string }> = [];
    const advertencias: Array<{ fila: number; motivo: string }> = [];
    const entradas: Array<{ fila: number; clase: ClaseImportacionDto }> = [];

    const clavesLote = new Set<string>();
    filas.forEach((fila, index) => {
      try {
        const salon =
          this.valorExcel(fila, 'SALON') || this.valorExcel(fila, 'AULA');
        const codigoAula = this.extraerCodigoAula(salon);
        const aulaId =
          aulaPorCodigo.get(this.normalizarCodigoAula(codigoAula)) ??
          aulaPorNumero.get(
            codigoAula.match(/\d+[A-Z]?$/i)?.[0]?.toUpperCase() ?? '',
          );
        if (!aulaId) {
          rechazadas.push({
            fila: index + 2,
            motivo: `Aula ${codigoAula || '(vacía)'} no pertenece al catálogo de Aulas de Software.`,
          });
          return;
        }
        const clase = this.convertirFilaExcel(
          fila,
          aulaId,
          periodo.fechaInicio
            ? this.calcularSemanaSemestre(periodo.fechaInicio)
            : 1,
        );
        const clave = `${aulaId}|${clase.diaSemana}|${clase.horaInicio}|${clase.horaFin}`;
        if (clavesLote.has(clave)) {
          throw new ConflictException('Registro duplicado dentro del archivo.');
        }
        clavesLote.add(clave);
        entradas.push({
          fila: index + 2,
          clase,
        });
        if (clase.docente?.nombre === 'Información no disponible') {
          advertencias.push({
            fila: index + 2,
            motivo:
              'No se indicó docente; la clase se registró con “Información no disponible”.',
          });
        }
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
          const proyectoCurricular = entrada.clase.proyectoCurricularNombre
            ? await tx.proyectoCurricular.upsert({
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                where: { nombre: entrada.clase.proyectoCurricularNombre },
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                create: { nombre: entrada.clase.proyectoCurricularNombre },
                update: {},
                select: { id: true },
              })
            : undefined;
          const catalogos = await this.resolveImportCatalogs(
            entrada.clase,
            'JSON_V2',
            tx,
          );
          const clase = this.normalizeClase({
            ...entrada.clase,
            periodoId: dto.periodoId,
            proyectoCurricularId: proyectoCurricular?.id,
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
        await tx.asistenciaDocente?.deleteMany({
          where: {
            clase: {
              periodoId: dto.periodoId,
              ...(idsConservados.length > 0 && {
                id: { notIn: idsConservados },
              }),
            },
          },
        });
        const eliminacion = await tx.claseProgramada.deleteMany({
          where: {
            periodoId: dto.periodoId,
            ...(idsConservados.length > 0 && { id: { notIn: idsConservados } }),
          },
        });
        eliminados = eliminacion.count;
      }
      return { creados, actualizados, eliminados };
    }, {
      // La importación oficial puede tener miles de filas y resuelve catálogos,
      // cruces y actualizaciones por cada una. Se conserva una única
      // transacción atómica, ampliando solo su ventana de ejecución.
      maxWait: 10_000,
      timeout: 120_000,
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
      advertencias,
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
      semana: 1,
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
      ...(dto.modeloPc !== undefined && {
        modeloPc: dto.modeloPc.trim() || null,
      }),
      ...(dto.software !== undefined && {
        software: dto.software.trim() || null,
      }),
      ...(dto.hardware !== undefined && {
        hardware: dto.hardware.trim() || null,
      }),
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
      // Se conserva en el modelo por compatibilidad, pero una clase representa
      // el mismo bloque recurrente durante todo el período académico.
      semana: 1,
      modeloPc: dto.modeloPc?.trim() || null,
      software: dto.software?.trim() || null,
      hardware: dto.hardware?.trim() || null,
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
      : await (async () => {
          const nombre = fila.docente!.nombre.trim();
          const documento = fila.docente!.documento?.trim();
          if (documento) {
            return (
              await database.docente.upsert({
                where: { documento },
                update: {
                  nombre,
                  ...(fila.docente!.correo && {
                    correo: fila.docente!.correo.trim().toLowerCase(),
                  }),
                },
                create: {
                  documento,
                  nombre,
                  ...(fila.docente!.correo && {
                    correo: fila.docente!.correo.trim().toLowerCase(),
                  }),
                },
                select: { id: true },
              })
            ).id;
          }
          const existente = await database.docente.findFirst({
            where: {
              nombre: { equals: nombre, mode: 'insensitive' },
              documento: { not: null },
            },
            select: { id: true },
          });
          if (existente) return existente.id;
          const nombreNormalizado = this.normalizarNombreDocente(nombre);
          const docentesConDocumento = await database.docente.findMany({
            where: { documento: { not: null } },
            select: { id: true, nombre: true },
          });
          const existenteConNombreNormalizado = docentesConDocumento.find(
            (docente) =>
              this.normalizarNombreDocente(docente.nombre) === nombreNormalizado,
          );
          if (existenteConNombreNormalizado) return existenteConNombreNormalizado.id;
          const existenteSinDocumento = await database.docente.findFirst({
            where: { nombre: { equals: nombre, mode: 'insensitive' } },
            select: { id: true },
          });
          if (existenteSinDocumento) return existenteSinDocumento.id;
          return (
            await database.docente.upsert({
              where: { documento: 'DOCENTE_NO_IDENTIFICADO' },
              update: { nombre: 'Información no disponible' },
              create: {
                documento: 'DOCENTE_NO_IDENTIFICADO',
                nombre: 'Información no disponible',
              },
              select: { id: true },
            })
          ).id;
        })();

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

  private normalizarNombreDocente(nombre: string): string {
    let valor = nombre;
    if (/[ÃÂ]/.test(valor)) {
      try {
        valor = Buffer.from(valor, 'latin1').toString('utf8');
      } catch {
        // Si no es texto mal codificado, se conserva el valor original.
      }
    }
    return valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase();
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

  private valorExcel(
    fila: Record<string, unknown>,
    encabezado: string,
  ): string {
    const normalizado = encabezado
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();
    const clave = Object.keys(fila).find(
      (actual) =>
        actual
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
          .toUpperCase() === normalizado,
    );
    if (!clave || fila[clave] === undefined || fila[clave] === null) {
      return '';
    }

    const valor = fila[clave];

    if (typeof valor === 'string') return valor.trim();
    if (
      typeof valor === 'number' ||
      typeof valor === 'boolean' ||
      typeof valor === 'bigint'
    ) {
      return String(valor).trim();
    }
    if (Array.isArray(valor)) {
      return valor
        .map((item) => String(item))
        .join(',')
        .trim();
    }

    return '';
  }

  private mensajeError(error: unknown): string {
    return error instanceof Error
      ? error.message
      : 'Error desconocido al procesar la fila.';
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
    if (filas.length > 5_000)
      throw new BadRequestException(
        'El archivo Excel supera el máximo de 5.000 filas.',
      );
    const encabezados = new Set(
      Object.keys(filas[0]).map((encabezado) =>
        encabezado
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
          .toUpperCase(),
      ),
    );
    const formatoNuevo = encabezados.has('SALON');
    const requeridos = formatoNuevo
      ? [
          'PERIODO',
          'DIA',
          'HORA',
          'CAP',
          'SALON',
          'GRUPO',
          'ASIGNATURA',
          'PROYECTO',
          'ID',
          'DOCENTE',
          'INSCRITOS2',
        ]
      : [
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
    _semanaPorDefecto = 1,
  ): ClaseImportacionDto {
    if (!this.valorExcel(fila, 'SALON')) {
      return this.convertirFilaExcelAnterior(fila, aulaId);
    }
    const diaTexto = this.valorExcel(fila, 'DIA');
    const periodoExcel = this.valorExcel(fila, 'PERIODO');
    const identificador = this.valorExcel(fila, 'ID');
    const capacidad = Number(this.valorExcel(fila, 'CAP'));
    const dias: Record<string, number> = {
      LUNES: 1,
      MARTES: 2,
      MIERCOLES: 3,
      JUEVES: 4,
      VIERNES: 5,
      SABADO: 6,
    };
    const diaSemana =
      dias[
        diaTexto
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toUpperCase()
      ] ?? Number(diaTexto);
    // El horario es recurrente durante todo el semestre. La columna SEMANA se
    // conserva como opcional por compatibilidad con archivos anteriores, pero
    // ya no cambia la programación ni crea una copia distinta por semana.
    const semana = 1;
    const inscritosTexto = this.valorExcel(fila, 'INSCRITOS2');
    const inscritos = inscritosTexto ? Number(inscritosTexto) : undefined;
    if (
      !periodoExcel ||
      !identificador ||
      !Number.isInteger(capacidad) ||
      capacidad < 1
    ) {
      throw new BadRequestException(
        'PERIODO, CAP e ID son obligatorios y CAP debe ser un entero positivo.',
      );
    }
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
    const [horaInicio, horaFin] = this.convertirHoraExcel(
      this.valorExcel(fila, 'HORA'),
    );
    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(horaInicio) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(horaFin)
    ) {
      throw new BadRequestException(
        'HORA debe indicar un bloque válido, por ejemplo 6AM, 8AM, 2PM o 06:00 - 08:00.',
      );
    }
    const nombreDocente =
      this.valorExcel(fila, 'DOCENTE') || 'Información no disponible';
    const documento = this.valorExcel(fila, 'DOCENTE_DOCUMENTO');
    const asignaturaTexto = this.valorExcel(fila, 'ASIGNATURA');
    const [codigoAsignatura, nombreAsignatura] = this.separarCatalogo(
      asignaturaTexto,
      'ASIG',
    );
    const grupo = this.valorExcel(fila, 'GRUPO');
    if (documento && !/^\d+$/.test(documento)) {
      throw new BadRequestException(
        'DOCENTE_DOCUMENTO debe contener solo números.',
      );
    }
    if (!codigoAsignatura || !nombreAsignatura || !grupo) {
      throw new BadRequestException(
        'La fila contiene campos académicos requeridos vacíos.',
      );
    }
    const [, proyectoCurricularNombre] = this.separarCatalogo(
      this.valorExcel(fila, 'PROYECTO'),
      'PROY',
    );
    return {
      aulaId,
      diaSemana,
      semana,
      horaInicio,
      horaFin,
      grupo,
      inscritos,
      ...(proyectoCurricularNombre && { proyectoCurricularNombre }),
      docente: {
        nombre: nombreDocente,
        ...(documento && { documento }),
        ...(this.valorExcel(fila, 'DOCENTE_CORREO') && {
          correo: this.valorExcel(fila, 'DOCENTE_CORREO'),
        }),
      },
      asignatura: { codigo: codigoAsignatura, nombre: nombreAsignatura },
    };
  }

  private convertirFilaExcelAnterior(
    fila: Record<string, unknown>,
    aulaId: string,
  ): ClaseImportacionDto {
    const diaSemana = Number(this.valorExcel(fila, 'DIA_SEMANA'));
    const semana = 1;
    const inscritosTexto = this.valorExcel(fila, 'INSCRITOS');
    const inscritos = inscritosTexto ? Number(inscritosTexto) : undefined;
    if (!Number.isInteger(diaSemana) || diaSemana < 1 || diaSemana > 6) {
      throw new BadRequestException(
        'DIA_SEMANA debe ser un entero entre 1 y 6.',
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
    const nombreDocente =
      this.valorExcel(fila, 'DOCENTE_NOMBRE') || 'Información no disponible';
    const codigoAsignatura = this.valorExcel(fila, 'ASIGNATURA_CODIGO');
    const nombreAsignatura = this.valorExcel(fila, 'ASIGNATURA_NOMBRE');
    const grupo = this.valorExcel(fila, 'GRUPO');
    if (documento && !/^\d+$/.test(documento))
      throw new BadRequestException(
        'DOCENTE_DOCUMENTO debe contener solo números.',
      );
    if (!codigoAsignatura || !nombreAsignatura || !grupo)
      throw new BadRequestException(
        'La fila contiene campos académicos requeridos vacíos.',
      );
    return {
      aulaId,
      diaSemana,
      semana,
      horaInicio,
      horaFin,
      grupo,
      inscritos,
      docente: {
        nombre: nombreDocente,
        ...(documento && { documento }),
        ...(this.valorExcel(fila, 'DOCENTE_CORREO') && {
          correo: this.valorExcel(fila, 'DOCENTE_CORREO'),
        }),
      },
      asignatura: { codigo: codigoAsignatura, nombre: nombreAsignatura },
      proyectoCurricularId:
        this.valorExcel(fila, 'PROYECTO_CURRICULAR_ID') || undefined,
    };
  }

  private extraerCodigoAula(salon: string): string {
    const limpio = salon.trim();
    return limpio.replace(/\s+CAP\s*\(.*\)$/i, '').trim();
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

  private convertirHoraExcel(valor: string): [string, string] {
    // Los archivos institucionales han usado 12M, 12MD y MEDIODIA para el
    // bloque 12:00-14:00. Se unifican antes de interpretar el rango.
    const texto = valor
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '')
      .replace(/MEDIOD[IÍ]A|12MD|12M(?=$|[-–])/g, '12PM');
    const rango = texto.match(
      /^(\d{1,2})(?::(\d{2}))?([AP]M)?[-–](\d{1,2})(?::(\d{2}))?([AP]M)?$/,
    );
    if (rango) {
      const inicio = this.normalizarHora(rango[1], rango[2] ?? '00', rango[3]);
      let meridianoFin = rango[6] ?? rango[3];
      // En un rango sin AM/PM, 12-2 representa el bloque de mediodía, no
      // 12:00-02:00. No se altera la interpretación de rangos como 10-12.
      if (!meridianoFin && !rango[3] && Number(rango[1]) >= 12 && Number(rango[4]) < Number(rango[1])) {
        meridianoFin = 'PM';
      }
      const fin = this.normalizarHora(
        rango[4],
        rango[5] ?? '00',
        meridianoFin,
      );
      return [inicio, fin];
    }
    const inicio = texto.match(/^(\d{1,2})(?::(\d{2}))?([AP]M)?$/);
    if (!inicio) return ['', ''];
    const horaInicio = this.normalizarHora(
      inicio[1],
      inicio[2] ?? '00',
      inicio[3],
    );
    const fecha = new Date(`1970-01-01T${horaInicio}:00Z`);
    fecha.setUTCHours(fecha.getUTCHours() + 2);
    return [
      horaInicio,
      `${String(fecha.getUTCHours()).padStart(2, '0')}:${String(fecha.getUTCMinutes()).padStart(2, '0')}`,
    ];
  }

  private normalizarHora(
    horaTexto: string,
    minutos: string,
    meridiano?: string,
  ): string {
    let hora = Number(horaTexto);
    if (meridiano === 'PM' && hora < 12) hora += 12;
    if (meridiano === 'AM' && hora === 12) hora = 0;
    return `${String(hora).padStart(2, '0')}:${minutos}`;
  }

  private separarCatalogo(valor: string, prefijo: string): [string, string] {
    const partes = valor.split(/\s+-\s+/, 2).map((item) => item.trim());
    if (partes.length === 2) return partes as [string, string];
    return [prefijo + '-' + valor.replace(/\W+/g, '-').toUpperCase(), valor];
  }

  private async cerrarAsistenciasVencidas(fechaTexto?: string): Promise<void> {
    if (!fechaTexto) return;
    const ahora = new Date();
    const hoy = new Date(Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()));
    const fecha = new Date(`${fechaTexto}T00:00:00.000Z`);
    if (Number.isNaN(fecha.getTime()) || fecha >= hoy) return;
    const diaSemana = fecha.getUTCDay() || 7;
    const clases = await this.prisma.claseProgramada.findMany({
      where: { diaSemana, periodo: { fechaInicio: { lte: fecha }, fechaFin: { gte: fecha } } },
      select: {
        id: true,
      },
    });

    for (const clase of clases) {
      await this.prisma.asistenciaDocente.updateMany({ where: { claseId: clase.id, fecha, estado: EstadoAsistencia.PENDIENTE }, data: { estado: EstadoAsistencia.AUSENTE, registradaEn: new Date() } });
      await this.prisma.asistenciaDocente.upsert({ where: { claseId_fecha: { claseId: clase.id, fecha } }, update: {}, create: { claseId: clase.id, fecha, estado: EstadoAsistencia.AUSENTE, registradaEn: new Date() } });
    }
  }

  private calcularSemanaSemestre(
    fechaInicio: Date,
    fechaReferencia = new Date(),
  ): number {
    const inicio = Date.UTC(
      fechaInicio.getUTCFullYear(),
      fechaInicio.getUTCMonth(),
      fechaInicio.getUTCDate(),
    );
    const referencia = Date.UTC(
      fechaReferencia.getUTCFullYear(),
      fechaReferencia.getUTCMonth(),
      fechaReferencia.getUTCDate(),
    );
    const diasTranscurridos = Math.floor(
      (referencia - inicio) / (24 * 60 * 60 * 1000),
    );
    return Math.min(26, Math.max(1, Math.floor(diasTranscurridos / 7) + 1));
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
