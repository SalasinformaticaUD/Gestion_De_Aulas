import { Injectable } from '@nestjs/common';
import {
  EstadoAsistencia,
  EstadoPrestamo,
} from '../../generated/prisma/enums.js';
import { AsistenciaDocenteService } from '../asistencia-docente/asistencia-docente.service';
import { DisponibilidadAulasService } from '../disponibilidad-aulas/disponibilidad-aulas.service';
import { DisponibilidadAula } from '../disponibilidad-aulas/entities/disponibilidad-aula.entity';
import { PrestamosDocentesService } from '../prestamos-docentes/prestamos-docentes.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ConsultarAulasPanelOperativoDto,
  ConsultarPanelOperativoDto,
} from './dto/consultar-panel-operativo.dto';
import {
  AlertaOperativa,
  PaginaAulasPanelOperativo,
  PanelOperativoResumen,
} from './entities/panel-operativo.entity';

@Injectable()
export class PanelOperativoService {
  constructor(
    private readonly disponibilidad: DisponibilidadAulasService,
    private readonly asistencias: AsistenciaDocenteService,
    private readonly prestamos: PrestamosDocentesService,
    private readonly prisma: PrismaService,
  ) {}

  async resumen(
    query: ConsultarPanelOperativoDto,
  ): Promise<PanelOperativoResumen> {
    const contexto = await this.construirContexto(query);
    const alertas = this.construirAlertas(
      contexto.aulas,
      contexto.asistencias,
      contexto.prestamos,
    );
    const contar = (estado: DisponibilidadAula['estadoCalculado']) =>
      contexto.aulas.filter((aula) => aula.estadoCalculado === estado).length;

    return {
      fecha: query.fecha,
      bloqueReferencia: contexto.bloque,
      metricas: {
        totalAulas: contexto.aulas.length,
        disponibles: contar('disponible'),
        ocupadas: contar('ocupada'),
        reservadas: contar('reservada'),
        mantenimiento: contar('mantenimiento'),
        bloqueadas: contar('bloqueada'),
        asistenciasPendientes: contexto.asistencias.filter(
          (item) => item.estado === EstadoAsistencia.PENDIENTE,
        ).length,
        ausenciasDocentes: contexto.asistencias.filter(
          (item) => item.estado === EstadoAsistencia.AUSENTE,
        ).length,
        practicasActivas: contexto.practicasActivas,
        prestamosDelDia: contexto.prestamos.length,
        alertas: alertas.length,
      },
      alertas,
      calculadoEn: new Date(),
      persistido: false,
    };
  }

  async aulas(
    query: ConsultarAulasPanelOperativoDto,
  ): Promise<PaginaAulasPanelOperativo> {
    const contexto = await this.construirContexto(query);
    const inicio = (query.pagina - 1) * query.limite;
    return {
      fecha: query.fecha,
      bloqueReferencia: contexto.bloque,
      pagina: query.pagina,
      limite: query.limite,
      total: contexto.aulas.length,
      items: contexto.aulas.slice(inicio, inicio + query.limite),
      persistido: false,
    };
  }

  async alertas(query: ConsultarPanelOperativoDto): Promise<AlertaOperativa[]> {
    const contexto = await this.construirContexto(query);
    return this.construirAlertas(
      contexto.aulas,
      contexto.asistencias,
      contexto.prestamos,
    );
  }

  private async construirContexto(query: ConsultarPanelOperativoDto) {
    const bloque = this.resolverBloque(query);
    const inicioDia = new Date(`${query.fecha}T00:00:00.000-05:00`);
    const finDia = new Date(`${query.fecha}T23:59:59.999-05:00`);
    const [aulas, asistencias, prestamos, practicasActivas] = await Promise.all(
      [
        this.disponibilidad.findAll({ fecha: query.fecha, ...bloque }),
        this.asistencias.findAll({ fecha: query.fecha }),
        this.prestamos.findUpcomingForDate(query.fecha),
        this.prisma.practicaLibre.count({
          where: {
            estado: EstadoPrestamo.ACTIVO,
            inicio: { lte: finDia },
            OR: [
              { finReal: { gte: inicioDia } },
              { finReal: null, finEstimada: { gte: inicioDia } },
            ],
          },
        }),
      ],
    );
    return { bloque, aulas, asistencias, prestamos, practicasActivas };
  }

  private construirAlertas(
    aulas: DisponibilidadAula[],
    asistencias: Array<{
      id: string;
      estado: EstadoAsistencia;
      clase: { aulaId: string };
    }>,
    prestamos: Array<{ id: string; aulaId: string }>,
  ): AlertaOperativa[] {
    const alertas: AlertaOperativa[] = [];
    for (const asistencia of asistencias) {
      if (asistencia.estado === EstadoAsistencia.AUSENTE) {
        alertas.push({
          id: `asistencia-${asistencia.id}`,
          severidad: 'critica',
          tipo: 'ausencia-docente',
          mensaje: 'Hay una ausencia docente registrada.',
          aulaId: asistencia.clase.aulaId,
          origenId: asistencia.id,
        });
      } else if (asistencia.estado === EstadoAsistencia.PENDIENTE) {
        alertas.push({
          id: `asistencia-${asistencia.id}`,
          severidad: 'advertencia',
          tipo: 'asistencia-pendiente',
          mensaje: 'La asistencia docente está pendiente de registro.',
          aulaId: asistencia.clase.aulaId,
          origenId: asistencia.id,
        });
      }
    }
    for (const aula of aulas) {
      if (
        aula.estadoCalculado === 'mantenimiento' ||
        aula.estadoCalculado === 'bloqueada'
      ) {
        alertas.push({
          id: `disponibilidad-${aula.aula.id}`,
          severidad:
            aula.estadoCalculado === 'bloqueada' ? 'critica' : 'advertencia',
          tipo: aula.estadoCalculado,
          mensaje: aula.motivo,
          aulaId: aula.aula.id,
          origenId: aula.bloqueActual?.id,
        });
      }
    }
    for (const prestamo of prestamos) {
      alertas.push({
        id: `prestamo-${prestamo.id}`,
        severidad: 'info',
        tipo: 'prestamo-programado',
        mensaje: 'Hay un préstamo docente programado para la jornada.',
        aulaId: prestamo.aulaId,
        origenId: prestamo.id,
      });
    }
    return alertas;
  }

  private resolverBloque(query: ConsultarPanelOperativoDto) {
    if (query.horaInicio) {
      const horaFin = Number(query.horaInicio.slice(0, 2)) + 2;
      return {
        horaInicio: query.horaInicio,
        horaFin: `${horaFin.toString().padStart(2, '0')}:00`,
      };
    }
    return { horaInicio: '06:00', horaFin: '08:00' };
  }
}
