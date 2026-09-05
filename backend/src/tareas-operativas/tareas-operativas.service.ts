import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DecisionTarea, EstadoTarea } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateTareasOperativaDto } from './dto/create-tareas-operativa.dto';
import { CrearInformeSeguimientoDto, FindTareasDto } from './dto/tareas.dto';
import { UpdateTareasOperativaDto } from './dto/update-tareas-operativa.dto';

@Injectable()
export class TareasOperativasService {
  constructor(private prisma: PrismaService, private readonly auditoria: AuditoriaService) {}

  async create(d: CreateTareasOperativaDto, usuarioId?: string) {
    const { aulaIds, aulaId, ...datos } = d;
    const aulas = [...new Set(aulaIds?.length ? aulaIds : aulaId ? [aulaId] : [])];
    if (d.afectaDisponibilidad && !aulas.length)
      throw new BadRequestException('Una tarea que afecta disponibilidad requiere al menos un aula asociada.');

    // Cada aula recibe una tarea hermana: comparten grupo, pero su estado,
    // responsables e informes permanecen independientes.
    const destinos: Array<string | undefined> = aulas.length ? aulas : [undefined];
    for (const aulaDestino of destinos) {
      const tarea = { ...datos, aulaId: aulaDestino };
      this.validar(tarea);
      await this.referencias(tarea);
      await this.validarCruces(tarea);
    }

    const grupoId = destinos.length > 1 ? randomUUID() : undefined;
    const creadas = await this.prisma.$transaction(async (tx) => {
      const resultado: Array<{ id: string; [key: string]: unknown }> = [];
      // Las consultas se ejecutan en serie dentro de la transacción. El
      // adaptador de PostgreSQL no admite operaciones concurrentes en ella.
      for (const aulaDestino of destinos) {
        resultado.push(await tx.tarea.create({
          data: {
            ...datos,
            aulaId: aulaDestino,
            grupoId,
            creadorId: usuarioId,
            inicio: datos.inicio ? new Date(datos.inicio) : undefined,
            fin: datos.fin ? new Date(datos.fin) : undefined,
          },
          include: this.detalle(),
        }));
      }
      return resultado;
    });
    await Promise.all(creadas.map((creada) => this.auditoria.registrar({ usuarioId, entidad: 'Tarea', entidadId: creada.id, accion: 'CREATE', datosNuevos: creada })));
    return creadas.length === 1 ? creadas[0] : creadas;
  }

  findAll(f: FindTareasDto) {
    const fechaDesde = f.fechaDesde ? new Date(f.fechaDesde) : f.fecha ? new Date(f.fecha) : undefined;
    const fechaHasta = f.fechaHasta ? new Date(`${f.fechaHasta}T23:59:59.999Z`) : f.fecha ? new Date(`${f.fecha}T23:59:59.999Z`) : undefined;
    return this.prisma.tarea.findMany({
      where: {
        ...(f.estado && { estado: f.estado }),
        ...(f.aulaId && { aulaId: f.aulaId }),
        ...(f.responsableId && { OR: [{ responsableId: f.responsableId }, { responsables: { some: { usuarioId: f.responsableId } } }] }),
        ...(fechaDesde && fechaHasta && { AND: [{ OR: [{ inicio: null }, { inicio: { lte: fechaHasta } }] }, { OR: [{ fin: null }, { fin: { gte: fechaDesde } }] }] }),
      },
      include: this.detalle(),
      orderBy: { creadoEn: 'desc' },
    });
  }

  async findOne(id: string) {
    const tarea = await this.prisma.tarea.findUnique({ where: { id }, include: this.detalle() });
    if (!tarea) throw new NotFoundException('La tarea no existe.');
    return tarea;
  }

  async update(id: string, d: UpdateTareasOperativaDto, usuarioId?: string) {
    const actual = await this.findOne(id);
    const completa = { ...d, aulaId: d.aulaId ?? actual.aulaId ?? undefined, afectaDisponibilidad: d.afectaDisponibilidad ?? actual.afectaDisponibilidad, inicio: d.inicio ?? actual.inicio?.toISOString(), fin: d.fin ?? actual.fin?.toISOString() };
    this.validar(completa);
    await this.referencias(d);
    await this.validarCruces(completa, id);
    const actualizada = await this.prisma.tarea.update({
      where: { id },
      data: {
        ...(d.titulo !== undefined && { titulo: d.titulo }),
        ...(d.descripcion !== undefined && { descripcion: d.descripcion }),
        ...(d.tipo !== undefined && { tipo: d.tipo }),
        ...(d.prioridad !== undefined && { prioridad: d.prioridad }),
        ...(d.observaciones !== undefined && { observaciones: d.observaciones }),
        ...(d.aulaId !== undefined && { aulaId: d.aulaId }),
        ...(d.responsableId !== undefined && { responsableId: d.responsableId }),
        ...(d.afectaDisponibilidad !== undefined && { afectaDisponibilidad: d.afectaDisponibilidad }),
        ...(d.inicio !== undefined && { inicio: d.inicio ? new Date(d.inicio) : null }),
        ...(d.fin !== undefined && { fin: d.fin ? new Date(d.fin) : null }),
      },
      include: this.detalle(),
    });
    await this.auditoria.registrar({ usuarioId, entidad: 'Tarea', entidadId: id, accion: 'UPDATE', datosPrevios: actual, datosNuevos: actualizada });
    return actualizada;
  }

  async remove(id: string, usuarioId?: string) {
    const previa = await this.findOne(id);
    const eliminada = await this.prisma.tarea.delete({ where: { id } });
    await this.auditoria.registrar({ usuarioId, entidad: 'Tarea', entidadId: id, accion: 'DELETE', datosPrevios: previa });
    return eliminada;
  }

  async cambiarEstado(id: string, estado: EstadoTarea, usuarioId?: string, _puedeAdministrar = false, motivoCancelacion?: string) {
    const tarea = await this.findOne(id);
    if (tarea.estado === estado) return tarea;
    this.validarTransicion(tarea.estado, estado);
    if (estado === EstadoTarea.EN_PROCESO) throw new ConflictException('Para iniciar o retomar la tarea debe usar la opción Aceptar.');
    if (estado === EstadoTarea.CANCELADA && !motivoCancelacion?.trim()) throw new BadRequestException('Debe indicar el motivo de cancelación.');
    if (estado === EstadoTarea.COMPLETADA && tarea.informes[0]?.accionesPendientes?.trim())
      throw new ConflictException('La tarea tiene acciones pendientes. Registre un nuevo informe sin acciones pendientes antes de completarla.');
    const ahora = new Date();
    const actualizada = await this.prisma.tarea.update({
      where: { id },
      data: {
        estado,
        ...(estado === EstadoTarea.COMPLETADA && { completadaEn: ahora, fin: tarea.fin ?? ahora }),
        ...(estado === EstadoTarea.CANCELADA && { canceladaEn: ahora, canceladaPorId: usuarioId, estadoAntesCancelacion: tarea.estado, motivoCancelacion: motivoCancelacion!.trim() }),
      },
      include: this.detalle(),
    });
    await this.auditoria.registrar({ usuarioId, entidad: 'Tarea', entidadId: id, accion: estado === EstadoTarea.CANCELADA ? 'CANCEL' : 'UPDATE', datosPrevios: tarea, datosNuevos: actualizada });
    return actualizada;
  }

  async decidir(id: string, decision: DecisionTarea, usuarioId?: string, _puedeAdministrar = false, responsableIds: string[] = []) {
    if (!usuarioId) throw new BadRequestException('Se requiere un usuario autenticado para aceptar la tarea.');
    if (decision !== DecisionTarea.ACEPTADA) throw new BadRequestException('Para cancelar una tarea utilice la opción Cancelar e indique el motivo.');
    const tarea = await this.findOne(id);
    if (tarea.estado !== EstadoTarea.PENDIENTE && tarea.estado !== EstadoTarea.EN_PROCESO)
      throw new ConflictException('Solo se pueden aceptar tareas pendientes o en proceso con acciones pendientes.');
    if (tarea.estado === EstadoTarea.EN_PROCESO && !tarea.informes[0]?.accionesPendientes?.trim())
      throw new ConflictException('Esta tarea no tiene acciones pendientes para reasignar.');
    const ids = [...new Set([usuarioId, ...responsableIds])];
    const usuarios = await this.prisma.usuario.findMany({ where: { id: { in: ids }, estado: 'ACTIVA' }, select: { id: true, nombreCompleto: true } });
    if (usuarios.length !== ids.length) throw new BadRequestException('Uno o más responsables seleccionados no existen o no están activos.');
    const participantes = ids.map((idParticipante) => usuarios.find((usuario) => usuario.id === idParticipante)!);
    await this.prisma.$transaction(async (tx) => {
      await tx.decisionTareaOperativa.create({ data: { tareaId: id, usuarioId, decision, participantes } });
      for (const responsableId of ids) {
        await tx.responsableTareaOperativa.upsert({
          where: { tareaId_usuarioId: { tareaId: id, usuarioId: responsableId } },
          create: { tareaId: id, usuarioId: responsableId, agregadoPorId: usuarioId },
          update: {},
        });
      }
      await tx.tarea.update({
        where: { id },
        data: { estado: EstadoTarea.EN_PROCESO, ...(tarea.estado === EstadoTarea.PENDIENTE && { responsableId: usuarioId, inicio: tarea.inicio ?? new Date() }) },
      });
    });
    const actualizada = await this.findOne(id);
    await this.auditoria.registrar({ usuarioId, entidad: 'Tarea', entidadId: id, accion: 'APPROVE', datosPrevios: tarea, datosNuevos: actualizada });
    return actualizada;
  }

  async crearInforme(id: string, dto: CrearInformeSeguimientoDto, usuarioId?: string, puedeAdministrar = false) {
    if (!usuarioId) throw new BadRequestException('Se requiere un usuario autenticado para registrar el informe.');
    const tarea = await this.findOne(id);
    const esResponsable = tarea.responsableId === usuarioId || tarea.responsables.some((item) => item.usuarioId === usuarioId);
    if (!esResponsable && !puedeAdministrar) throw new ConflictException('Solo un responsable de la tarea puede registrar el informe de seguimiento.');
    if (tarea.estado !== EstadoTarea.EN_PROCESO) throw new ConflictException('El informe de seguimiento solo se registra para tareas en proceso.');
    const informe = await this.prisma.informeSeguimientoTarea.create({
      data: { tareaId: id, autorId: usuarioId, responsables: tarea.decisiones[0]?.participantes ?? [{ id: usuarioId, nombreCompleto: tarea.responsables.find((item) => item.usuarioId === usuarioId)?.usuario.nombreCompleto ?? tarea.responsable?.nombreCompleto ?? 'Responsable' }], actividadesRealizadas: dto.actividadesRealizadas.trim(), accionesPendientes: dto.accionesPendientes?.trim() || null },
      include: { autor: { select: { id: true, nombreCompleto: true } } },
    });
    await this.auditoria.registrar({ usuarioId, entidad: 'InformeSeguimientoTarea', entidadId: informe.id, accion: 'CREATE', datosNuevos: informe });
    return informe;
  }

  historial(id: string) { return this.findOne(id); }

  async indicadores(f: FindTareasDto) {
    const tareas = await this.findAll(f);
    const completadas = tareas.filter((t) => t.estado === EstadoTarea.COMPLETADA);
    const duraciones = completadas.filter((t) => t.inicio && t.completadaEn).map((t) => (t.completadaEn!.getTime() - t.inicio!.getTime()) / 60000);
    return { pendientes: tareas.filter((t) => t.estado === EstadoTarea.PENDIENTE).length, enProceso: tareas.filter((t) => t.estado === EstadoTarea.EN_PROCESO).length, finalizadas: completadas.length, productividad: tareas.length ? Math.round((completadas.length / tareas.length) * 100) : 0, tiempoPromedioMinutos: duraciones.length ? Math.round(duraciones.reduce((a, b) => a + b, 0) / duraciones.length) : 0 };
  }

  findTareasQueAfectanDisponibilidad(aulaId: string, inicio: Date, fin: Date) {
    return this.prisma.tarea.findMany({ where: { aulaId, afectaDisponibilidad: true, estado: EstadoTarea.EN_PROCESO, AND: [{ OR: [{ inicio: null }, { inicio: { lt: fin } }] }, { OR: [{ fin: null }, { fin: { gt: inicio } }] }] } });
  }

  private validarTransicion(actual: EstadoTarea, siguiente: EstadoTarea) {
    const permitidas: Partial<Record<EstadoTarea, EstadoTarea[]>> = {
      [EstadoTarea.PENDIENTE]: [EstadoTarea.EN_PROCESO, EstadoTarea.CANCELADA],
      [EstadoTarea.EN_PROCESO]: [EstadoTarea.COMPLETADA, EstadoTarea.CANCELADA],
      [EstadoTarea.COMPLETADA]: [], [EstadoTarea.CANCELADA]: [], [EstadoTarea.SUSPENDIDA]: [], [EstadoTarea.RECHAZADA]: [],
    };
    if (!permitidas[actual]?.includes(siguiente)) throw new ConflictException(`No se permite cambiar una tarea de ${actual} a ${siguiente}.`);
  }

  private validar(d: Partial<CreateTareasOperativaDto>) {
    if (d.afectaDisponibilidad && !d.aulaId) throw new BadRequestException('Una tarea que afecta disponibilidad requiere un aula asociada.');
    if (d.inicio && d.fin && new Date(d.fin) <= new Date(d.inicio)) throw new BadRequestException('fin debe ser posterior a inicio.');
  }

  private async referencias(d: Partial<CreateTareasOperativaDto>) {
    if (d.aulaId && !(await this.prisma.aula.findUnique({ where: { id: d.aulaId }, select: { id: true } }))) throw new NotFoundException('El aula no existe.');
    if (d.responsableId && !(await this.prisma.usuario.findUnique({ where: { id: d.responsableId }, select: { id: true } }))) throw new NotFoundException('El responsable no existe.');
  }

  private detalle() {
    return {
      aula: true,
      responsable: { select: { id: true, nombreCompleto: true } },
      creador: { select: { id: true, nombreCompleto: true } },
      canceladaPor: { select: { id: true, nombreCompleto: true } },
      responsables: { include: { usuario: { select: { id: true, nombreCompleto: true } } }, orderBy: { agregadoEn: 'asc' as const } },
      decisiones: { include: { usuario: { select: { id: true, nombreCompleto: true } } }, orderBy: { tomadaEn: 'desc' as const } },
      informes: { include: { autor: { select: { id: true, nombreCompleto: true } } }, orderBy: { creadoEn: 'desc' as const } },
    };
  }

  private async validarCruces(d: Partial<CreateTareasOperativaDto>, excluirId?: string) {
    if (!d.aulaId || !d.inicio || !d.fin) return;
    const inicio = new Date(d.inicio); const fin = new Date(d.fin); const diaSemana = inicio.getDay();
    const horaInicio = new Date(`1970-01-01T${inicio.toLocaleTimeString('en-GB', { timeZone: 'America/Bogota', hour12: false })}`);
    const horaFin = new Date(`1970-01-01T${fin.toLocaleTimeString('en-GB', { timeZone: 'America/Bogota', hour12: false })}`);
    const [tarea, prestamo, practica, clase] = await Promise.all([
      this.prisma.tarea.findFirst({ where: { id: excluirId ? { not: excluirId } : undefined, aulaId: d.aulaId, estado: { in: [EstadoTarea.PENDIENTE, EstadoTarea.EN_PROCESO] }, inicio: { lt: fin }, OR: [{ fin: null }, { fin: { gt: inicio } }] } }),
      this.prisma.prestamoDocente.findFirst({ where: { aulaId: d.aulaId, inicio: { lt: fin }, fin: { gt: inicio }, estado: { notIn: ['CANCELADO'] } } }),
      this.prisma.practicaLibre.findFirst({ where: { aulaId: d.aulaId, inicio: { lt: fin }, OR: [{ finReal: null }, { finReal: { gt: inicio } }], estado: 'ACTIVO' } }),
      this.prisma.claseProgramada.findFirst({ where: { aulaId: d.aulaId, diaSemana, horaInicio: { lt: horaFin }, horaFin: { gt: horaInicio } } }),
    ]);
    if (tarea || prestamo || practica || clase) throw new ConflictException('No se puede programar la tarea: el aula tiene una clase, préstamo o actividad en el rango seleccionado.');
  }
}
