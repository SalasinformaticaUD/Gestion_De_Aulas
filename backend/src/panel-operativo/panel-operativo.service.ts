import { Injectable } from '@nestjs/common';
import {
  EstadoAsistencia,
  EstadoPrestamo,
  EstadoTarea,
} from '../../generated/prisma/enums.js';
import { DisponibilidadAulasService } from '../disponibilidad-aulas/disponibilidad-aulas.service';
import { DisponibilidadAula } from '../disponibilidad-aulas/entities/disponibilidad-aula.entity';
import { PrestamosDocentesService } from '../prestamos-docentes/prestamos-docentes.service';
import { PrismaService } from '../prisma/prisma.service';
import { HorarioService } from '../horario/horario.service';
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
  private readonly resumenCache = new Map<
    string,
    { expiraEn: number; valor: Promise<PanelOperativoResumen> }
  >();
  private readonly resumenCacheTtlMs = 45_000;

  constructor(
    private readonly disponibilidad: DisponibilidadAulasService,
    private readonly prestamos: PrestamosDocentesService,
    private readonly prisma: PrismaService,
    private readonly horario: HorarioService,
  ) {}

  async resumen(
    query: ConsultarPanelOperativoDto,
  ): Promise<PanelOperativoResumen> {
    const bloque = this.resolverBloque(query);
    const clave = `${query.fecha}:${bloque.horaInicio}:${bloque.horaFin}`;
    const existente = this.resumenCache.get(clave);
    if (
      !query.forzarActualizacion &&
      existente &&
      existente.expiraEn > Date.now()
    ) {
      return existente.valor;
    }

    if (this.resumenCache.size > 32) {
      const ahora = Date.now();
      for (const [cacheKey, entrada] of this.resumenCache) {
        if (entrada.expiraEn <= ahora) this.resumenCache.delete(cacheKey);
      }
    }

    const valor = this.calcularResumen(query).catch((error: unknown) => {
      this.resumenCache.delete(clave);
      throw error;
    });
    this.resumenCache.set(clave, {
      expiraEn: Date.now() + this.resumenCacheTtlMs,
      valor,
    });
    return valor;
  }

  private async calcularResumen(
    query: ConsultarPanelOperativoDto,
  ): Promise<PanelOperativoResumen> {
    const contexto = await this.construirContexto(query);
    const alertasBase = this.construirAlertas(
      contexto.aulas,
      contexto.asistencias,
      contexto.prestamos,
    );
    const alertas = [
      ...this.construirAlertasTareas(contexto.tareas),
      ...this.construirAlertasRecientes(contexto),
      ...alertasBase,
    ];
    const contar = (estado: DisponibilidadAula['estadoCalculado']) =>
      contexto.aulas.filter((aula) => aula.estadoCalculado === estado).length;

    return {
      fecha: query.fecha,
      bloqueReferencia: contexto.bloque,
      metricas: {
        totalAulas: contexto.aulas.length,
        disponibles: contar('disponible'),
        ocupadas: contexto.horarioActual.filter(
          (item) => item.estado === 'EN_CLASE',
        ).length,
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
        audiovisualesPrestados: contexto.audiovisualesActivos.length,
        alertas: alertas.length,
      },
      horarioActual: contexto.horarioActual,
      aulas: contexto.aulas,
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
    return [
      ...this.construirAlertasTareas(contexto.tareas),
      ...this.construirAlertasRecientes(contexto),
      ...this.construirAlertas(
        contexto.aulas,
        contexto.asistencias,
        contexto.prestamos,
      ),
    ];
  }

  private async construirContexto(query: ConsultarPanelOperativoDto) {
    const bloque = this.resolverBloque(query);
    const inicioDia = new Date(`${query.fecha}T00:00:00.000-05:00`);
    const finDia = new Date(`${query.fecha}T23:59:59.999-05:00`);
    const inicioBloque = new Date(
      `${query.fecha}T${bloque.horaInicio}:00.000-05:00`,
    );
    const finBloque = new Date(`${query.fecha}T${bloque.horaFin}:00.000-05:00`);
    const horaInicioPrisma = new Date(
      Date.UTC(1970, 0, 1, Number(bloque.horaInicio.slice(0, 2))),
    );
    const horaFinPrisma = new Date(
      Date.UTC(1970, 0, 1, Number(bloque.horaFin.slice(0, 2))),
    );
    const desdeObservaciones = new Date(
      Math.max(inicioDia.getTime(), Date.now() - 24 * 60 * 60 * 1000),
    );
    const [
      aulas,
      prestamos,
      practicas,
      audiovisualesActivos,
      clasesDelDia,
      observaciones,
      tareas,
    ] = await Promise.all([
      this.disponibilidad.findAll({ fecha: query.fecha, ...bloque }),
      this.prestamos.findUpcomingForDate(query.fecha),
      this.prisma.practicaLibre.findMany({
        where: {
          estado: EstadoPrestamo.ACTIVO,
          inicio: { lt: finBloque },
          OR: [
            { finReal: { gt: inicioBloque } },
            {
              finReal: null,
              OR: [
                { finEstimada: null },
                { finEstimada: { gt: inicioBloque } },
              ],
            },
          ],
        },
        include: { aula: true, estudiante: true, docente: true },
      }),
      this.prisma.prestamoAudiovisual.findMany({
        where: {
          estado: { in: [EstadoPrestamo.ACTIVO, EstadoPrestamo.VENCIDO] },
          salidaEn: { lte: finDia },
          devolucionReal: null,
        },
        include: { detalles: { include: { equipo: true } } },
        orderBy: { devolucionEstimada: 'asc' },
      }),
      this.horario.findClases({ fecha: query.fecha }),
      this.prisma.observacion.findMany({
        where: { creadoEn: { gte: desdeObservaciones, lte: finDia } },
        include: {
          autor: { select: { nombreCompleto: true } },
          aula: { select: { id: true, codigo: true } },
        },
        orderBy: { creadoEn: 'desc' },
        take: 8,
      }),
      this.prisma.tarea.findMany({
        where: { estado: EstadoTarea.PENDIENTE, aulaId: { not: null } },
        include: { aula: { select: { id: true, codigo: true } } },
        orderBy: [{ prioridad: 'asc' }, { creadoEn: 'asc' }],
        take: 12,
      }),
    ]);
    const clases = clasesDelDia
      .filter(
        (clase) =>
          clase.horaInicio < horaFinPrisma && clase.horaFin > horaInicioPrisma,
      )
      .sort((a, b) =>
        a.aula.codigo.localeCompare(b.aula.codigo, 'es', { numeric: true }),
      );
    const asistencias = clases.map((clase) => {
      const registro = clase.asistencias[0];
      return {
        id: registro?.id ?? `automatica-${clase.id}-${query.fecha}`,
        estado: registro?.estado ?? EstadoAsistencia.PENDIENTE,
        clase: { aulaId: clase.aula.id },
      };
    });
    const estadoPorClase = new Map(
      clases.map((clase, index) => [clase.id, asistencias[index].estado]),
    );
    const horarioActual = clases.map((clase) => {
      const asistencia =
        estadoPorClase.get(clase.id) ?? EstadoAsistencia.PENDIENTE;
      return {
        id: clase.id,
        horaInicio: this.horaPrisma(clase.horaInicio),
        horaFin: this.horaPrisma(clase.horaFin),
        aulaId: clase.aula.id,
        aulaCodigo: clase.aula.codigo,
        asignatura: clase.asignatura.nombre,
        proyecto: clase.proyectoCurricular?.nombre ?? null,
        docente: clase.docente.nombre,
        grupo: clase.grupo,
        estado:
          asistencia === EstadoAsistencia.AUSENTE
            ? ('AUSENTE' as const)
            : asistencia === EstadoAsistencia.ASISTIO
              ? ('EN_CLASE' as const)
              : ('PENDIENTE' as const),
      };
    });
    return {
      bloque,
      aulas,
      asistencias,
      prestamos,
      practicas,
      practicasActivas: practicas.length,
      audiovisualesActivos,
      horarioActual,
      observaciones,
      tareas,
      inicioBloque,
      finBloque,
    };
  }

  private construirAlertasRecientes(
    contexto: Awaited<ReturnType<PanelOperativoService['construirContexto']>>,
  ): AlertaOperativa[] {
    const ahora = new Date();
    const enUltimosQuinceMinutos = (fecha: Date) =>
      fecha.getTime() <= ahora.getTime() + 15 * 60 * 1000;
    const alertas: AlertaOperativa[] = contexto.observaciones.map(
      (observacion) => ({
        id: `observacion-${observacion.id}`,
        severidad: 'info',
        tipo: 'nueva-observacion',
        mensaje: `${observacion.autor?.nombreCompleto ?? 'Un usuario'} agregó una nueva observación.`,
        aulaId: observacion.aula.id,
        aulaCodigo: observacion.aula.codigo,
        origenId: observacion.id,
        fechaHora: observacion.creadoEn,
        enlace: '/observaciones',
        accion: 'Ver observación',
      }),
    );
    for (const prestamo of contexto.audiovisualesActivos) {
      if (!enUltimosQuinceMinutos(prestamo.devolucionEstimada)) continue;
      const videobeams = prestamo.detalles.filter((detalle) =>
        `${detalle.equipo.tipo} ${detalle.equipo.nombre}`
          .toLocaleLowerCase('es')
          .includes('video'),
      );
      if (!videobeams.length) continue;
      const equipos = videobeams
        .map((detalle) => detalle.equipo.codigoInventario)
        .join(', ');
      alertas.push({
        id: `audiovisual-${prestamo.id}`,
        severidad:
          prestamo.devolucionEstimada < ahora ? 'critica' : 'advertencia',
        tipo: 'devolucion-audiovisual',
        mensaje: `${equipos} ${prestamo.devolucionEstimada < ahora ? 'superó' : 'está próximo a'} su hora estimada de devolución.`,
        origenId: prestamo.id,
        fechaHora: prestamo.devolucionEstimada,
        enlace: '/audiovisuales',
        accion: 'Ver préstamo',
      });
    }
    if (
      ahora >= new Date(contexto.finBloque.getTime() - 15 * 60 * 1000) &&
      ahora < contexto.finBloque
    ) {
      for (const practica of contexto.practicas) {
        alertas.push({
          id: `practica-${practica.id}`,
          severidad: 'advertencia',
          tipo: 'fin-practica-libre',
          mensaje: `La práctica libre en el aula ${practica.aula.codigo} debe finalizar antes del cambio de bloque.`,
          aulaId: practica.aula.id,
          aulaCodigo: practica.aula.codigo,
          origenId: practica.id,
          fechaHora: contexto.finBloque,
          enlace: '/practicas-libres',
          accion: 'Ver práctica',
        });
      }
    }
    return alertas;
  }

  private construirAlertasTareas(
    tareas: Array<{
      id: string;
      titulo: string;
      aulaId: string | null;
      aula: { id: string; codigo: string } | null;
    }>,
  ): AlertaOperativa[] {
    return tareas.map((tarea) => {
      return {
        id: `tarea-${tarea.id}`,
        severidad: 'advertencia' as const,
        tipo: 'tarea-operativa',
        mensaje: `“${tarea.titulo}” sigue pendiente para ${tarea.aula?.codigo ?? 'el aula'}.`,
        aulaId: tarea.aulaId ?? undefined,
        aulaCodigo: tarea.aula?.codigo,
        origenId: tarea.id,
        enlace: '/tareas',
        accion: 'Revisar tarea',
      };
    });
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
    const pendientes = asistencias.filter(
      (asistencia) => asistencia.estado === EstadoAsistencia.PENDIENTE,
    );
    const ausencias = asistencias.filter(
      (asistencia) => asistencia.estado === EstadoAsistencia.AUSENTE,
    );
    if (ausencias.length) {
      alertas.push({
        id: 'ausencias-docentes',
        severidad: 'critica',
        tipo: 'ausencia-docente',
        mensaje:
          ausencias.length === 1
            ? 'Hay una ausencia docente registrada.'
            : `Hay ${ausencias.length} ausencias docentes registradas.`,
        origenId: ausencias[0].id,
        aulaId: ausencias[0].clase.aulaId,
        enlace: '/horarios',
        accion: 'Revisar asistencias',
      });
    }
    if (pendientes.length) {
      alertas.push({
        id: 'asistencias-pendientes',
        severidad: 'advertencia',
        tipo: 'asistencia-pendiente',
        mensaje:
          pendientes.length === 1
            ? 'Hay una asistencia docente pendiente de registro.'
            : `Hay ${pendientes.length} asistencias docentes pendientes de registro.`,
        origenId: pendientes[0].id,
        aulaId: pendientes[0].clase.aulaId,
        enlace: '/horarios',
        accion: 'Registrar asistencia',
      });
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
          aulaCodigo: aula.aula.codigo,
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
    const partes = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Bogota',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const horaActual = Number(
      partes.find((parte) => parte.type === 'hour')?.value ?? '6',
    );
    const minutoActual = Number(
      partes.find((parte) => parte.type === 'minute')?.value ?? '0',
    );
    const bloqueActual = Math.min(
      20,
      Math.max(6, Math.floor(horaActual / 2) * 2),
    );
    const mostrarSiguiente =
      bloqueActual < 20 &&
      horaActual * 60 + minutoActual >= bloqueActual * 60 + 105;
    const horaInicio = mostrarSiguiente ? bloqueActual + 2 : bloqueActual;
    return {
      horaInicio: `${String(horaInicio).padStart(2, '0')}:00`,
      horaFin: `${String(horaInicio + 2).padStart(2, '0')}:00`,
    };
  }

  private horaPrisma(fecha: Date) {
    return `${String(fecha.getUTCHours()).padStart(2, '0')}:${String(fecha.getUTCMinutes()).padStart(2, '0')}`;
  }
}
