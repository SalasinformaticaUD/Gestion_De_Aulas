import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoTarea } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateTareasOperativaDto } from './dto/create-tareas-operativa.dto';
import { FindTareasDto } from './dto/tareas.dto';
import { UpdateTareasOperativaDto } from './dto/update-tareas-operativa.dto';
@Injectable()
export class TareasOperativasService {
  constructor(
    private prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}
  async create(d: CreateTareasOperativaDto, usuarioId?: string) {
    this.validar(d);
    await this.referencias(d);
    const creada = await this.prisma.tarea.create({
      data: {
        ...d,
        inicio: d.inicio ? new Date(d.inicio) : undefined,
        fin: d.fin ? new Date(d.fin) : undefined,
      },
      include: { aula: true, responsable: true },
    });
    await this.auditoria.registrar({
      usuarioId,
      entidad: 'Tarea',
      entidadId: creada.id,
      accion: 'CREATE',
      datosNuevos: creada,
    });
    return creada;
  }
  findAll(f: FindTareasDto) {
    const fecha = f.fecha ? new Date(f.fecha) : undefined;
    return this.prisma.tarea.findMany({
      where: {
        ...(f.estado && { estado: f.estado }),
        ...(f.aulaId && { aulaId: f.aulaId }),
        ...(f.responsableId && { responsableId: f.responsableId }),
        ...(fecha && {
          AND: [
            {
              OR: [
                { inicio: null },
                { inicio: { lte: new Date(`${f.fecha}T23:59:59.999Z`) } },
              ],
            },
            { OR: [{ fin: null }, { fin: { gte: fecha } }] },
          ],
        }),
      },
      include: { aula: true, responsable: true },
      orderBy: { inicio: 'asc' },
    });
  }
  async findOne(id: string) {
    const t = await this.prisma.tarea.findUnique({
      where: { id },
      include: { aula: true, responsable: true },
    });
    if (!t) throw new NotFoundException('La tarea no existe.');
    return t;
  }
  async update(id: string, d: UpdateTareasOperativaDto, usuarioId?: string) {
    const actual = await this.findOne(id);
    this.validar({
      ...d,
      aulaId: d.aulaId ?? actual.aulaId ?? undefined,
      afectaDisponibilidad:
        d.afectaDisponibilidad ?? actual.afectaDisponibilidad,
      inicio: d.inicio ?? actual.inicio?.toISOString(),
      fin: d.fin ?? actual.fin?.toISOString(),
    });
    await this.referencias(d);
    const actualizada = await this.prisma.tarea.update({
      where: { id },
      data: {
        ...(d.titulo !== undefined && { titulo: d.titulo }),
        ...(d.descripcion !== undefined && { descripcion: d.descripcion }),
        ...(d.aulaId !== undefined && { aulaId: d.aulaId }),
        ...(d.responsableId !== undefined && {
          responsableId: d.responsableId,
        }),
        ...(d.afectaDisponibilidad !== undefined && {
          afectaDisponibilidad: d.afectaDisponibilidad,
        }),
        inicio: d.inicio ? new Date(d.inicio) : undefined,
        fin: d.fin ? new Date(d.fin) : undefined,
      },
      include: { aula: true, responsable: true },
    });
    await this.auditoria.registrar({
      usuarioId,
      entidad: 'Tarea',
      entidadId: id,
      accion: 'UPDATE',
      datosPrevios: actual,
      datosNuevos: actualizada,
    });
    return actualizada;
  }
  async cambiarEstado(
    id: string,
    estado: EstadoTarea,
    usuarioId?: string,
    puedeAdministrar = false,
  ) {
    const t = await this.findOne(id);
    if (t.estado === EstadoTarea.CANCELADA)
      throw new ConflictException(
        'Una tarea cancelada no puede cambiar de estado.',
      );
    if (
      t.estado === EstadoTarea.COMPLETADA &&
      estado === EstadoTarea.CANCELADA &&
      !puedeAdministrar
    )
      throw new ConflictException(
        'Solo un administrador puede cancelar una tarea completada.',
      );
    if (
      t.estado === EstadoTarea.COMPLETADA &&
      estado !== EstadoTarea.COMPLETADA &&
      estado !== EstadoTarea.CANCELADA
    )
      throw new ConflictException('Una tarea completada no puede reabrirse.');
    const actualizada = await this.prisma.tarea.update({
      where: { id },
      data: { estado },
      include: { aula: true, responsable: true },
    });
    await this.auditoria.registrar({
      usuarioId,
      entidad: 'Tarea',
      entidadId: id,
      accion: estado === EstadoTarea.CANCELADA ? 'CANCEL' : 'UPDATE',
      datosPrevios: t,
      datosNuevos: actualizada,
    });
    return actualizada;
  }
  findTareasQueAfectanDisponibilidad(aulaId: string, inicio: Date, fin: Date) {
    return this.prisma.tarea.findMany({
      where: {
        aulaId,
        afectaDisponibilidad: true,
        estado: { in: [EstadoTarea.PENDIENTE, EstadoTarea.EN_PROCESO] },
        AND: [
          { OR: [{ inicio: null }, { inicio: { lt: fin } }] },
          { OR: [{ fin: null }, { fin: { gt: inicio } }] },
        ],
      },
    });
  }
  private validar(d: Partial<CreateTareasOperativaDto>) {
    if (d.afectaDisponibilidad && (!d.aulaId || !d.inicio || !d.fin))
      throw new BadRequestException(
        'Una tarea que afecta disponibilidad requiere aula, inicio y fin.',
      );
    if (d.inicio && d.fin && new Date(d.fin) <= new Date(d.inicio))
      throw new BadRequestException('fin debe ser posterior a inicio.');
  }
  private async referencias(d: Partial<CreateTareasOperativaDto>) {
    if (
      d.aulaId &&
      !(await this.prisma.aula.findUnique({
        where: { id: d.aulaId },
        select: { id: true },
      }))
    )
      throw new NotFoundException('El aula no existe.');
    if (
      d.responsableId &&
      !(await this.prisma.usuario.findUnique({
        where: { id: d.responsableId },
        select: { id: true },
      }))
    )
      throw new NotFoundException('El responsable no existe.');
  }
}
