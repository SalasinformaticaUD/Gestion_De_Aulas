import { Injectable } from '@nestjs/common';
import {
  EstadoAula,
  EstadoAsistencia,
  EstadoPrestamo,
  EstadoTarea,
  TipoObservacion,
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
    usuarioId?: string,
  ): Promise<PanelOperativoResumen> {
    const bloque = this.resolverBloque(query);
    const clave = `${usuarioId ?? 'anonimo'}:${query.fecha}:${bloque.horaInicio}:${bloque.horaFin}`;
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

    const valor = this.calcularResumen(query, usuarioId).catch((error: unknown) => {
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
    usuarioId?: string,
  ): Promise<PanelOperativoResumen> {
    const contexto = await this.construirContexto(query);
    const alertasCredenciales = usuarioId
      ? await this.construirAlertasCredenciales(usuarioId)
      : [];
    const alertasBase = this.construirAlertas(
      contexto.aulas,
      contexto.asistencias,
      contexto.prestamos,
    );
    const alertas = [
      ...(await this.construirAlertasTareas(
        contexto.tareas,
        contexto.aulas,
        query.fecha,
        contexto.bloque,
      )),
      ...this.construirAlertasRecientes(contexto),
      ...alertasCredenciales,
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

  async alertas(
    query: ConsultarPanelOperativoDto,
    usuarioId?: string,
  ): Promise<AlertaOperativa[]> {
    const contexto = await this.construirContexto(query);
    return [
      ...(await this.construirAlertasTareas(
        contexto.tareas,
        contexto.aulas,
        query.fecha,
        contexto.bloque,
      )),
      ...this.construirAlertasRecientes(contexto),
      ...(usuarioId
        ? await this.construirAlertasCredenciales(usuarioId)
        : []),
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

  private async construirAlertasCredenciales(
    usuarioId: string,
  ): Promise<AlertaOperativa[]> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        roles: { select: { rol: { select: { nombre: true } } } },
      },
    });
    const esAdministrador =
      usuario?.roles.some(
        ({ rol }) => rol.nombre.trim().toUpperCase() === 'ADMINISTRADOR',
      ) ?? false;
    const credenciales = await this.prisma.credencialOperativa.findMany({
      where: esAdministrador ? {} : { creadorId: usuarioId },
      select: { id: true, nombre: true },
    });
    if (!credenciales.length) return [];

    const nombres = new Map(
      credenciales.map((credencial) => [credencial.id, credencial.nombre]),
    );
    const desde = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const auditorias = await this.prisma.auditoria.findMany({
      where: {
        entidad: 'CredencialOperativa',
        entidadId: { in: [...nombres.keys()] },
        accion: 'UPDATE',
        usuarioId: { not: usuarioId },
        creadoEn: { gte: desde },
      },
      include: {
        usuario: {
          select: { nombreCompleto: true, nombreUsuario: true },
        },
      },
      orderBy: { creadoEn: 'desc' },
      take: 12,
    });

    return auditorias.map((auditoria) => {
      const actor =
        auditoria.usuario?.nombreCompleto ??
        auditoria.usuario?.nombreUsuario ??
        'Otro usuario';
      const credencial = nombres.get(auditoria.entidadId) ?? 'sin nombre';
      return {
        id: `credencial-${auditoria.id}`,
        severidad: 'info' as const,
        tipo: 'credencial-actualizada',
        mensaje: `${actor} ${this.describirCambioCredencial(
          auditoria.datosPrevios,
          auditoria.datosNuevos,
        )} en la credencial “${credencial}”.`,
        origenId: auditoria.entidadId,
        fechaHora: auditoria.creadoEn,
        enlace: '/credenciales',
        accion: 'Ver credencial',
      };
    });
  }

  private describirCambioCredencial(
    datosPrevios: unknown,
    datosNuevos: unknown,
  ) {
    const previo = this.comoRegistro(datosPrevios);
    const nuevo = this.comoRegistro(datosNuevos);
    if (nuevo.secretoActualizado === true) return 'cambió la contraseña';
    if (nuevo.acceso) return 'modificó los usuarios autorizados';

    const campos: Array<[string, string]> = [
      ['nombre', 'el nombre'],
      ['usuario', 'el usuario'],
      ['descripcion', 'la descripción'],
      ['estado', 'el estado'],
    ];
    const modificados = campos
      .filter(([campo]) =>
        JSON.stringify(previo[campo]) !== JSON.stringify(nuevo[campo]),
      )
      .map(([, etiqueta]) => etiqueta);
    if (!modificados.length) return 'actualizó la información';
    if (modificados.length === 1) return `cambió ${modificados[0]}`;
    const ultimo = modificados.at(-1);
    return `cambió ${modificados.slice(0, -1).join(', ')} y ${ultimo}`;
  }

  private comoRegistro(valor: unknown): Record<string, unknown> {
    return valor !== null && typeof valor === 'object' && !Array.isArray(valor)
      ? (valor as Record<string, unknown>)
      : {};
  }

  private async construirAlertasTareas(
    tareas: Array<{
      id: string;
      titulo: string;
      aulaId: string | null;
      aula: { id: string; codigo: string } | null;
    }>,
    aulasActuales: DisponibilidadAula[],
    fecha: string,
    bloqueActual: { horaInicio: string; horaFin: string },
  ): Promise<AlertaOperativa[]> {
    if (!tareas.length) return [];

    const recomendaciones = new Map<
      string,
      { fecha: string; horaInicio: string; horaFin: string }
    >();
    const disponibilidadActual = new Map(
      aulasActuales.map((aula) => [aula.aula.id, aula.estadoCalculado]),
    );
    const aulaIds = [
      ...new Set(
        tareas
          .map((tarea) => tarea.aulaId)
          .filter((aulaId): aulaId is string => Boolean(aulaId)),
      ),
    ];

    for (const aulaId of aulaIds) {
      if (disponibilidadActual.get(aulaId) === 'disponible') {
        recomendaciones.set(aulaId, { fecha, ...bloqueActual });
      }
    }

    const pendientes = aulaIds.filter((aulaId) => !recomendaciones.has(aulaId));
    if (pendientes.length) {
      const futuras = await this.buscarBloquesDisponiblesEnLote(
        pendientes,
        fecha,
        bloqueActual,
      );
      for (const [aulaId, bloque] of futuras) {
        recomendaciones.set(aulaId, bloque);
      }
    }

    return tareas.map((tarea) => {
      const bloque = tarea.aulaId
        ? recomendaciones.get(tarea.aulaId)
        : undefined;
      return {
        id: `tarea-${tarea.id}`,
        severidad: bloque ? ('info' as const) : ('advertencia' as const),
        tipo: 'tarea-operativa',
        mensaje: bloque
          ? `“${tarea.titulo}” puede realizarse en ${tarea.aula?.codigo ?? 'el aula'} el ${this.fechaLegible(bloque.fecha)}, de ${bloque.horaInicio} a ${bloque.horaFin}.`
          : `“${tarea.titulo}” sigue pendiente; no se encontró disponibilidad cercana para ${tarea.aula?.codigo ?? 'el aula'}.`,
        aulaId: tarea.aulaId ?? undefined,
        aulaCodigo: tarea.aula?.codigo,
        origenId: tarea.id,
        enlace: '/tareas',
        accion: 'Revisar tarea',
      };
    });
  }

  private async buscarBloquesDisponiblesEnLote(
    aulaIds: string[],
    fecha: string,
    bloqueActual: { horaInicio: string; horaFin: string },
  ) {
    const bloques = this.construirBloquesFuturos(fecha, bloqueActual);
    const recomendaciones = new Map<
      string,
      { fecha: string; horaInicio: string; horaFin: string }
    >();
    if (!bloques.length) return recomendaciones;

    const rangoInicio = bloques[0].inicio;
    const rangoFin = bloques[bloques.length - 1].fin;
    const diasSemana = [
      ...new Set(
        bloques
          .map((bloque) => bloque.diaSemana)
          .filter((dia) => dia >= 1 && dia <= 6),
      ),
    ];
    const [
      aulas,
      restricciones,
      clases,
      prestamos,
      practicas,
      tareas,
      limpiezas,
    ] = await Promise.all([
      this.prisma.aula.findMany({
        where: { id: { in: aulaIds }, eliminadoEn: null },
        select: { id: true, estado: true },
      }),
      this.prisma.observacion.findMany({
        where: {
          aulaId: { in: aulaIds },
          tipo: TipoObservacion.RESTRICCION,
          OR: [{ vigenteDesde: null }, { vigenteDesde: { lt: rangoFin } }],
          AND: [
            {
              OR: [
                { vigenteHasta: null },
                { vigenteHasta: { gt: rangoInicio } },
              ],
            },
          ],
        },
        select: { aulaId: true, vigenteDesde: true, vigenteHasta: true },
      }),
      this.prisma.claseProgramada.findMany({
        where: {
          aulaId: { in: aulaIds },
          diaSemana: { in: diasSemana },
          periodo: {
            activo: true,
            fechaInicio: { lte: rangoFin },
            fechaFin: { gte: rangoInicio },
          },
        },
        select: {
          aulaId: true,
          diaSemana: true,
          horaInicio: true,
          horaFin: true,
          periodo: {
            select: { fechaInicio: true, fechaFin: true },
          },
        },
      }),
      this.prisma.prestamoDocente.findMany({
        where: {
          aulaId: { in: aulaIds },
          estado: { in: [EstadoPrestamo.APROBADO, EstadoPrestamo.ACTIVO] },
          inicio: { lt: rangoFin },
          fin: { gt: rangoInicio },
        },
        select: { aulaId: true, inicio: true, fin: true },
      }),
      this.prisma.practicaLibre.findMany({
        where: {
          aulaId: { in: aulaIds },
          estado: EstadoPrestamo.ACTIVO,
          inicio: { lt: rangoFin },
          OR: [
            { finReal: { gt: rangoInicio } },
            {
              finReal: null,
              OR: [{ finEstimada: null }, { finEstimada: { gt: rangoInicio } }],
            },
          ],
        },
        select: {
          aulaId: true,
          inicio: true,
          finEstimada: true,
          finReal: true,
        },
      }),
      this.prisma.tarea.findMany({
        where: {
          aulaId: { in: aulaIds },
          afectaDisponibilidad: true,
          estado: EstadoTarea.EN_PROCESO,
          AND: [
            { OR: [{ inicio: null }, { inicio: { lt: rangoFin } }] },
            { OR: [{ fin: null }, { fin: { gt: rangoInicio } }] },
          ],
        },
        select: { aulaId: true, inicio: true, fin: true },
      }),
      this.prisma.limpieza.findMany({
        where: {
          aulaId: { in: aulaIds },
          realizadaEn: { gte: rangoInicio, lt: rangoFin },
        },
        select: { aulaId: true, realizadaEn: true },
      }),
    ]);

    const estadoPorAula = new Map(aulas.map((aula) => [aula.id, aula.estado]));
    for (const aulaId of aulaIds) {
      if (estadoPorAula.get(aulaId) !== EstadoAula.OPERATIVA) continue;
      const bloque = bloques.find((candidato) => {
        const seSuperpone = (inicio: Date, fin: Date | null) =>
          inicio < candidato.fin && (!fin || fin > candidato.inicio);
        const restringida = restricciones.some(
          (item) =>
            item.aulaId === aulaId &&
            (!item.vigenteDesde || item.vigenteDesde < candidato.fin) &&
            (!item.vigenteHasta || item.vigenteHasta > candidato.inicio),
        );
        const conClase = clases.some((item) => {
          if (
            item.aulaId !== aulaId ||
            item.diaSemana !== candidato.diaSemana
          ) {
            return false;
          }
          if (
            item.periodo.fechaInicio > candidato.fin ||
            item.periodo.fechaFin < candidato.inicio
          ) {
            return false;
          }
          const inicio =
            item.horaInicio.getUTCHours() * 60 +
            item.horaInicio.getUTCMinutes();
          const fin =
            item.horaFin.getUTCHours() * 60 + item.horaFin.getUTCMinutes();
          return inicio < candidato.minutoFin && fin > candidato.minutoInicio;
        });
        const conPrestamo = prestamos.some(
          (item) =>
            item.aulaId === aulaId && seSuperpone(item.inicio, item.fin),
        );
        const conPractica = practicas.some((item) => {
          if (item.aulaId !== aulaId) return false;
          const fin = item.finReal ?? item.finEstimada;
          return seSuperpone(item.inicio, fin);
        });
        const conTarea = tareas.some((item) => {
          if (item.aulaId !== aulaId) return false;
          const inicio = item.inicio ?? rangoInicio;
          return seSuperpone(inicio, item.fin);
        });
        const conLimpieza = limpiezas.some(
          (item) =>
            item.aulaId === aulaId &&
            item.realizadaEn >= candidato.inicio &&
            item.realizadaEn < candidato.fin,
        );
        return !(
          restringida ||
          conClase ||
          conPrestamo ||
          conPractica ||
          conTarea ||
          conLimpieza
        );
      });
      if (bloque) {
        recomendaciones.set(aulaId, {
          fecha: bloque.fecha,
          horaInicio: bloque.horaInicio,
          horaFin: bloque.horaFin,
        });
      }
    }
    return recomendaciones;
  }

  private construirBloquesFuturos(
    fecha: string,
    bloqueActual: { horaInicio: string; horaFin: string },
  ) {
    const bloques: Array<{
      fecha: string;
      horaInicio: string;
      horaFin: string;
      inicio: Date;
      fin: Date;
      diaSemana: number;
      minutoInicio: number;
      minutoFin: number;
    }> = [];
    const base = new Date(`${fecha}T12:00:00.000-05:00`);
    for (let dia = 0; dia < 4; dia += 1) {
      const fechaCandidata = new Date(base.getTime() + dia * 86_400_000)
        .toISOString()
        .slice(0, 10);
      const primeraHora =
        dia === 0 ? Number(bloqueActual.horaFin.slice(0, 2)) : 6;
      for (let hora = primeraHora; hora <= 20; hora += 2) {
        const horaInicio = `${String(hora).padStart(2, '0')}:00`;
        const horaFin = `${String(hora + 2).padStart(2, '0')}:00`;
        bloques.push({
          fecha: fechaCandidata,
          horaInicio,
          horaFin,
          inicio: new Date(`${fechaCandidata}T${horaInicio}:00.000-05:00`),
          fin: new Date(`${fechaCandidata}T${horaFin}:00.000-05:00`),
          diaSemana: new Date(
            `${fechaCandidata}T12:00:00.000-05:00`,
          ).getUTCDay(),
          minutoInicio: hora * 60,
          minutoFin: (hora + 2) * 60,
        });
      }
    }
    return bloques;
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

  private fechaLegible(fecha: string) {
    return new Intl.DateTimeFormat('es-CO', {
      timeZone: 'America/Bogota',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(new Date(`${fecha}T12:00:00.000-05:00`));
  }
}
