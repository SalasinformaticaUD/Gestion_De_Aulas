import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { EstadoSoftware, type Prisma } from '@prisma/client';
import { EstadoAsistencia, EstadoMulta, EstadoPrestamo } from '../../generated/prisma/enums.js';
import { DisponibilidadAulasService } from '../disponibilidad-aulas/disponibilidad-aulas.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePracticasLibreDto } from './dto/create-practicas-libre.dto';
import { FinalizarPracticaLibreDto } from './dto/finalizar-practica-libre.dto';
import { FindPracticasLibresDto } from './dto/find-practicas-libres.dto';
import { ResponsablePracticaLibre } from './dto/create-practicas-libre.dto';
import { PracticasLibresEmailService } from './practicas-libres-email.service';
import { randomUUID } from 'crypto';

type BloqueDisponibilidad = {
  fecha: string;
  horaInicio: string;
  horaFin: string;
  softwareId?: string;
};

type PartesFechaBogota = {
  fecha: string;
  hora: string;
  minuto: string;
};

type DatosPracticaLibre = {
  estudianteId?: string;
  docenteId?: string;
  grupoId?: string;
  aulaId: string;
  responsableTipo: ResponsablePracticaLibre;
  softwareSolicitado: string;
  inicio: Date;
  finEstimada: Date;
  estado: EstadoPrestamo;
};

@Injectable()
export class PracticasLibresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly disponibilidad: DisponibilidadAulasService,
    @Optional() private readonly email?: PracticasLibresEmailService,
  ) {}

  async create(dto: CreatePracticasLibreDto) {
    const bloque = this.normalizarBloque(dto.inicio, dto.finEstimada);
    this.validarTiempoMinimoParaPrestamo(dto.inicio, dto.finEstimada);
    const software = dto.softwareId
      ? await this.prisma.software.findUnique({
          where: { id: dto.softwareId },
          select: { id: true, nombre: true, estado: true },
        })
      : null;
    if (dto.softwareId && !software) {
      throw new NotFoundException('El software solicitado no existe.');
    }
    if (software) {
      this.validarSoftwareParaPrestamo(software);
      const asociacion = await this.prisma.aulaSoftware.findUnique({
        where: {
          aulaId_softwareId: { aulaId: dto.aulaId, softwareId: dto.softwareId! },
        },
        select: { aulaId: true },
      });
      if (!asociacion) {
        throw new ConflictException(
          'El aula seleccionada no cuenta con el software solicitado.',
        );
      }
    }
    const estadoAula = await this.disponibilidad.findOne(dto.aulaId, bloque);
    const claseEnCurso = estadoAula.fuentes.some(
      (fuente) =>
        fuente.tipo === 'clase-programada' && fuente.estado !== EstadoAsistencia.AUSENTE,
    );
    if (estadoAula.estadoCalculado !== 'disponible' || claseEnCurso) {
      throw new ConflictException(
        claseEnCurso
          ? 'El aula tiene una clase con asistencia registrada o pendiente durante el bloque.'
          : `El aula no está disponible: ${estadoAula.motivo}`,
      );
    }

    const responsables = dto.responsables ?? [
      {
        tipo: 'ESTUDIANTE' as const,
        documento: dto.codigoEstudiante,
        nombre: dto.nombreEstudiante,
        correo: dto.correoEstudiante,
      },
    ];
    const responsablesUnicos = new Set<string>();
    for (const responsable of responsables) {
      const clave = responsable.tipo + ':' + responsable.documento;
      if (responsablesUnicos.has(clave)) {
        throw new BadRequestException(
          'No se puede agregar la misma persona más de una vez a la práctica libre.',
        );
      }
      responsablesUnicos.add(clave);
    }
    const grupoId = responsables.length > 1 ? randomUUID() : undefined;
    const practicas = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const creadas: Prisma.PracticaLibreGetPayload<{
        include: { estudiante: true; docente: true; aula: true };
      }>[] = [];
      for (const responsable of responsables) {
        if (responsable.tipo === 'DOCENTE') {
          const docente = await tx.docente.upsert({
            where: { documento: responsable.documento },
            update: {
              nombre: responsable.nombre,
              ...(responsable.correo && { correo: responsable.correo }),
            },
            create: {
              documento: responsable.documento,
              nombre: responsable.nombre,
              correo: responsable.correo,
            },
          });
          creadas.push(await tx.practicaLibre.create({
            data: {
              ...this.construirDatosPractica(dto, undefined, software?.nombre ?? dto.softwareSolicitado),
              docenteId: docente.id,
              grupoId,
            },
            include: { estudiante: true, docente: true, aula: true },
          }));
          continue;
        }
        const estudiante = await tx.estudiante.upsert({
          where: { codigo: responsable.documento },
          update: {
            nombre: responsable.nombre,
            ...(responsable.correo && { correo: responsable.correo }),
          },
          create: {
            codigo: responsable.documento,
            nombre: responsable.nombre,
            correo: responsable.correo,
          },
        });
        const multa = await tx.multa.findFirst({
          where: {
            estudianteId: estudiante.id,
            estado: EstadoMulta.ACTIVA,
          },
          select: { id: true },
        });
        if (multa) {
          throw new ConflictException(
            'El estudiante tiene una multa activa y no puede registrar prácticas libres.',
          );
        }
        creadas.push(await tx.practicaLibre.create({
          data: {
            ...this.construirDatosPractica(dto, estudiante.id, software?.nombre ?? dto.softwareSolicitado),
            grupoId,
          },
          include: { estudiante: true, docente: true, aula: true },
        }));
      }
      return creadas;
    });
    await Promise.all(
      practicas.map((practica) =>
        this.email?.enviarConfirmacion({
          correo: practica.estudiante?.correo ?? practica.docente?.correo ?? null,
          estudiante: practica.estudiante?.nombre ?? practica.docente?.nombre ?? 'Responsable',
          aula: practica.aula.codigo,
          software: practica.softwareSolicitado ?? 'Ninguno',
          inicio: practica.inicio,
          fin: practica.finEstimada ?? practica.inicio,
        }),
      ),
    );
    return practicas;
  }

  async findAll(filters: FindPracticasLibresDto) {
    await this.marcarPracticasVencidas();
    const inicioDia = filters.fecha
      ? new Date(`${filters.fecha}T00:00:00.000-05:00`)
      : undefined;
    const finDia = filters.fecha
      ? new Date(`${filters.fecha}T23:59:59.999-05:00`)
      : undefined;

    return this.prisma.practicaLibre.findMany({
      where: {
        ...(filters.estado && { estado: filters.estado }),
        ...(filters.aulaId && { aulaId: filters.aulaId }),
        ...(inicioDia &&
          finDia && {
            inicio: { gte: inicioDia, lte: finDia },
          }),
      },
      include: { estudiante: true, docente: true, aula: true },
      orderBy: { inicio: 'desc' },
    });
  }

  private validarSoftwareParaPrestamo(software: {
    nombre: string;
    estado: EstadoSoftware;
  }) {
    if (
      software.estado === EstadoSoftware.ACTIVO ||
      software.estado === EstadoSoftware.LICENCIADO
    ) {
      return;
    }

    const mensajes: Record<
      'SIN_LICENCIA' | 'EN_REVISION' | 'INACTIVO',
      string
    > = {
      [EstadoSoftware.SIN_LICENCIA]: `El software ${software.nombre} no tiene licencia vigente y no puede usarse para prestar un aula.`,
      [EstadoSoftware.EN_REVISION]: `El software ${software.nombre} está en revisión o mantenimiento y no está disponible para préstamo.`,
      [EstadoSoftware.INACTIVO]: `El software ${software.nombre} está inactivo y no puede usarse para prestar un aula.`,
    };

    throw new ConflictException(
      mensajes[software.estado as keyof typeof mensajes],
    );
  }

  private validarTiempoMinimoParaPrestamo(inicioIso: string, finIso: string) {
    const ahora = new Date();
    const inicio = new Date(inicioIso);
    const fin = new Date(finIso);
    if (fin <= ahora) {
      throw new ConflictException(
        'No se puede registrar una práctica libre en un bloque que ya terminó.',
      );
    }
    if (ahora >= inicio && fin.getTime() - ahora.getTime() < 30 * 60 * 1000) {
      throw new ConflictException(
        'No se puede prestar el aula porque al bloque seleccionado le quedan menos de 30 minutos.',
      );
    }
  }

  async findStudent(codigo: string) {
    await this.marcarPracticasVencidas();
    const estudiante = await this.prisma.estudiante.findUnique({
      where: { codigo },
      include: {
        multas: { where: { estado: EstadoMulta.ACTIVA } },
        practicas: { orderBy: { inicio: 'desc' }, take: 10 },
      },
    });
    if (!estudiante) {
      throw new NotFoundException(`No existe estudiante con código ${codigo}.`);
    }
    return estudiante;
  }

  async findTeacher(documento: string) {
    const docente = await this.prisma.docente.findUnique({
      where: { documento },
      select: { id: true, documento: true, nombre: true, correo: true },
    });
    if (!docente) {
      throw new NotFoundException(`No existe docente con cédula ${documento}.`);
    }
    return docente;
  }

  async finish(id: string, dto: FinalizarPracticaLibreDto) {
    await this.validarPracticaParaCierre(id, true);
    if (
      dto.cumplioReglas === false &&
      !dto.observacionesIncumplimiento?.trim()
    ) {
      throw new BadRequestException(
        'Describa el incumplimiento para recomendar la multa correspondiente.',
      );
    }
    const practica = await this.prisma.practicaLibre.update({
      where: { id },
      data: {
        estado: EstadoPrestamo.DEVUELTO,
        finReal: dto.finReal ? new Date(dto.finReal) : new Date(),
      },
      include: { estudiante: true, docente: true, aula: true },
    });
    if (dto.cumplioReglas === false) {
      return {
        ...practica,
        finalizacion: {
          cumplioReglas: false,
          requiereMulta: true,
          recomendacionMulta:
            'Registrar una multa por incumplimiento de las reglas de uso de la sala.',
          observaciones: dto.observacionesIncumplimiento?.trim(),
        },
      };
    }
    return {
      ...practica,
      finalizacion: { cumplioReglas: true, requiereMulta: false },
    };
  }

  async cancel(id: string) {
    await this.validarPracticaParaCierre(id, false);
    return this.prisma.practicaLibre.update({
      where: { id },
      data: { estado: EstadoPrestamo.CANCELADO, finReal: new Date() },
      include: { estudiante: true, docente: true, aula: true },
    });
  }

  private async validarPracticaParaCierre(
    id: string,
    permiteVencida: boolean,
  ): Promise<void> {
    const practica = await this.prisma.practicaLibre.findUnique({
      where: { id },
      select: { estado: true, finEstimada: true, finReal: true },
    });
    if (!practica) {
      throw new NotFoundException(`No existe práctica libre con id ${id}.`);
    }

    let estado = practica.estado;
    if (
      estado === EstadoPrestamo.ACTIVO &&
      !practica.finReal &&
      practica.finEstimada &&
      practica.finEstimada < new Date()
    ) {
      await this.prisma.practicaLibre.update({
        where: { id },
        data: { estado: EstadoPrestamo.VENCIDO },
      });
      estado = EstadoPrestamo.VENCIDO;
    }

    if (
      estado !== EstadoPrestamo.ACTIVO &&
      !(permiteVencida && estado === EstadoPrestamo.VENCIDO)
    ) {
      throw new ConflictException('La práctica libre ya no está activa.');
    }
  }

  private async marcarPracticasVencidas(
    referencia = new Date(),
  ): Promise<void> {
    await this.prisma.practicaLibre.updateMany({
      where: {
        estado: EstadoPrestamo.ACTIVO,
        finReal: null,
        finEstimada: { lt: referencia },
      },
      data: { estado: EstadoPrestamo.VENCIDO },
    });
  }

  private construirDatosPractica(
    dto: CreatePracticasLibreDto,
    estudianteId: string | undefined,
    softwareNombre: string,
  ): DatosPracticaLibre {
    return {
      ...(estudianteId && { estudianteId }),
      aulaId: dto.aulaId,
      responsableTipo: dto.responsableTipo,
      softwareSolicitado: softwareNombre,
      inicio: new Date(dto.inicio),
      finEstimada: new Date(dto.finEstimada),
      estado: EstadoPrestamo.ACTIVO,
    };
  }

  private normalizarBloque(
    inicioIso: string,
    finIso: string,
  ): BloqueDisponibilidad {
    const inicio = new Date(inicioIso);
    const fin = new Date(finIso);
    if (fin.getTime() - inicio.getTime() !== 2 * 60 * 60 * 1000) {
      throw new BadRequestException(
        'La práctica libre debe reservar exactamente un bloque de dos horas.',
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
        'La práctica debe iniciar y finalizar el mismo día en horas completas.',
      );
    }

    return {
      fecha: inicioLocal.fecha,
      horaInicio: `${inicioLocal.hora}:00`,
      horaFin: `${finLocal.hora}:00`,
    };
  }

  private partesBogota(fecha: Date): PartesFechaBogota {
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
