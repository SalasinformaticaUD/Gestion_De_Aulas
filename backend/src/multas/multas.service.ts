import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import * as XLSX from 'xlsx';
import { EstadoMulta, EstadoPrestamo, Prisma } from '@prisma/client';
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

const motivosPredeterminados = [
  'Entrego el aula tarde',
  'Ingresos sin autorizacion',
  'Uso indebido del aula',
  'No entrego el aula',
  'Otro (Observaciones)',
] as const;

@Injectable()
export class MultasService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly auditoria?: AuditoriaService,
  ) {}

  async create(dto: CreateMultaDto, usuarioId?: string) {
    const estudiante = await this.resolveEstudiante(dto);
    await this.validarPracticaParaMulta(estudiante.id, dto.practicaId);
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

  async buscarEstudianteConPracticaActiva(codigo: string) {
    const estudiante = await this.prisma.estudiante.findFirst({
      where: { codigo: { equals: codigo.trim(), mode: 'insensitive' } },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        practicas: {
          where: { estado: { in: [EstadoPrestamo.ACTIVO, EstadoPrestamo.VENCIDO] } },
          orderBy: { inicio: 'desc' },
          take: 1,
          select: { id: true, estado: true, aula: { select: { codigo: true } } },
        },
      },
    });
    if (!estudiante) return null;
    const practica = estudiante.practicas[0];
    return {
      id: estudiante.id,
      codigo: estudiante.codigo,
      nombre: estudiante.nombre,
      tienePracticaActiva: Boolean(practica),
      practicaActiva: practica
        ? { id: practica.id, estado: practica.estado, aula: practica.aula.codigo }
        : null,
    };
  }

  async buscarMasivo(archivo: { buffer: Buffer; originalname: string } | undefined) {
    if (!archivo?.buffer?.length || !/\.(xlsx|xls)$/i.test(archivo.originalname)) {
      throw new BadRequestException('Debe adjuntar un archivo Excel .xlsx o .xls.');
    }
    let filas: Array<Record<string, unknown>>;
    try {
      const libro = XLSX.read(archivo.buffer, { type: 'buffer' });
      const hoja = libro.Sheets[libro.SheetNames[0]];
      filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, { defval: '', blankrows: true });
    } catch {
      throw new BadRequestException('No fue posible leer el archivo Excel.');
    }
    const normalizar = (valor: string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
    const valor = (fila: Record<string, unknown>, encabezado: string) => {
      const clave = Object.keys(fila).find((item) => normalizar(item) === normalizar(encabezado));
      return String(clave ? fila[clave] ?? '' : '').trim();
    };
    const filasConDatos = filas.filter((fila) => Object.values(fila).some((celda) => String(celda).trim() !== ''));
    if (!filasConDatos.length) throw new BadRequestException('El Excel debe contener al menos una persona.');
    const encabezados = Object.keys(filasConDatos[0]).map(normalizar);
    const faltantes = ['CODIGO', 'NOMBRE'].filter((item) => !encabezados.includes(item));
    if (faltantes.length) throw new BadRequestException(`Faltan columnas requeridas: ${faltantes.join(', ')}.`);
    const codigos = new Set<string>();
    let duplicados = 0;
    const datos = filasConDatos.flatMap((fila, indice) => {
      const codigo = valor(fila, 'CODIGO');
      const nombre = valor(fila, 'NOMBRE');
      if (!/^\d{3,50}$/.test(codigo)) throw new BadRequestException(`Fila ${indice + 2}: el código debe contener solo números.`);
      if (!nombre) throw new BadRequestException(`Fila ${indice + 2}: el nombre es obligatorio.`);
      if (codigos.has(codigo)) { duplicados++; return []; }
      codigos.add(codigo);
      return [{ codigo, nombre }];
    });
    const estudiantes = await this.prisma.estudiante.findMany({
      where: { codigo: { in: datos.map((dato) => dato.codigo) } },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        multas: { orderBy: { fecha: 'desc' }, select: { id: true, fecha: true, estado: true, descripcion: true, motivo: { select: { nombre: true } } } },
      },
    });
    const porCodigo = new Map(estudiantes.map((estudiante) => [estudiante.codigo, estudiante]));
    const resultados = datos.map((dato) => {
      const estudiante = porCodigo.get(dato.codigo);
      if (!estudiante) return { codigo: dato.codigo, nombre: dato.nombre, estado: 'NO_ENCONTRADO', multas: [] };
      return { codigo: dato.codigo, nombre: dato.nombre, nombreRegistrado: estudiante.nombre, nombreCoincide: normalizar(dato.nombre) === normalizar(estudiante.nombre), estado: estudiante.multas.length ? 'CON_MULTA' : 'SIN_MULTA', multas: estudiante.multas };
    });
    return { totalFilas: filasConDatos.length, procesadas: datos.length, duplicadas: duplicados, conMulta: resultados.filter((resultado) => resultado.estado === 'CON_MULTA').length, sinMulta: resultados.filter((resultado) => resultado.estado === 'SIN_MULTA').length, noEncontradas: resultados.filter((resultado) => resultado.estado === 'NO_ENCONTRADO').length, resultados };
  }

  async cargarExcel(
    archivo: { buffer: Buffer; originalname: string } | undefined,
    usuarioId?: string,
  ) {
    if (!archivo?.buffer?.length || !/\.(xlsx|xls)$/i.test(archivo.originalname))
      throw new BadRequestException('Debe adjuntar un archivo Excel .xlsx o .xls.');
    let filas: Array<Record<string, unknown>>;
    try {
      const libro = XLSX.read(archivo.buffer, { type: 'buffer', cellDates: true });
      const hoja = libro.Sheets[libro.SheetNames[0]];
      filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, { defval: '', raw: false });
    } catch {
      throw new BadRequestException('No fue posible leer el archivo Excel.');
    }
    const normalizar = (valor: string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
    const valor = (fila: Record<string, unknown>, encabezado: string) => {
      const clave = Object.keys(fila).find((item) => normalizar(item) === normalizar(encabezado));
      return String(clave ? fila[clave] ?? '' : '').trim();
    };
    const conDatos = filas.filter((fila) => Object.values(fila).some((celda) => String(celda).trim()));
    if (!conDatos.length) throw new BadRequestException('El Excel no contiene multas para cargar.');
    if (conDatos.length > 5_000) throw new BadRequestException('El Excel supera el máximo de 5.000 filas.');
    const encabezados = Object.keys(conDatos[0]).map(normalizar);
    const requeridos = ['MULTA', 'ESTUDIANTE', 'MOTIVO', 'FECHA', 'DESCRIPCION', 'ESTADO'];
    const faltantes = requeridos.filter((encabezado) => !encabezados.includes(encabezado));
    if (faltantes.length) throw new BadRequestException(`Faltan columnas requeridas: ${faltantes.join(', ')}.`);

    const errores: Array<{ fila: number; motivo: string }> = [];
    let creadas = 0;
    let actualizadas = 0;
    for (const [indice, fila] of conDatos.entries()) {
      try {
        const estudianteTexto = valor(fila, 'ESTUDIANTE');
        const codigo = estudianteTexto.match(/^\s*(\d{3,50})(?:\s*-|\s|$)/)?.[1];
        const motivoNombre = valor(fila, 'MOTIVO');
        const fechaTexto = valor(fila, 'FECHA');
        const descripcion = valor(fila, 'DESCRIPCION');
        const estadoTexto = normalizar(valor(fila, 'ESTADO'));
        if (!codigo) throw new BadRequestException('Estudiante debe iniciar con su código numérico, por ejemplo: 20261001 - NOMBRE.');
        if (!motivoNombre) throw new BadRequestException('Motivo es obligatorio.');
        const fecha = new Date(fechaTexto);
        if (Number.isNaN(fecha.getTime())) throw new BadRequestException('Fecha no es válida.');
        const estado = ({ ACTIVA: EstadoMulta.ACTIVA, CUMPLIDA: EstadoMulta.CUMPLIDA, ANULADA: EstadoMulta.ANULADA } as const)[estadoTexto];
        if (!estado) throw new BadRequestException('Estado debe ser ACTIVA, CUMPLIDA o ANULADA.');
        const estudiante = await this.prisma.estudiante.findUnique({ where: { codigo }, select: { id: true } });
        if (!estudiante) throw new NotFoundException(`No existe un estudiante con código ${codigo}.`);
        const motivo = await this.prisma.motivoMulta.upsert({ where: { nombre: motivoNombre }, create: { nombre: motivoNombre }, update: {}, select: { id: true } });
        const existente = await this.prisma.multa.findFirst({ where: { estudianteId: estudiante.id, motivoId: motivo.id, fecha, descripcion: descripcion || null }, select: { id: true, estado: true } });
        if (existente) {
          if (existente.estado !== estado) {
            await this.prisma.multa.update({ where: { id: existente.id }, data: { estado } });
            actualizadas += 1;
          }
          continue;
        }
        const creada = await this.prisma.multa.create({ data: { estudianteId: estudiante.id, motivoId: motivo.id, fecha, descripcion: descripcion || null, estado, ...(usuarioId && { impuestaPorId: usuarioId }) } });
        await this.registrar(usuarioId, creada.id, 'CREATE', undefined, creada);
        creadas += 1;
      } catch (error: unknown) {
        errores.push({ fila: indice + 2, motivo: this.mensajeError(error) });
      }
    }
    return { procesadas: conDatos.length, creadas, actualizadas, errores };
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

  async findAllMotivos() {
    await this.prisma.motivoMulta.createMany({
      data: motivosPredeterminados.map((nombre) => ({ nombre })),
      skipDuplicates: true,
    });
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

  private async validarPracticaParaMulta(
    estudianteId: string,
    practicaId?: string,
  ) {
    const practica = await this.prisma.practicaLibre.findFirst({
      where: {
        estudianteId,
        ...(practicaId
          ? {
              id: practicaId,
              estado: {
                in: [
                  EstadoPrestamo.ACTIVO,
                  EstadoPrestamo.VENCIDO,
                  EstadoPrestamo.DEVUELTO,
                ],
              },
            }
          : { estado: { in: [EstadoPrestamo.ACTIVO, EstadoPrestamo.VENCIDO] } }),
      },
      select: { id: true },
    });
    if (!practica) {
      throw new ConflictException(
        'El estudiante no tiene una práctica libre activa para registrar esta multa.',
      );
    }
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

  private mensajeError(error: unknown): string {
    return error instanceof Error ? error.message : 'Error desconocido al procesar la fila.';
  }
}
