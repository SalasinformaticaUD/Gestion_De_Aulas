import {
  ConflictException,
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
import { CreateAulaDto } from './dto/create-aula.dto';
import { UpdateAulaDto } from './dto/update-aula.dto';
import { FindAulasDto } from './dto/find-aulas.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Aula, HistorialAula } from './entities/aula.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';

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
  anioAdquisicion: true,
  marca: true,
  modelo: true,
  renovacionTecnologica: true,
  pendienteIntervencion: true,
  caracteristicas: true,
  estado: true,
  proyectoCurricular: { select: { id: true, nombre: true } },
  proyectosCurriculares: {
    select: { proyectoCurricular: { select: { id: true, nombre: true } } },
  },
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
    select: {
      id: true,
      realizadaEn: true,
      observacion: true,
      responsable: { select: { nombreCompleto: true } },
    },
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
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly auditoria?: AuditoriaService,
  ) {}

  async create(createAulaDto: CreateAulaDto, usuarioId?: string) {
    if (createAulaDto.proyecto) {
      const proyecto = await this.prisma.proyectoCurricular.upsert({
        where: { nombre: createAulaDto.proyecto },
        create: { nombre: createAulaDto.proyecto },
        update: {},
        select: { id: true },
      });
      createAulaDto.proyectoCurricularId = proyecto.id;
    }
    await this.ensureProyectosCurricularesExist(
      this.obtenerProyectosCurricularesIds(createAulaDto),
    );

    try {
      const aula = await this.prisma.aula.create({
        data: this.normalizeCreateInput(createAulaDto),
      });
      if (createAulaDto.software)
        await this.syncSoftware(aula.id, createAulaDto.software);
      await this.auditoria?.registrar({
        usuarioId,
        entidad: 'Aula',
        entidadId: aula.id,
        accion: 'CREATE',
        datosNuevos: aula,
      });
      return this.findOne(aula.id);
    } catch (error: unknown) {
      this.throwKnownPersistenceError(error);
      throw error;
    }
  }

  async findAll(filters: FindAulasDto = {}): Promise<Aula[]> {
    const where: Prisma.AulaWhereInput = {
      eliminadoEn: null,
      ...(filters.estado && { estado: filters.estado }),
      ...(filters.ubicacion && {
        ubicacion: { contains: filters.ubicacion, mode: 'insensitive' },
      }),
      ...(filters.proyectoCurricularId && {
        OR: [
          { proyectoCurricularId: filters.proyectoCurricularId },
          {
            proyectosCurriculares: {
              some: { proyectoCurricularId: filters.proyectoCurricularId },
            },
          },
        ],
      }),
      ...(filters.codigo && {
        codigo: { contains: filters.codigo, mode: 'insensitive' },
      }),
      ...((filters.capacidadMin !== undefined ||
        filters.capacidadMax !== undefined) && {
        capacidad: {
          ...(filters.capacidadMin !== undefined && {
            gte: filters.capacidadMin,
          }),
          ...(filters.capacidadMax !== undefined && {
            lte: filters.capacidadMax,
          }),
        },
      }),
      ...(filters.pendienteIntervencion !== undefined && {
        pendienteIntervencion: filters.pendienteIntervencion,
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
    const aula = await this.prisma.aula.findFirst({
      where: { id, eliminadoEn: null },
      select: aulaPublicaSelect,
    });

    if (!aula) {
      throw new NotFoundException(`No existe aula con id ${id}.`);
    }

    return this.toPublicResponse(aula);
  }

  async update(id: string, updateAulaDto: UpdateAulaDto, usuarioId?: string) {
    const previa = await this.prisma.aula.findUnique({ where: { id } });
    if (!previa) {
      throw new NotFoundException(`No existe aula con id ${id}.`);
    }

    await this.ensureProyectosCurricularesExist(
      this.obtenerProyectosCurricularesIds(updateAulaDto),
    );
    if (updateAulaDto.proyecto) {
      const proyecto = await this.prisma.proyectoCurricular.upsert({
        where: { nombre: updateAulaDto.proyecto },
        create: { nombre: updateAulaDto.proyecto },
        update: {},
        select: { id: true },
      });
      updateAulaDto.proyectoCurricularId = proyecto.id;
    }

    try {
      const aula = await this.prisma.aula.update({
        where: { id },
        data: this.normalizeUpdateInput(updateAulaDto),
      });
      if (updateAulaDto.software !== undefined)
        await this.syncSoftware(id, updateAulaDto.software);
      await this.auditoria?.registrar({
        usuarioId,
        entidad: 'Aula',
        entidadId: id,
        accion: 'UPDATE',
        datosPrevios: previa,
        datosNuevos: aula,
      });
      return this.findOne(aula.id);
    } catch (error: unknown) {
      this.throwKnownPersistenceError(error);
      throw error;
    }
  }

  async remove(id: string, usuarioId?: string) {
    const aula = await this.prisma.aula.findUnique({
      where: { id },
      select: { id: true, codigo: true, eliminadoEn: true },
    });

    if (!aula) {
      throw new NotFoundException(`No existe aula con id ${id}.`);
    }
    if (aula.eliminadoEn) {
      throw new NotFoundException(`No existe aula con id ${id}.`);
    }

    const eliminada = await this.prisma.aula.update({
      where: { id },
      data: { eliminadoEn: new Date() },
    });
    await this.auditoria?.registrar({
      usuarioId,
      entidad: 'Aula',
      entidadId: id,
      accion: 'DELETE',
      datosPrevios: eliminada,
    });
    return eliminada;
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

  private async ensureProyectosCurricularesExist(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const encontrados = await this.prisma.proyectoCurricular.count({
      where: { id: { in: ids } },
    });
    if (encontrados !== ids.length) {
      throw new NotFoundException(
        'Uno de los proyectos curriculares no existe.',
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

  private normalizeCreateInput(input: CreateAulaDto): Prisma.AulaCreateInput {
    const caracteristicas = input.caracteristicas
      ? { ...input.caracteristicas }
      : {};
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    if (input.hardware) caracteristicas.hardware = input.hardware.trim();
    if (input.caracteristica) caracteristicas.descripcion = input.caracteristica.trim();
    return {
      codigo: input.codigo.trim(),
      ubicacion: input.ubicacion.trim(),
      capacidad: input.capacidad,
      ...(input.anioAdquisicion !== undefined && {
        anioAdquisicion: input.anioAdquisicion,
      }),
      ...(input.marca !== undefined && { marca: input.marca.trim() }),
      ...(input.modelo !== undefined && { modelo: input.modelo.trim() }),
      ...(input.modeloPc !== undefined && { modelo: input.modeloPc.trim() }),
      ...(input.renovacionTecnologica !== undefined && {
        renovacionTecnologica: input.renovacionTecnologica,
      }),
      ...(input.pendienteIntervencion !== undefined && {
        pendienteIntervencion: input.pendienteIntervencion,
      }),
      ...(Object.keys(caracteristicas).length > 0 && {
        caracteristicas: caracteristicas as Prisma.InputJsonValue,
      }),
      ...(input.estado !== undefined && { estado: input.estado }),
      ...(input.proyectoCurricularId !== undefined && {
        proyectoCurricular: { connect: { id: input.proyectoCurricularId } },
      }),
      ...(input.proyectosCurricularesIds !== undefined && {
        proyectosCurriculares: {
          create: input.proyectosCurricularesIds.map(
            (proyectoCurricularId) => ({ proyectoCurricularId }),
          ),
        },
      }),
    };
  }

  private normalizeUpdateInput(input: UpdateAulaDto): Prisma.AulaUpdateInput {
    const caracteristicas = input.caracteristicas
      ? { ...input.caracteristicas }
      : undefined;
    if (caracteristicas && input.hardware)
      caracteristicas.hardware = input.hardware.trim();
    if (caracteristicas && input.caracteristica)
      caracteristicas.descripcion = input.caracteristica.trim();
    else if (input.hardware)
      return {
        ...this.normalizeUpdateInput({ ...input, hardware: undefined }),
        caracteristicas: {
          hardware: input.hardware.trim(),
          ...(input.caracteristica && {
            descripcion: input.caracteristica.trim(),
          }),
        },
      };
    else if (input.caracteristica)
      return {
        ...this.normalizeUpdateInput({ ...input, caracteristica: undefined }),
        caracteristicas: { descripcion: input.caracteristica.trim() },
      };
    return {
      ...(input.codigo !== undefined && { codigo: input.codigo.trim() }),
      ...(input.ubicacion !== undefined && {
        ubicacion: input.ubicacion.trim(),
      }),
      ...(input.capacidad !== undefined && { capacidad: input.capacidad }),
      ...(input.anioAdquisicion !== undefined && {
        anioAdquisicion: input.anioAdquisicion,
      }),
      ...(input.marca !== undefined && { marca: input.marca.trim() }),
      ...(input.modelo !== undefined && { modelo: input.modelo.trim() }),
      ...(input.modeloPc !== undefined && { modelo: input.modeloPc.trim() }),
      ...(input.renovacionTecnologica !== undefined && {
        renovacionTecnologica: input.renovacionTecnologica,
      }),
      ...(input.pendienteIntervencion !== undefined && {
        pendienteIntervencion: input.pendienteIntervencion,
      }),
      ...(input.caracteristicas !== undefined && {
        caracteristicas: input.caracteristicas as Prisma.InputJsonValue,
      }),
      ...(input.estado !== undefined && { estado: input.estado }),
      ...(input.proyectoCurricularId !== undefined && {
        proyectoCurricular: { connect: { id: input.proyectoCurricularId } },
      }),
      ...(input.proyectosCurricularesIds !== undefined && {
        proyectosCurriculares: {
          deleteMany: {},
          create: input.proyectosCurricularesIds.map(
            (proyectoCurricularId) => ({ proyectoCurricularId }),
          ),
        },
      }),
    };
  }

  async importarExcel(
    archivo: { buffer: Buffer; originalname: string } | undefined,
    usuarioId?: string,
  ) {
    if (
      !archivo?.buffer?.length ||
      !/\.(xlsx|xls)$/i.test(archivo.originalname)
    )
      throw new BadRequestException(
        'Debe adjuntar un archivo Excel .xlsx o .xls.',
      );
    let filas: Array<Record<string, unknown>>;
    try {
      const libro = XLSX.read(archivo.buffer, { type: 'buffer' });
      const hoja = libro.Sheets[libro.SheetNames[0]];
      filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, {
        defval: '',
      });
    } catch {
      throw new BadRequestException('No fue posible leer el archivo Excel.');
    }
    if (!filas.length || filas.length > 500)
      throw new BadRequestException(
        'El Excel debe contener entre 1 y 500 aulas.',
      );
    const normalizarEncabezado = (valor: string) =>
      valor
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toUpperCase();
    const valor = (fila: Record<string, unknown>, ...nombres: string[]) => {
      const claves = nombres.map(normalizarEncabezado);
      const clave = Object.keys(fila).find((item) =>
        claves.includes(normalizarEncabezado(item)),
      );
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      return String(clave ? (fila[clave] ?? '') : '').trim();
    };
    const requeridas = [
      'AULA DE SOFTWARE',
      'CAPACIDAD',
      'PROYECTO',
      'ANO',
      'MARCA Y MODELO',
      'CARACTERISTICA',
      'NECESITA RENOVACION',
    ];
    const encabezados = new Set(
      Object.keys(filas[0]).map(normalizarEncabezado),
    );
    const faltantes = requeridas.filter((item) => !encabezados.has(item));
    if (faltantes.length)
      throw new BadRequestException(
        `Faltan columnas requeridas: ${faltantes.join(', ')}.`,
      );
    const codigos = new Set<string>();
    const entradas = filas.map((fila, indice) => {
      const codigo = valor(fila, 'AULA DE SOFTWARE', 'CODIGO');
      const proyecto = valor(fila, 'PROYECTO');
      const anio = Number(valor(fila, 'AÑO', 'ANO'));
      const marcaModelo = valor(fila, 'MARCA Y MODELO');
      const caracteristica = valor(fila, 'CARACTERISTICA', 'CARACTERISTICAS');
      const renovacionTexto = valor(
        fila,
        'NECESITA RENOVACIÓN',
        'NECESITA RENOVACION',
      ).toUpperCase();
      const capacidad = Number(valor(fila, 'CAPACIDAD'));
      const necesitaRenovacion = ['SI', 'SÍ', 'TRUE', '1', 'YES'].includes(
        renovacionTexto,
      );
      if (
        !codigo ||
        !proyecto ||
        !marcaModelo ||
        !caracteristica ||
        !renovacionTexto ||
        !Number.isInteger(anio) ||
        anio < 1900 ||
        !Number.isInteger(capacidad) ||
        capacidad < 1
      )
        throw new BadRequestException(
          `Fila ${indice + 2}: aula, capacidad, proyecto, año, marca y modelo, característica y renovación son obligatorios y válidos.`,
        );
      if (codigos.has(codigo.toUpperCase()))
        throw new ConflictException(
          `Fila ${indice + 2}: código de aula duplicado en el archivo.`,
        );
      codigos.add(codigo.toUpperCase());
      return {
        codigo,
        capacidad,
        proyecto,
        anio,
        marcaModelo,
        caracteristica,
        necesitaRenovacion,
      };
    });
    const existentes = await this.prisma.aula.findMany({
      select: {
        id: true,
        codigo: true,
        caracteristicas: true,
        _count: {
          select: {
            clases: true,
            practicasLibres: true,
            prestamosDocentes: true,
            prestamosAudiovisuales: true,
            observaciones: true,
            tareas: true,
            limpiezas: true,
          },
        },
      },
    });
    const existentesPorCodigo = new Map(
      existentes.map((item) => [item.codigo.toUpperCase(), item]),
    );
    const resultado = await this.prisma.$transaction(async (tx) => {
      const creadas: Array<{ id: string }> = [];
      const actualizadas: Array<{ id: string }> = [];
      for (const entrada of entradas) {
        const proyecto = await tx.proyectoCurricular.upsert({
          where: { nombre: entrada.proyecto },
          create: { nombre: entrada.proyecto },
          update: {},
          select: { id: true },
        });
        const existente = existentesPorCodigo.get(entrada.codigo.toUpperCase());
        const caracteristicasActuales = existente?.caracteristicas;
        const caracteristicas = {
          ...(typeof caracteristicasActuales === 'object' &&
          caracteristicasActuales !== null &&
          !Array.isArray(caracteristicasActuales)
            ? caracteristicasActuales
            : {}),
          descripcion: entrada.caracteristica,
        };
        if (existente) {
          const aula = await tx.aula.update({
            where: { id: existente.id },
            data: {
              codigo: entrada.codigo,
              capacidad: entrada.capacidad,
              anioAdquisicion: entrada.anio,
              marca: entrada.marcaModelo,
              renovacionTecnologica: entrada.necesitaRenovacion,
              proyectoCurricular: { connect: { id: proyecto.id } },
              caracteristicas: caracteristicas,
            },
          });
          actualizadas.push(aula);
        } else {
          const aula = await tx.aula.create({
            data: this.normalizeCreateInput({
              codigo: entrada.codigo,
              ubicacion: 'Sin ubicación registrada',
              capacidad: entrada.capacidad,
              estado: undefined,
              anioAdquisicion: entrada.anio,
              marca: entrada.marcaModelo,
              proyectoCurricularId: proyecto.id,
              renovacionTecnologica: entrada.necesitaRenovacion,
              caracteristicas: { descripcion: entrada.caracteristica },
            }),
          });
          creadas.push(aula);
        }
      }
      const codigosCargados = new Set(
        entradas.map((entrada) => entrada.codigo.toUpperCase()),
      );
      const ausentes = existentes.filter(
        (aula) => !codigosCargados.has(aula.codigo.toUpperCase()),
      );
      const relacionados = ausentes.filter((aula) =>
        Object.values(aula._count).some((cantidad) => cantidad > 0),
      );
      if (relacionados.length) {
        throw new ConflictException(
          `No se pueden reemplazar las aulas ausentes porque tienen información relacionada: ${relacionados.map((aula) => aula.codigo).join(', ')}.`,
        );
      }
      const eliminadas = ausentes.length
        ? await tx.aula.deleteMany({
            where: { id: { in: ausentes.map((aula) => aula.id) } },
          })
        : { count: 0 };
      return { creadas, actualizadas, eliminadas: eliminadas.count };
    });
    return {
      nombreArchivo: archivo.originalname,
      totalRecibidas: filas.length,
      totalCreadas: resultado.creadas.length,
      totalActualizadas: resultado.actualizadas.length,
      totalEliminadas: resultado.eliminadas,
      creadas: await Promise.all(
        [...resultado.creadas, ...resultado.actualizadas].map((item) =>
          this.findOne(item.id),
        ),
      ),
    };
  }

  private async syncSoftware(aulaId: string, listado: string): Promise<void> {
    return this.syncSoftwareWith(this.prisma, aulaId, listado);
  }

  private async syncSoftwareWith(
    database: Pick<PrismaService, 'aulaSoftware' | 'software'>,
    aulaId: string,
    listado: string,
  ): Promise<void> {
    const nombres = [
      ...new Set(
        listado
          .split(/[,;\n]/)
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ];
    await database.aulaSoftware.deleteMany({ where: { aulaId } });
    for (const nombre of nombres) {
      const software = await database.software.upsert({
        where: { nombre_version: { nombre, version: 'Importado' } },
        update: {},
        create: { nombre, version: 'Importado' },
      });
      await database.aulaSoftware.create({
        data: { aulaId, softwareId: software.id },
      });
    }
  }

  private obtenerProyectosCurricularesIds(
    input: Pick<
      CreateAulaDto,
      'proyectoCurricularId' | 'proyectosCurricularesIds'
    >,
  ): string[] {
    return Array.from(
      new Set(
        [
          input.proyectoCurricularId,
          ...(input.proyectosCurricularesIds ?? []),
        ].filter((id): id is string => id !== undefined),
      ),
    );
  }

  private toPublicResponse(aula: AulaPublicaSource): Aula {
    return {
      id: aula.id,
      codigo: aula.codigo,
      ubicacion: aula.ubicacion,
      capacidad: aula.capacidad,
      estado: aula.estado,
      anioAdquisicion: aula.anioAdquisicion,
      marca: aula.marca,
      modelo: aula.modelo,
      renovacionTecnologica: aula.renovacionTecnologica,
      pendienteIntervencion: aula.pendienteIntervencion,
      caracteristicas: aula.caracteristicas,
      proyectoCurricular: aula.proyectoCurricular,
      proyectosCurriculares: (aula.proyectosCurriculares ?? []).map(
        ({ proyectoCurricular }) => proyectoCurricular,
      ),
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        responsable: limpieza.responsable?.nombreCompleto ?? null,
      })),
      ...aula.practicasLibres.map((practica) => ({
        id: `practica:${practica.id}`,
        fecha: practica.inicio,
        tipo: 'PRACTICA_LIBRE' as const,
        descripcion: `Práctica libre (${practica.estado}).`,
        responsable: practica.estudiante ? `${practica.estudiante.nombre} (${practica.estudiante.codigo})` : 'Docente responsable',
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

}
