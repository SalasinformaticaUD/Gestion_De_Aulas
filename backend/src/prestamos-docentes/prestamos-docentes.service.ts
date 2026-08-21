import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { EstadoPrestamo } from '../../generated/prisma/enums.js';
import { DisponibilidadAulasService } from '../disponibilidad-aulas/disponibilidad-aulas.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePrestamosDocenteDto } from './dto/create-prestamos-docente.dto';
import { FindPrestamosDocentesDto } from './dto/find-prestamos-docentes.dto';
import { AuditoriaService } from '../auditoria/auditoria.service';

type BloqueDisponibilidad = {
  fecha: string;
  horaInicio: string;
  horaFin: string;
};

type DatosPrestamoDocente = {
  docenteId: string;
  aulaId: string;
  inicio: Date;
  fin: Date;
  motivo?: string;
  estado: EstadoPrestamo;
};

type PrestamoParaEstado = {
  id: string;
  aulaId: string;
  inicio: Date;
  fin: Date;
  estado: EstadoPrestamo;
};

@Injectable()
export class PrestamosDocentesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly disponibilidad: DisponibilidadAulasService,
    @Optional() private readonly auditoria?: AuditoriaService,
  ) {}

  async create(dto: CreatePrestamosDocenteDto, usuarioId?: string) {
    await this.validarDocente(dto.docenteId);
    const bloque = this.normalizarBloque(dto.inicio, dto.fin);
    await this.validarDisponibilidad(dto.aulaId, bloque);
    const data = this.construirDatosPrestamo(dto);

    const prestamo = await this.prisma.prestamoDocente.create({
      data,
      include: { docente: true, aula: true },
    });
    await this.auditoria?.registrar({
      usuarioId,
      entidad: 'PrestamoDocente',
      entidadId: prestamo.id,
      accion: 'CREATE',
      datosNuevos: prestamo,
    });
    return prestamo;
  }

  findAll(filters: FindPrestamosDocentesDto) {
    const inicioDia = filters.fecha
      ? new Date(`${filters.fecha}T00:00:00.000-05:00`)
      : undefined;
    const finDia = filters.fecha
      ? new Date(`${filters.fecha}T23:59:59.999-05:00`)
      : undefined;

    return this.prisma.prestamoDocente.findMany({
      where: {
        ...(filters.estado && { estado: filters.estado }),
        ...(filters.docenteId && { docenteId: filters.docenteId }),
        ...(filters.aulaId && { aulaId: filters.aulaId }),
        ...(inicioDia &&
          finDia && {
            inicio: { gte: inicioDia, lte: finDia },
          }),
      },
      include: { docente: true, aula: true },
      orderBy: { inicio: 'asc' },
    });
  }

  async findOne(id: string) {
    const prestamo = await this.prisma.prestamoDocente.findUnique({
      where: { id },
      include: { docente: true, aula: true },
    });
    if (!prestamo) {
      throw new NotFoundException(`No existe préstamo docente con id ${id}.`);
    }
    return prestamo;
  }

  findUpcomingForDate(fecha: string) {
    return this.prisma.prestamoDocente.findMany({
      where: {
        estado: { in: [EstadoPrestamo.APROBADO, EstadoPrestamo.ACTIVO] },
        inicio: {
          gte: new Date(`${fecha}T00:00:00.000-05:00`),
          lte: new Date(`${fecha}T23:59:59.999-05:00`),
        },
      },
      include: { docente: true, aula: true },
      orderBy: { inicio: 'asc' },
    });
  }

  async approve(id: string, usuarioId?: string) {
    const prestamo = await this.obtenerParaCambioEstado(id);
    if (prestamo.estado !== EstadoPrestamo.SOLICITADO) {
      throw new ConflictException(
        'Solo se pueden aprobar préstamos en estado SOLICITADO.',
      );
    }

    const bloque = this.normalizarBloque(
      prestamo.inicio.toISOString(),
      prestamo.fin.toISOString(),
    );
    await this.validarDisponibilidad(prestamo.aulaId, bloque);
    const conflicto = await this.prisma.prestamoDocente.findFirst({
      where: {
        id: { not: id },
        aulaId: prestamo.aulaId,
        estado: { in: [EstadoPrestamo.APROBADO, EstadoPrestamo.ACTIVO] },
        inicio: { lt: prestamo.fin },
        fin: { gt: prestamo.inicio },
      },
      select: { id: true },
    });
    if (conflicto) {
      throw new ConflictException(
        'Existe otro préstamo aprobado o activo que se cruza con el rango solicitado.',
      );
    }

    return this.actualizarEstado(
      id,
      EstadoPrestamo.APROBADO,
      'APPROVE',
      usuarioId,
      prestamo,
    );
  }

  async cancel(id: string, usuarioId?: string) {
    const prestamo = await this.obtenerParaCambioEstado(id);
    if (
      prestamo.estado !== EstadoPrestamo.SOLICITADO &&
      prestamo.estado !== EstadoPrestamo.APROBADO
    ) {
      throw new ConflictException(
        'Solo se pueden cancelar préstamos solicitados o aprobados.',
      );
    }
    return this.actualizarEstado(
      id,
      EstadoPrestamo.CANCELADO,
      'CANCEL',
      usuarioId,
      prestamo,
    );
  }

  async finish(id: string, usuarioId?: string) {
    const prestamo = await this.obtenerParaCambioEstado(id);
    if (
      prestamo.estado !== EstadoPrestamo.APROBADO &&
      prestamo.estado !== EstadoPrestamo.ACTIVO
    ) {
      throw new ConflictException(
        'Solo se pueden finalizar préstamos aprobados o activos.',
      );
    }
    return this.actualizarEstado(
      id,
      EstadoPrestamo.DEVUELTO,
      'UPDATE',
      usuarioId,
      prestamo,
    );
  }

  private async validarDocente(id: string): Promise<void> {
    const docente = await this.prisma.docente.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!docente) {
      throw new NotFoundException(`No existe docente con id ${id}.`);
    }
  }

  private async validarDisponibilidad(
    aulaId: string,
    bloque: BloqueDisponibilidad,
  ): Promise<void> {
    const resultado = await this.disponibilidad.findOne(aulaId, bloque);
    if (resultado.estadoCalculado !== 'disponible') {
      throw new ConflictException(
        `El aula no está disponible: ${resultado.motivo}`,
      );
    }
  }

  private async obtenerParaCambioEstado(
    id: string,
  ): Promise<PrestamoParaEstado> {
    const prestamo = await this.prisma.prestamoDocente.findUnique({
      where: { id },
      select: { id: true, aulaId: true, inicio: true, fin: true, estado: true },
    });
    if (!prestamo) {
      throw new NotFoundException(`No existe préstamo docente con id ${id}.`);
    }
    return prestamo;
  }

  private async actualizarEstado(
    id: string,
    estado: EstadoPrestamo,
    accion: 'APPROVE' | 'CANCEL' | 'UPDATE',
    usuarioId?: string,
    previo?: PrestamoParaEstado,
  ) {
    const prestamo = await this.prisma.prestamoDocente.update({
      where: { id },
      data: { estado },
      include: { docente: true, aula: true },
    });
    await this.auditoria?.registrar({
      usuarioId,
      entidad: 'PrestamoDocente',
      entidadId: id,
      accion,
      datosPrevios: previo,
      datosNuevos: prestamo,
    });
    return prestamo;
  }

  private construirDatosPrestamo(
    dto: CreatePrestamosDocenteDto,
  ): DatosPrestamoDocente {
    return {
      docenteId: dto.docenteId,
      aulaId: dto.aulaId,
      inicio: new Date(dto.inicio),
      fin: new Date(dto.fin),
      ...(dto.motivo !== undefined && { motivo: dto.motivo.trim() }),
      estado: EstadoPrestamo.SOLICITADO,
    };
  }

  private normalizarBloque(inicioIso: string, finIso: string) {
    const inicio = new Date(inicioIso);
    const fin = new Date(finIso);
    if (fin.getTime() - inicio.getTime() !== 2 * 60 * 60 * 1000) {
      throw new BadRequestException(
        'El préstamo docente debe reservar exactamente un bloque de dos horas.',
      );
    }

    const inicioLocal = this.partesBogota(inicio);
    const finLocal = this.partesBogota(fin);
    if (
      inicioLocal.fecha !== finLocal.fecha ||
      inicioLocal.minuto !== '00' ||
      finLocal.minuto !== '00'
    ) {
      throw new BadRequestException(
        'El préstamo debe iniciar y finalizar el mismo día en horas completas.',
      );
    }

    return {
      fecha: inicioLocal.fecha,
      horaInicio: `${inicioLocal.hora}:00`,
      horaFin: `${finLocal.hora}:00`,
    };
  }

  private partesBogota(fecha: Date) {
    const partes = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(fecha);
    const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
      partes.find((parte) => parte.type === tipo)?.value ?? '';
    return {
      fecha: `${valor('year')}-${valor('month')}-${valor('day')}`,
      hora: valor('hour'),
      minuto: valor('minute'),
    };
  }
}
