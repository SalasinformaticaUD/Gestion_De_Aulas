import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClaseProgramadaDto } from './dto/create-clase-programada.dto';
import { CreatePeriodoAcademicoDto } from './dto/create-periodo-academico.dto';
import { FindClasesDto } from './dto/find-clases.dto';
import { UpdateClaseProgramadaDto } from './dto/update-clase-programada.dto';
import { UpdatePeriodoAcademicoDto } from './dto/update-periodo-academico.dto';
import {
  ClaseImportacionDto,
  ImportarHorarioDto,
} from './dto/importar-horario.dto';

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
  constructor(private readonly prisma: PrismaService) {}

  async createPeriodo(dto: CreatePeriodoAcademicoDto) {
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
      if (!data.activo) {
        return await this.prisma.periodoAcademico.create({ data });
      }

      return await this.prisma.$transaction(async (tx) => {
        await tx.periodoAcademico.updateMany({
          where: { activo: true },
          data: { activo: false },
        });
        return tx.periodoAcademico.create({ data });
      });
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

  activarPeriodo(id: string) {
    return this.prisma.$transaction(async (tx) => {
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
  }

  async updatePeriodo(id: string, dto: UpdatePeriodoAcademicoDto) {
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
      if (dto.activo !== true) {
        return await this.prisma.periodoAcademico.update({
          where: { id },
          data,
        });
      }

      return await this.prisma.$transaction(async (tx) => {
        await tx.periodoAcademico.updateMany({
          where: { activo: true, id: { not: id } },
          data: { activo: false },
        });
        return tx.periodoAcademico.update({ where: { id }, data });
      });
    } catch (error: unknown) {
      this.throwKnownPeriodoPersistenceError(error);
      throw error;
    }
  }

  async removePeriodo(id: string) {
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
      return await this.prisma.periodoAcademico.delete({ where: { id } });
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

  async createClase(dto: CreateClaseProgramadaDto) {
    const clase = this.normalizeClase(dto);
    this.validateTimeRange(clase.horaInicio, clase.horaFin);
    await this.validateReferences(clase);
    await this.ensureNoOverlap(clase);

    try {
      return await this.prisma.claseProgramada.create({
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

  async updateClase(id: string, dto: UpdateClaseProgramadaDto) {
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
      return await this.prisma.claseProgramada.update({
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
    } catch (error: unknown) {
      this.throwKnownClassPersistenceError(error);
      throw error;
    }
  }

  async removeClase(id: string) {
    const clase = await this.prisma.claseProgramada.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!clase) {
      throw new NotFoundException(`No existe clase programada con id ${id}.`);
    }

    try {
      return await this.prisma.claseProgramada.delete({ where: { id } });
    } catch (error: unknown) {
      if (hasPrismaCode(error, 'P2003')) {
        throw new ConflictException(
          'La clase tiene asistencias asociadas y no se puede eliminar.',
        );
      }
      throw error;
    }
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
