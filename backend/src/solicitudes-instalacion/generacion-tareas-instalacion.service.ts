import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoTarea, Prisma, PrioridadTarea } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TareasOperativasService } from '../tareas-operativas/tareas-operativas.service';
import { AprobarSolicitudInstalacionDto } from './dto/aprobar-solicitud-instalacion.dto';

const includeParaAprobacion = {
  docente: true,
  proyectoCurricular: true,
  items: {
    include: {
      asignatura: true,
      aulas: { include: { aula: true } },
      softwareSolicitado: {
        include: {
          software: true,
          tareasGeneradas: { include: { tarea: true, itemAula: true } },
        },
      },
    },
  },
};

type SolicitudAprobacion = Prisma.SolicitudInstalacionGetPayload<{
  include: typeof includeParaAprobacion;
}>;

type ParAprobacion = {
  item: SolicitudAprobacion['items'][number];
  programa: SolicitudAprobacion['items'][number]['softwareSolicitado'][number];
  aula: SolicitudAprobacion['items'][number]['aulas'][number];
};

@Injectable()
export class GeneracionTareasInstalacionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tareas: TareasOperativasService,
  ) {}

  async previsualizar(id: string, dto: AprobarSolicitudInstalacionDto) {
    const solicitud = await this.obtenerSolicitud(id);
    const seleccion = this.validarSeleccion(solicitud, dto);
    return {
      solicitudId: solicitud.id,
      aprobacion: this.esAprobacionTotal(solicitud, seleccion)
        ? 'TOTAL'
        : 'PARCIAL',
      tareas: seleccion.map(({ item, programa, aula }) => {
        const existente = programa.tareasGeneradas.find(
          (relacion) => relacion.itemAulaId === aula.id,
        );
        return {
          softwareSolicitadoId: programa.id,
          itemAulaId: aula.id,
          titulo: this.titulo(programa),
          software:
            programa.software?.nombre ??
            programa.nombreNormalizado ??
            programa.nombreOriginal,
          version: programa.software?.version ?? programa.versionNormalizada,
          aula:
            aula.aula?.codigo ?? aula.valorNormalizado ?? aula.valorOriginal,
          asignatura: item.asignatura?.nombre ?? item.asignaturaOriginal,
          yaExiste: Boolean(existente),
          tareaId: existente?.tareaId ?? null,
        };
      }),
    };
  }

  async aprobar(
    id: string,
    dto: AprobarSolicitudInstalacionDto,
    usuarioId?: string,
  ) {
    const solicitud = await this.obtenerSolicitud(id);
    const seleccion = this.validarSeleccion(solicitud, dto);
    const aprobacionTotal = this.esAprobacionTotal(solicitud, seleccion);

    return this.prisma.$transaction(
      async (tx) => {
        const creadas: Array<{
          tareaId: string;
          softwareSolicitadoId: string;
          itemAulaId: string;
        }> = [];
        const existentes: Array<{
          tareaId: string;
          softwareSolicitadoId: string;
          itemAulaId: string;
        }> = [];
        const grupos = new Map<string, string>();
        for (const par of seleccion) {
          const llave = {
            softwareSolicitadoId_itemAulaId: {
              softwareSolicitadoId: par.programa.id,
              itemAulaId: par.aula.id,
            },
          };
          const existente = await tx.solicitudSoftwareTarea.findUnique({
            where: llave,
            select: { tareaId: true },
          });
          if (existente) {
            existentes.push({
              tareaId: existente.tareaId,
              softwareSolicitadoId: par.programa.id,
              itemAulaId: par.aula.id,
            });
            continue;
          }
          const paresPrograma = seleccion.filter(
            (actual) => actual.programa.id === par.programa.id,
          );
          if (paresPrograma.length > 1 && !grupos.has(par.programa.id))
            grupos.set(par.programa.id, randomUUID());
          const tarea = await this.tareas.crearDesdeIntegracion(
            tx,
            {
              aulaId: par.aula.aulaId!,
              grupoId: grupos.get(par.programa.id),
              titulo: this.titulo(par.programa),
              descripcion: this.descripcion(solicitud, par),
              observaciones:
                par.item.observaciones ??
                solicitud.observacionGeneral ??
                undefined,
              tipo: 'INSTALACION_SOFTWARE',
              prioridad: PrioridadTarea.MEDIA,
              afectaDisponibilidad: false,
            },
            usuarioId,
          );
          await tx.solicitudSoftwareTarea.create({
            data: {
              softwareSolicitadoId: par.programa.id,
              itemAulaId: par.aula.id,
              tareaId: tarea.id,
            },
          });
          creadas.push({
            tareaId: tarea.id,
            softwareSolicitadoId: par.programa.id,
            itemAulaId: par.aula.id,
          });
        }

        const estado = aprobacionTotal ? 'APROBADA' : 'APROBADA_PARCIAL';
        await tx.solicitudInstalacion.update({
          where: { id },
          data: {
            estado,
            aprobadaEn: new Date(),
            revisadaEn: new Date(),
            revisadaPorId: usuarioId ?? null,
            motivoRechazo: null,
            rechazadaEn: null,
          },
        });
        await tx.auditoria.create({
          data: {
            usuarioId: usuarioId ?? null,
            entidad: 'SolicitudInstalacion',
            entidadId: id,
            accion: 'APPROVE',
            datosPrevios: { estado: solicitud.estado },
            datosNuevos: {
              estado,
              aprobacion: aprobacionTotal ? 'TOTAL' : 'PARCIAL',
              tareasCreadas: creadas.map((item) => item.tareaId),
              tareasExistentes: existentes.map((item) => item.tareaId),
            },
          },
        });
        return {
          aprobacion: aprobacionTotal ? 'TOTAL' : 'PARCIAL',
          creadas,
          existentes,
        };
      },
      { maxWait: 30_000, timeout: 60_000 },
    );
  }

  async confirmarInventario(
    solicitudId: string,
    tareaId: string,
    usuarioId?: string,
  ) {
    const relacion = await this.prisma.solicitudSoftwareTarea.findFirst({
      where: {
        tareaId,
        softwareSolicitado: { item: { solicitudId } },
      },
      include: {
        tarea: true,
        itemAula: true,
        softwareSolicitado: true,
      },
    });
    if (!relacion)
      throw new NotFoundException('La tarea no pertenece a esta solicitud.');
    if (relacion.inventarioConfirmadoEn) return relacion;
    if (relacion.tarea.estado !== EstadoTarea.COMPLETADA)
      throw new ConflictException(
        'La instalación solo puede confirmarse cuando la tarea esté completada.',
      );
    if (!relacion.itemAula.aulaId || !relacion.softwareSolicitado.softwareId)
      throw new ConflictException(
        'La tarea no tiene aula o software normalizado para actualizar el inventario.',
      );
    return this.prisma.$transaction(async (tx) => {
      await tx.aulaSoftware.upsert({
        where: {
          aulaId_softwareId: {
            aulaId: relacion.itemAula.aulaId!,
            softwareId: relacion.softwareSolicitado.softwareId!,
          },
        },
        create: {
          aulaId: relacion.itemAula.aulaId!,
          softwareId: relacion.softwareSolicitado.softwareId!,
        },
        update: {},
      });
      const confirmada = await tx.solicitudSoftwareTarea.update({
        where: { tareaId },
        data: {
          inventarioConfirmadoEn: new Date(),
          inventarioConfirmadoPorId: usuarioId ?? null,
        },
        include: { tarea: true, itemAula: true, softwareSolicitado: true },
      });
      await tx.auditoria.create({
        data: {
          usuarioId: usuarioId ?? null,
          entidad: 'SolicitudSoftwareTarea',
          entidadId: tareaId,
          accion: 'CONFIRM_INVENTORY',
          datosNuevos: {
            solicitudId,
            aulaId: relacion.itemAula.aulaId,
            softwareId: relacion.softwareSolicitado.softwareId,
          },
        },
      });
      return confirmada;
    });
  }

  private obtenerSolicitud(id: string) {
    return this.prisma.solicitudInstalacion
      .findUnique({ where: { id }, include: includeParaAprobacion })
      .then((solicitud) => {
        if (!solicitud)
          throw new NotFoundException(
            'Solicitud de instalación no encontrada.',
          );
        if (['RECHAZADA', 'CANCELADA', 'FINALIZADA'].includes(solicitud.estado))
          throw new ConflictException(
            `La solicitud en estado ${solicitud.estado} no puede aprobarse.`,
          );
        return solicitud;
      });
  }

  private validarSeleccion(
    solicitud: SolicitudAprobacion,
    dto: AprobarSolicitudInstalacionDto,
  ): ParAprobacion[] {
    const resultado: ParAprobacion[] = [];
    const llaves = new Set<string>();
    for (const seleccionItem of dto.items) {
      const item = solicitud.items.find(
        (actual) => actual.id === seleccionItem.itemId,
      );
      if (!item)
        throw new BadRequestException(
          'Uno de los ítems seleccionados no pertenece a la solicitud.',
        );
      for (const seleccionSoftware of seleccionItem.software) {
        const programa = item.softwareSolicitado.find(
          (actual) => actual.id === seleccionSoftware.softwareSolicitadoId,
        );
        if (!programa)
          throw new BadRequestException(
            'Uno de los programas no pertenece al ítem seleccionado.',
          );
        for (const aulaSolicitudId of seleccionSoftware.aulaIds) {
          const aula = item.aulas.find(
            (actual) => actual.id === aulaSolicitudId,
          );
          if (!aula)
            throw new BadRequestException(
              'Una de las aulas no pertenece al ítem seleccionado.',
            );
          if (!aula.aulaId || aula.estado === 'AMBIGUO')
            throw new ConflictException(
              `Debe normalizar el aula "${aula.valorOriginal}" antes de aprobarla.`,
            );
          const llave = `${programa.id}:${aula.id}`;
          if (!llaves.has(llave)) {
            llaves.add(llave);
            resultado.push({ item, programa, aula });
          }
        }
      }
    }
    if (!resultado.length)
      throw new BadRequestException(
        'Debe seleccionar al menos una instalación.',
      );
    return resultado;
  }

  private esAprobacionTotal(
    solicitud: SolicitudAprobacion,
    seleccion: ParAprobacion[],
  ) {
    const totalPosibles = solicitud.items.reduce((total, item) => {
      const programas = item.softwareSolicitado.filter(
        (programa) => programa.estado !== 'DESCARTADO',
      ).length;
      const aulas = item.aulas.filter(
        (aula) => aula.estado !== 'DESCARTADO',
      ).length;
      return total + programas * aulas;
    }, 0);
    return totalPosibles > 0 && seleccion.length === totalPosibles;
  }

  private titulo(
    programa: SolicitudAprobacion['items'][number]['softwareSolicitado'][number],
  ) {
    const nombre = programa.nombreOriginal;
    const version = programa.versionOriginal ?? programa.versionNormalizada;
    return `Instalar ${nombre}${version ? ` ${version}` : ''}`.slice(0, 200);
  }

  private descripcion(solicitud: SolicitudAprobacion, par: ParAprobacion) {
    return [
      `Solicitud de instalación ${solicitud.id}.`,
      `Docente: ${solicitud.docente?.nombre ?? solicitud.docenteNombreOriginal ?? 'Sin relacionar'}.`,
      `Proyecto curricular: ${solicitud.proyectoCurricularOriginal ?? 'Sin información'}.`,
      `Asignatura: ${par.item.asignaturaOriginal ?? 'Sin información'}.`,
      `Software original: ${par.programa.nombreOriginal}.`,
      `Aula original: ${par.aula.valorOriginal}.`,
    ].join('\n');
  }
}
