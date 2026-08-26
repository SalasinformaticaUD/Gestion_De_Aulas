import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  EstadoAsistencia,
  EstadoAula,
  EstadoPrestamo,
  EstadoTarea,
  TipoObservacion,
} from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service';
import { ObservacionesService } from '../observaciones/observaciones.service';
import {
  DURACION_BLOQUE_HORAS,
  HORA_FIN_OPERACION,
  HORA_INICIO_OPERACION,
} from './disponibilidad-aulas.constants';
import { ConsultarDisponibilidadDto } from './dto/consultar-disponibilidad.dto';
import { ConsultarResumenDiaDto } from './dto/consultar-resumen-dia.dto';
import {
  AulaResumenDisponibilidad,
  DisponibilidadAula,
  EstadoCalculadoDisponibilidad,
  FuenteDisponibilidad,
  ResumenDisponibilidadDia,
  SiguienteActividadDisponibilidad,
  TipoFuenteDisponibilidad,
} from './entities/disponibilidad-aula.entity';

type ActividadCandidata = {
  inicio: Date;
  fin: Date | null;
  fuente: FuenteDisponibilidad;
};

type BloqueDosHoras = {
  fecha: string;
  horaInicio: string;
  horaFin: string;
  inicio: Date;
  fin: Date;
  horaInicioPrisma: Date;
  horaFinPrisma: Date;
  fechaPrisma: Date;
  inicioDia: Date;
  finDia: Date;
  finDiaBogota: Date;
  diaSemana: number;
};

type ClaseConDetalle = Prisma.ClaseProgramadaGetPayload<{
  include: {
    docente: true;
    asignatura: true;
    asistencias: true;
  };
}>;

@Injectable()
export class DisponibilidadAulasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly observacionesService: ObservacionesService,
  ) {}

  async findAll(
    query: ConsultarDisponibilidadDto,
  ): Promise<DisponibilidadAula[]> {
    const bloque = this.normalizarBloque(query);
    const aulas = await this.prisma.aula.findMany({
      select: {
        id: true,
        codigo: true,
        ubicacion: true,
        capacidad: true,
        estado: true,
      },
      orderBy: { codigo: 'asc' },
    });

    return Promise.all(
      aulas.map((aula) => this.calcularDisponibilidad(aula, bloque)),
    );
  }

  async findOne(
    aulaId: string,
    query: ConsultarDisponibilidadDto,
  ): Promise<DisponibilidadAula> {
    const bloque = this.normalizarBloque(query);
    const aula = await this.prisma.aula.findUnique({
      where: { id: aulaId },
      select: {
        id: true,
        codigo: true,
        ubicacion: true,
        capacidad: true,
        estado: true,
      },
    });

    if (!aula) {
      throw new NotFoundException(`No existe aula con id ${aulaId}.`);
    }

    return this.calcularDisponibilidad(aula, bloque);
  }

  async findResumenDia(
    query: ConsultarResumenDiaDto,
  ): Promise<ResumenDisponibilidadDia> {
    const bloques = this.construirBloquesOperativos();
    const resultados = await Promise.all(
      bloques.map(async (bloque) => ({
        horaInicio: bloque.horaInicio,
        horaFin: bloque.horaFin,
        aulas: await this.findAll({ fecha: query.fecha, ...bloque }),
      })),
    );

    return {
      fecha: query.fecha,
      rangoOperativo: {
        horaInicio: HORA_INICIO_OPERACION,
        horaFin: HORA_FIN_OPERACION,
        duracionBloqueHoras: DURACION_BLOQUE_HORAS,
      },
      bloques: resultados,
      calculadoEn: new Date(),
      persistido: false,
    };
  }

  private async calcularDisponibilidad(
    aula: AulaResumenDisponibilidad,
    bloque: BloqueDosHoras,
  ): Promise<DisponibilidadAula> {
    const [
      restriccion,
      clase,
      prestamo,
      practica,
      tarea,
      limpieza,
      siguienteActividad,
    ] = await Promise.all([
      this.buscarRestriccion(aula.id, bloque),
      this.buscarClase(aula.id, bloque),
      this.buscarPrestamoDocente(aula.id, bloque),
      this.buscarPracticaLibre(aula.id, bloque),
      this.buscarTarea(aula.id, bloque),
      this.buscarLimpiezaProgramada(aula.id, bloque),
      this.buscarSiguienteActividad(aula.id, bloque),
    ]);

    const fuentes: FuenteDisponibilidad[] = [];

    if (aula.estado !== EstadoAula.OPERATIVA) {
      fuentes.push({
        tipo: 'estado-aula',
        id: aula.id,
        descripcion:
          aula.estado === EstadoAula.MANTENIMIENTO
            ? 'El aula se encuentra en mantenimiento.'
            : 'El aula se encuentra fuera de servicio.',
        estado: aula.estado,
      });
    }

    if (restriccion) {
      fuentes.push({
        tipo: 'restriccion',
        id: restriccion.id,
        descripcion: restriccion.contenido,
        estado: restriccion.tipo,
      });
    }

    if (clase) {
      const asistencia = clase.asistencias[0];
      const detalleAsistencia = asistencia
        ? ` Asistencia docente: ${asistencia.estado}.`
        : ' Asistencia docente pendiente de registro.';
      fuentes.push({
        tipo: 'clase-programada',
        id: clase.id,
        descripcion: `Clase ${clase.asignatura.nombre}, grupo ${clase.grupo}, docente ${clase.docente.nombre}.${detalleAsistencia}`,
        estado: asistencia?.estado ?? EstadoAsistencia.PENDIENTE,
      });
    }

    if (prestamo) {
      fuentes.push({
        tipo: 'prestamo-docente',
        id: prestamo.id,
        descripcion: prestamo.motivo
          ? `Préstamo docente: ${prestamo.motivo}`
          : `Préstamo del docente ${prestamo.docente.nombre}.`,
        estado: prestamo.estado,
      });
    }

    if (practica) {
      fuentes.push({
        tipo: 'practica-libre',
        id: practica.id,
        descripcion: `Práctica libre del estudiante ${practica.estudiante.codigo}.`,
        estado: practica.estado,
      });
    }

    if (tarea) {
      fuentes.push({
        tipo: 'tarea-operativa',
        id: tarea.id,
        descripcion: tarea.titulo,
        estado: tarea.estado,
      });
    }

    if (limpieza) {
      fuentes.push({
        tipo: 'limpieza-programada',
        id: limpieza.id,
        descripcion: limpieza.observacion
          ? `Limpieza programada: ${limpieza.observacion}`
          : 'Limpieza programada para este bloque.',
      });
    }

    const decision = this.resolverPrioridad({
      aula,
      restriccion: Boolean(restriccion),
      clase: Boolean(clase),
      prestamo: Boolean(prestamo),
      practica: Boolean(practica),
      tarea: Boolean(tarea),
      limpieza: Boolean(limpieza),
    });

    return {
      aula,
      bloque: {
        fecha: bloque.fecha,
        horaInicio: bloque.horaInicio,
        horaFin: bloque.horaFin,
        duracionHoras: DURACION_BLOQUE_HORAS,
      },
      estadoCalculado: decision.estado,
      motivo: decision.motivo,
      bloqueActual: fuentes[0] ?? null,
      siguienteActividad,
      fuentes,
      calculadoEn: new Date(),
      persistido: false,
    };
  }

  private resolverPrioridad(input: {
    aula: AulaResumenDisponibilidad;
    restriccion: boolean;
    clase: boolean;
    prestamo: boolean;
    practica: boolean;
    tarea: boolean;
    limpieza: boolean;
  }): { estado: EstadoCalculadoDisponibilidad; motivo: string } {
    if (input.aula.estado === EstadoAula.MANTENIMIENTO) {
      return {
        estado: 'mantenimiento',
        motivo: 'El estado operativo del aula tiene prioridad.',
      };
    }
    if (input.aula.estado === EstadoAula.FUERA_DE_SERVICIO) {
      return {
        estado: 'bloqueada',
        motivo: 'El aula está fuera de servicio.',
      };
    }
    if (input.restriccion) {
      return {
        estado: 'bloqueada',
        motivo: 'Existe una restricción operativa vigente.',
      };
    }
    if (input.clase) {
      return {
        estado: 'ocupada',
        motivo: 'Existe una clase programada durante el bloque.',
      };
    }
    if (input.prestamo) {
      return {
        estado: 'reservada',
        motivo: 'Existe un préstamo docente aprobado o activo.',
      };
    }
    if (input.practica) {
      return {
        estado: 'reservada',
        motivo: 'Existe una práctica libre activa.',
      };
    }
    if (input.tarea) {
      return {
        estado: 'bloqueada',
        motivo: 'Existe una tarea operativa que afecta la disponibilidad.',
      };
    }
    if (input.limpieza) {
      return {
        estado: 'bloqueada',
        motivo: 'Existe una limpieza programada durante el bloque.',
      };
    }
    return {
      estado: 'disponible',
      motivo: 'No existen actividades ni restricciones para el bloque.',
    };
  }

  private async buscarRestriccion(aulaId: string, bloque: BloqueDosHoras) {
    const restricciones =
      await this.observacionesService.findRestriccionesVigentes(
        aulaId,
        bloque.inicio,
        bloque.fin,
      );
    return restricciones[0] ?? null;
  }

  private buscarClase(
    aulaId: string,
    bloque: BloqueDosHoras,
  ): Promise<ClaseConDetalle | null> {
    if (bloque.diaSemana < 1 || bloque.diaSemana > 6) {
      return Promise.resolve(null);
    }

    return this.prisma.claseProgramada.findFirst({
      where: {
        aulaId,
        diaSemana: bloque.diaSemana,
        horaInicio: { lt: bloque.horaFinPrisma },
        horaFin: { gt: bloque.horaInicioPrisma },
        periodo: {
          activo: true,
          fechaInicio: { lte: bloque.finDia },
          fechaFin: { gte: bloque.inicioDia },
        },
      },
      include: {
        docente: true,
        asignatura: true,
        asistencias: {
          where: { fecha: bloque.fechaPrisma },
          take: 1,
        },
      },
      orderBy: { horaInicio: 'asc' },
    });
  }

  private buscarPrestamoDocente(aulaId: string, bloque: BloqueDosHoras) {
    return this.prisma.prestamoDocente.findFirst({
      where: {
        aulaId,
        estado: { in: [EstadoPrestamo.APROBADO, EstadoPrestamo.ACTIVO] },
        inicio: { lt: bloque.fin },
        fin: { gt: bloque.inicio },
      },
      include: { docente: true },
      orderBy: { inicio: 'asc' },
    });
  }

  private buscarPracticaLibre(aulaId: string, bloque: BloqueDosHoras) {
    return this.prisma.practicaLibre.findFirst({
      where: {
        aulaId,
        estado: EstadoPrestamo.ACTIVO,
        inicio: { lt: bloque.fin },
        OR: [
          { finReal: { gt: bloque.inicio } },
          {
            finReal: null,
            OR: [{ finEstimada: null }, { finEstimada: { gt: bloque.inicio } }],
          },
        ],
      },
      include: { estudiante: true },
      orderBy: { inicio: 'asc' },
    });
  }

  private buscarTarea(aulaId: string, bloque: BloqueDosHoras) {
    return this.prisma.tarea.findFirst({
      where: {
        aulaId,
        afectaDisponibilidad: true,
        estado: { in: [EstadoTarea.PENDIENTE, EstadoTarea.EN_PROCESO] },
        AND: [
          { OR: [{ inicio: null }, { inicio: { lt: bloque.fin } }] },
          { OR: [{ fin: null }, { fin: { gt: bloque.inicio } }] },
        ],
      },
      orderBy: { inicio: 'asc' },
    });
  }

  private buscarLimpiezaProgramada(aulaId: string, bloque: BloqueDosHoras) {
    return this.prisma.limpieza.findFirst({
      where: {
        aulaId,
        realizadaEn: { gte: bloque.inicio, lt: bloque.fin },
      },
      orderBy: { realizadaEn: 'asc' },
    });
  }

  private async buscarSiguienteActividad(
    aulaId: string,
    bloque: BloqueDosHoras,
  ): Promise<SiguienteActividadDisponibilidad | null> {
    const [restriccion, clase, prestamo, practica, tarea] = await Promise.all([
      this.prisma.observacion.findFirst({
        where: {
          aulaId,
          tipo: TipoObservacion.RESTRICCION,
          creadoEn: { gte: bloque.fin, lt: bloque.finDiaBogota },
        },
        orderBy: { creadoEn: 'asc' },
      }),
      bloque.diaSemana >= 1 && bloque.diaSemana <= 6
        ? this.prisma.claseProgramada.findFirst({
            where: {
              aulaId,
              diaSemana: bloque.diaSemana,
              horaInicio: { gte: bloque.horaFinPrisma },
              periodo: {
                activo: true,
                fechaInicio: { lte: bloque.finDia },
                fechaFin: { gte: bloque.inicioDia },
              },
            },
            include: { docente: true, asignatura: true },
            orderBy: { horaInicio: 'asc' },
          })
        : Promise.resolve(null),
      this.prisma.prestamoDocente.findFirst({
        where: {
          aulaId,
          estado: { in: [EstadoPrestamo.APROBADO, EstadoPrestamo.ACTIVO] },
          inicio: { gte: bloque.fin, lt: bloque.finDiaBogota },
        },
        include: { docente: true },
        orderBy: { inicio: 'asc' },
      }),
      this.prisma.practicaLibre.findFirst({
        where: {
          aulaId,
          estado: EstadoPrestamo.ACTIVO,
          inicio: { gte: bloque.fin, lt: bloque.finDiaBogota },
        },
        include: { estudiante: true },
        orderBy: { inicio: 'asc' },
      }),
      this.prisma.tarea.findFirst({
        where: {
          aulaId,
          afectaDisponibilidad: true,
          estado: { in: [EstadoTarea.PENDIENTE, EstadoTarea.EN_PROCESO] },
          inicio: { gte: bloque.fin, lt: bloque.finDiaBogota },
        },
        orderBy: { inicio: 'asc' },
      }),
    ]);

    const candidatas: ActividadCandidata[] = [];
    if (restriccion) {
      candidatas.push({
        inicio: restriccion.creadoEn,
        fin: restriccion.vigenteHasta,
        fuente: {
          tipo: 'restriccion',
          id: restriccion.id,
          descripcion: restriccion.contenido,
          estado: restriccion.tipo,
        },
      });
    }
    if (clase) {
      candidatas.push({
        inicio: this.combinarFechaHora(bloque.fecha, clase.horaInicio),
        fin: this.combinarFechaHora(bloque.fecha, clase.horaFin),
        fuente: {
          tipo: 'clase-programada',
          id: clase.id,
          descripcion: `Clase ${clase.asignatura.nombre}, grupo ${clase.grupo}, docente ${clase.docente.nombre}.`,
        },
      });
    }
    if (prestamo) {
      candidatas.push({
        inicio: prestamo.inicio,
        fin: prestamo.fin,
        fuente: {
          tipo: 'prestamo-docente',
          id: prestamo.id,
          descripcion: prestamo.motivo
            ? `Préstamo docente: ${prestamo.motivo}`
            : `Préstamo del docente ${prestamo.docente.nombre}.`,
          estado: prestamo.estado,
        },
      });
    }
    if (practica) {
      candidatas.push({
        inicio: practica.inicio,
        fin: practica.finEstimada,
        fuente: {
          tipo: 'practica-libre',
          id: practica.id,
          descripcion: `Práctica libre del estudiante ${practica.estudiante.codigo}.`,
          estado: practica.estado,
        },
      });
    }
    if (tarea?.inicio) {
      candidatas.push({
        inicio: tarea.inicio,
        fin: tarea.fin,
        fuente: {
          tipo: 'tarea-operativa',
          id: tarea.id,
          descripcion: tarea.titulo,
          estado: tarea.estado,
        },
      });
    }

    const siguiente = candidatas.sort(
      (a, b) =>
        a.inicio.getTime() - b.inicio.getTime() ||
        this.prioridadFuente(a.fuente.tipo) -
          this.prioridadFuente(b.fuente.tipo),
    )[0];

    return siguiente
      ? {
          ...siguiente.fuente,
          horaInicio: this.formatearHoraBogota(siguiente.inicio),
          horaFin: siguiente.fin
            ? this.formatearHoraBogota(siguiente.fin)
            : null,
        }
      : null;
  }

  private construirBloquesOperativos() {
    const inicio = this.horaANumero(HORA_INICIO_OPERACION);
    const fin = this.horaANumero(HORA_FIN_OPERACION);
    if (
      inicio < 0 ||
      fin > 23 ||
      inicio % DURACION_BLOQUE_HORAS !== 0 ||
      fin <= inicio ||
      (fin - inicio) % DURACION_BLOQUE_HORAS !== 0
    ) {
      throw new InternalServerErrorException(
        'El rango operativo de disponibilidad no es válido.',
      );
    }

    return Array.from(
      { length: (fin - inicio) / DURACION_BLOQUE_HORAS },
      (_, indice) => {
        const horaInicio = inicio + indice * DURACION_BLOQUE_HORAS;
        return {
          horaInicio: this.numeroAHora(horaInicio),
          horaFin: this.numeroAHora(horaInicio + DURACION_BLOQUE_HORAS),
        };
      },
    );
  }

  private horaANumero(hora: string): number {
    return /^([01]\d|2[0-3]):00$/.test(hora)
      ? Number(hora.slice(0, 2))
      : Number.NaN;
  }

  private numeroAHora(hora: number): string {
    return `${hora.toString().padStart(2, '0')}:00`;
  }

  private combinarFechaHora(fecha: string, hora: Date): Date {
    const horaTexto = `${hora.getUTCHours().toString().padStart(2, '0')}:${hora
      .getUTCMinutes()
      .toString()
      .padStart(2, '0')}`;
    return new Date(`${fecha}T${horaTexto}:00.000-05:00`);
  }

  private formatearHoraBogota(fecha: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Bogota',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(fecha);
  }

  private prioridadFuente(tipo: TipoFuenteDisponibilidad): number {
    return [
      'estado-aula',
      'restriccion',
      'clase-programada',
      'prestamo-docente',
      'practica-libre',
      'tarea-operativa',
      'limpieza-programada',
    ].indexOf(tipo);
  }

  private normalizarBloque(query: ConsultarDisponibilidadDto): BloqueDosHoras {
    const horaInicio = Number(query.horaInicio.slice(0, 2));
    const horaFin = Number(query.horaFin.slice(0, 2));

    if (horaInicio % 2 !== 0) {
      throw new BadRequestException(
        'horaInicio debe estar alineada a una hora par para formar bloques de dos horas.',
      );
    }

    if (horaFin - horaInicio !== 2) {
      throw new BadRequestException(
        'El rango de disponibilidad debe durar exactamente dos horas.',
      );
    }

    const fechaPrisma = new Date(`${query.fecha}T00:00:00.000Z`);
    const inicio = new Date(`${query.fecha}T${query.horaInicio}:00.000-05:00`);
    const fin = new Date(`${query.fecha}T${query.horaFin}:00.000-05:00`);

    return {
      fecha: query.fecha,
      horaInicio: query.horaInicio,
      horaFin: query.horaFin,
      inicio,
      fin,
      horaInicioPrisma: new Date(Date.UTC(1970, 0, 1, horaInicio, 0, 0)),
      horaFinPrisma: new Date(Date.UTC(1970, 0, 1, horaFin, 0, 0)),
      fechaPrisma,
      inicioDia: new Date(`${query.fecha}T00:00:00.000Z`),
      finDia: new Date(`${query.fecha}T23:59:59.999Z`),
      finDiaBogota: new Date(`${query.fecha}T23:59:59.999-05:00`),
      diaSemana: fechaPrisma.getUTCDay(),
    };
  }
}
