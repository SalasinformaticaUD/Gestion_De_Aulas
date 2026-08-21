import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { EstadoMulta, EstadoPrestamo } from '../../generated/prisma/enums.js';
import { DisponibilidadAulasService } from '../disponibilidad-aulas/disponibilidad-aulas.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePracticasLibreDto } from './dto/create-practicas-libre.dto';
import { FinalizarPracticaLibreDto } from './dto/finalizar-practica-libre.dto';
import { FindPracticasLibresDto } from './dto/find-practicas-libres.dto';

type BloqueDisponibilidad = {
  fecha: string;
  horaInicio: string;
  horaFin: string;
};

type PartesFechaBogota = {
  fecha: string;
  hora: string;
  minuto: string;
};

type DatosEstudiante = {
  codigo: string;
  nombre: string;
  correo?: string;
};

type DatosPracticaLibre = {
  estudianteId: string;
  aulaId: string;
  inicio: Date;
  finEstimada: Date;
  estado: EstadoPrestamo;
};

@Injectable()
export class PracticasLibresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly disponibilidad: DisponibilidadAulasService,
  ) {}

  async create(dto: CreatePracticasLibreDto) {
    const bloque = this.normalizarBloque(dto.inicio, dto.finEstimada);
    const estadoAula = await this.disponibilidad.findOne(dto.aulaId, bloque);
    if (estadoAula.estadoCalculado !== 'disponible') {
      throw new ConflictException(
        `El aula no está disponible: ${estadoAula.motivo}`,
      );
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const estudianteExistente = await tx.estudiante.findUnique({
        where: { codigo: dto.codigoEstudiante },
      });

      if (estudianteExistente) {
        const multa = await tx.multa.findFirst({
          where: {
            estudianteId: estudianteExistente.id,
            estado: EstadoMulta.ACTIVA,
          },
          select: { id: true },
        });
        if (multa) {
          throw new ConflictException(
            'El estudiante tiene una multa activa y no puede registrar prácticas libres.',
          );
        }
      }

      const datosEstudiante = this.construirDatosEstudiante(dto);
      const estudiante =
        estudianteExistente ??
        (await tx.estudiante.create({
          data: datosEstudiante,
        }));

      const datosPractica = this.construirDatosPractica(dto, estudiante.id);
      return tx.practicaLibre.create({
        data: datosPractica,
        include: { estudiante: true, aula: true },
      });
    });
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
      include: { estudiante: true, aula: true },
      orderBy: { inicio: 'desc' },
    });
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

  async finish(id: string, dto: FinalizarPracticaLibreDto) {
    await this.validarPracticaParaCierre(id, true);
    return this.prisma.practicaLibre.update({
      where: { id },
      data: {
        estado: EstadoPrestamo.DEVUELTO,
        finReal: dto.finReal ? new Date(dto.finReal) : new Date(),
      },
      include: { estudiante: true, aula: true },
    });
  }

  async cancel(id: string) {
    await this.validarPracticaParaCierre(id, false);
    return this.prisma.practicaLibre.update({
      where: { id },
      data: { estado: EstadoPrestamo.CANCELADO, finReal: new Date() },
      include: { estudiante: true, aula: true },
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

  private construirDatosEstudiante(
    dto: CreatePracticasLibreDto,
  ): DatosEstudiante {
    return {
      codigo: dto.codigoEstudiante,
      nombre: dto.nombreEstudiante,
      ...(dto.correoEstudiante !== undefined && {
        correo: dto.correoEstudiante,
      }),
    };
  }

  private construirDatosPractica(
    dto: CreatePracticasLibreDto,
    estudianteId: string,
  ): DatosPracticaLibre {
    return {
      estudianteId,
      aulaId: dto.aulaId,
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
