import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoSolicitudInstalacion, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FindImportacionesSolicitudesDto } from './dto/find-importaciones-solicitudes.dto';
import { FindSolicitudesInstalacionDto } from './dto/find-solicitudes-instalacion.dto';
import {
  UpdateItemSolicitudDto,
  UpdateSolicitudInstalacionDto,
} from './dto/update-solicitud-instalacion.dto';
import { normalizarClave } from './normalizacion-solicitudes.service';

const ESTADOS_ABIERTOS: EstadoSolicitudInstalacion[] = [
  'PENDIENTE_REVISION',
  'REQUIERE_AJUSTES',
  'APROBADA_PARCIAL',
  'APROBADA',
  'EN_EJECUCION',
];
const ESTADOS_TERMINALES: EstadoSolicitudInstalacion[] = [
  'FINALIZADA',
  'RECHAZADA',
  'CANCELADA',
];

const includeSolicitud = {
  periodo: true,
  docente: true,
  proyectoCurricular: true,
  importacion: { select: { id: true, nombreArchivo: true, creadoEn: true } },
  items: {
    orderBy: { posicion: 'asc' as const },
    include: {
      asignatura: true,
      aulas: { orderBy: { posicion: 'asc' as const }, include: { aula: true } },
      softwareSolicitado: {
        orderBy: { posicion: 'asc' as const },
        include: {
          software: true,
          tareasGeneradas: { include: { tarea: true } },
        },
      },
    },
  },
};

@Injectable()
export class SolicitudesInstalacionService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filtros: FindSolicitudesInstalacionDto) {
    const pagina = filtros.pagina ?? 1;
    const limite = filtros.limite ?? 25;
    const where = this.crearFiltros(filtros);
    const direccion = filtros.direccion ?? 'desc';
    const orderBy: Prisma.SolicitudInstalacionOrderByWithRelationInput =
      filtros.orden === 'docente'
        ? { docenteNombreOriginal: direccion }
        : filtros.orden === 'estado'
          ? { estado: direccion }
          : { fechaPeticion: direccion };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.solicitudInstalacion.findMany({
        where,
        include: includeSolicitud,
        orderBy,
        skip: (pagina - 1) * limite,
        take: limite,
      }),
      this.prisma.solicitudInstalacion.count({ where }),
    ]);

    return {
      data: data.map((solicitud) => this.conProgreso(solicitud)),
      meta: { pagina, limite, total, totalPaginas: Math.ceil(total / limite) },
    };
  }

  async findOne(id: string) {
    const solicitud = await this.prisma.solicitudInstalacion.findUnique({
      where: { id },
      include: {
        ...includeSolicitud,
        revisadaPor: {
          select: { id: true, nombreCompleto: true, nombreUsuario: true },
        },
      },
    });
    if (!solicitud)
      throw new NotFoundException('Solicitud de instalación no encontrada.');
    return this.conProgreso(solicitud);
  }

  async findTareas(id: string) {
    await this.findOne(id);
    const relaciones = await this.prisma.solicitudSoftwareTarea.findMany({
      where: { softwareSolicitado: { item: { solicitudId: id } } },
      include: {
        tarea: { include: { aula: true, responsable: true } },
        itemAula: { include: { aula: true } },
        softwareSolicitado: { include: { software: true } },
        inventarioConfirmadoPor: {
          select: { id: true, nombreCompleto: true },
        },
      },
      orderBy: { creadaEn: 'asc' },
    });
    return {
      data: relaciones,
      progreso: this.calcularProgreso(relaciones),
    };
  }

  async rechazar(id: string, motivo: string, usuarioId?: string) {
    const solicitud = await this.prisma.solicitudInstalacion.findUnique({
      where: { id },
      include: {
        items: {
          select: {
            softwareSolicitado: {
              select: { _count: { select: { tareasGeneradas: true } } },
            },
          },
        },
      },
    });
    if (!solicitud)
      throw new NotFoundException('Solicitud de instalación no encontrada.');
    if (['FINALIZADA', 'CANCELADA', 'RECHAZADA'].includes(solicitud.estado))
      throw new BadRequestException(
        `La solicitud en estado ${solicitud.estado} no puede rechazarse.`,
      );
    const tieneTareas = solicitud.items.some((item) =>
      item.softwareSolicitado.some(
        (programa) => programa._count.tareasGeneradas > 0,
      ),
    );
    if (tieneTareas)
      throw new BadRequestException(
        'La solicitud ya tiene tareas operativas. Cancele primero las tareas desde su módulo.',
      );
    const motivoLimpio = motivo.trim();
    return this.prisma.$transaction(async (tx) => {
      const rechazada = await tx.solicitudInstalacion.update({
        where: { id },
        data: {
          estado: 'RECHAZADA',
          motivoRechazo: motivoLimpio,
          rechazadaEn: new Date(),
          revisadaEn: new Date(),
          revisadaPorId: usuarioId ?? null,
        },
      });
      await tx.auditoria.create({
        data: {
          usuarioId: usuarioId ?? null,
          entidad: 'SolicitudInstalacion',
          entidadId: id,
          accion: 'REJECT',
          datosPrevios: { estado: solicitud.estado },
          datosNuevos: { estado: 'RECHAZADA', motivo: motivoLimpio },
        },
      });
      return rechazada;
    });
  }

  async findCatalogos() {
    const [docentes, aulas, periodos] = await Promise.all([
      this.prisma.docente.findMany({ orderBy: { nombre: 'asc' } }),
      this.prisma.aula.findMany({
        where: { eliminadoEn: null },
        orderBy: { codigo: 'asc' },
        select: { id: true, codigo: true, ubicacion: true },
      }),
      this.prisma.periodoAcademico.findMany({
        orderBy: { fechaInicio: 'desc' },
      }),
    ]);
    return {
      docentes,
      proyectosCurriculares: [],
      asignaturas: [],
      aulas,
      software: [],
      periodos,
    };
  }

  async updateSolicitud(
    id: string,
    dto: UpdateSolicitudInstalacionDto,
    usuarioId?: string,
  ) {
    const previa = await this.findOne(id);
    const actualizada = await this.prisma.solicitudInstalacion.update({
      where: { id },
      data: {
        ...(dto.docenteId !== undefined && { docenteId: dto.docenteId }),
        proyectoCurricularId: null,
        ...(dto.periodoId !== undefined && { periodoId: dto.periodoId }),
        consentimientoDatos: true,
        revisadaPorId: usuarioId ?? null,
        revisadaEn: new Date(),
      },
    });
    await this.prisma.auditoria.create({
      data: {
        usuarioId: usuarioId ?? null,
        entidad: 'SolicitudInstalacion',
        entidadId: id,
        accion: 'UPDATE_NORMALIZACION',
        datosPrevios: {
          docenteId: previa.docenteId,
          proyectoCurricularId: previa.proyectoCurricularId,
          periodoId: previa.periodoId,
          consentimientoDatos: previa.consentimientoDatos,
        },
        datosNuevos: dto as unknown as Prisma.InputJsonValue,
      },
    });
    return actualizada;
  }

  async updateItem(
    solicitudId: string,
    itemId: string,
    dto: UpdateItemSolicitudDto,
    usuarioId?: string,
  ) {
    const item = await this.prisma.itemSolicitudInstalacion.findFirst({
      where: { id: itemId, solicitudId },
      include: { aulas: true, softwareSolicitado: true },
    });
    if (!item) throw new NotFoundException('Ítem de solicitud no encontrado.');
    const aulasPermitidas = new Map(item.aulas.map((aula) => [aula.id, aula]));
    if (dto.aulas?.some((aula) => !aulasPermitidas.has(aula.id)))
      throw new BadRequestException('Una de las aulas no pertenece al ítem.');

    await this.prisma.$transaction(async (tx) => {
      await tx.itemSolicitudInstalacion.update({
        where: { id: itemId },
        data: {
          asignaturaId: null,
          ...(dto.estadoRevision !== undefined && {
            estadoRevision: dto.estadoRevision,
          }),
        },
      });
      for (const aula of dto.aulas ?? []) {
        const original = aulasPermitidas.get(aula.id)!;
        await tx.itemSolicitudAula.update({
          where: { id: aula.id },
          data: {
            ...(aula.aulaId !== undefined && { aulaId: aula.aulaId }),
            ...(aula.valorNormalizado !== undefined && {
              valorNormalizado: aula.valorNormalizado,
            }),
            ...(aula.estado !== undefined && { estado: aula.estado }),
          },
        });
        if (aula.guardarAlias && aula.aulaId) {
          const aliasNormalizado = normalizarClave(
            original.valorOriginal,
          ).replace(/^AULA\s+/, '');
          await tx.aliasAula.upsert({
            where: { aliasNormalizado },
            create: {
              alias: original.valorOriginal,
              aliasNormalizado,
              aulaId: aula.aulaId,
            },
            update: { aulaId: aula.aulaId, activo: true },
          });
        }
      }
      await tx.softwareSolicitado.updateMany({
        where: { itemId },
        data: {
          softwareId: null,
          versionNormalizada: null,
          estado: 'NUEVO',
          revisadoPorId: usuarioId ?? null,
          revisadoEn: new Date(),
        },
      });
      await tx.solicitudInstalacion.update({
        where: { id: solicitudId },
        data: { revisadaPorId: usuarioId ?? null, revisadaEn: new Date() },
      });
      await tx.auditoria.create({
        data: {
          usuarioId: usuarioId ?? null,
          entidad: 'ItemSolicitudInstalacion',
          entidadId: itemId,
          accion: 'UPDATE_NORMALIZACION',
          datosPrevios: {
            asignaturaId: item.asignaturaId,
            estadoRevision: item.estadoRevision,
            aulas: item.aulas.map((aula) => ({
              id: aula.id,
              aulaId: aula.aulaId,
              valorNormalizado: aula.valorNormalizado,
              estado: aula.estado,
            })),
            software: item.softwareSolicitado.map((programa) => ({
              id: programa.id,
              softwareId: programa.softwareId,
              nombreNormalizado: programa.nombreNormalizado,
              versionNormalizada: programa.versionNormalizada,
              estado: programa.estado,
            })),
          },
          datosNuevos: dto as unknown as Prisma.InputJsonValue,
        },
      });
    });
    return this.findOne(solicitudId);
  }

  async findImportaciones(filtros: FindImportacionesSolicitudesDto) {
    const pagina = filtros.pagina ?? 1;
    const limite = filtros.limite ?? 25;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.importacionSolicitudInstalacion.findMany({
        include: {
          usuario: {
            select: { id: true, nombreCompleto: true, nombreUsuario: true },
          },
          _count: { select: { solicitudes: true } },
        },
        orderBy: { creadoEn: 'desc' },
        skip: (pagina - 1) * limite,
        take: limite,
      }),
      this.prisma.importacionSolicitudInstalacion.count(),
    ]);
    return {
      data,
      meta: { pagina, limite, total, totalPaginas: Math.ceil(total / limite) },
    };
  }

  async findImportacion(id: string) {
    const importacion =
      await this.prisma.importacionSolicitudInstalacion.findUnique({
        where: { id },
        include: {
          usuario: {
            select: { id: true, nombreCompleto: true, nombreUsuario: true },
          },
          _count: { select: { solicitudes: true } },
        },
      });
    if (!importacion)
      throw new NotFoundException('Importación de solicitudes no encontrada.');
    return importacion;
  }

  async exportarSolicitudes(
    filtros: FindSolicitudesInstalacionDto,
    usuarioId?: string,
  ) {
    const solicitudes = await this.prisma.solicitudInstalacion.findMany({
      where: this.crearFiltros(filtros),
      include: includeSolicitud,
      orderBy: { fechaPeticion: filtros.direccion ?? 'desc' },
    });
    const filas: string[][] = [
      [
        'Fecha de petición',
        'Estado de solicitud',
        'Docente',
        'Correo institucional',
        'Proyecto curricular',
        'Periodo',
        'Asignatura',
        'Aula original',
        'Aula normalizada',
        'Software original',
        'Software normalizado',
        'Versión',
        'Estado de tarea',
        'Inventario confirmado',
      ],
    ];
    for (const solicitud of solicitudes) {
      for (const item of solicitud.items) {
        for (const programa of item.softwareSolicitado) {
          const aulas = item.aulas.length ? item.aulas : [null];
          for (const aula of aulas) {
            const relacion = programa.tareasGeneradas.find(
              (actual) => actual.itemAulaId === aula?.id,
            );
            filas.push([
              solicitud.fechaPeticion.toISOString(),
              solicitud.estado,
              solicitud.docente?.nombre ??
                solicitud.docenteNombreOriginal ??
                '',
              solicitud.docente?.correo ??
                solicitud.docenteCorreoOriginal ??
                '',
              solicitud.proyectoCurricular?.nombre ??
                solicitud.proyectoCurricularOriginal ??
                '',
              solicitud.periodo?.nombre ?? '',
              item.asignatura?.nombre ?? item.asignaturaOriginal ?? '',
              aula?.valorOriginal ?? '',
              aula?.aula?.codigo ?? aula?.valorNormalizado ?? '',
              programa.nombreOriginal,
              programa.software?.nombre ?? programa.nombreNormalizado ?? '',
              programa.software?.version ?? programa.versionNormalizada ?? '',
              relacion?.tarea.estado ?? '',
              relacion?.inventarioConfirmadoEn ? 'Sí' : 'No',
            ]);
          }
        }
      }
    }
    await this.registrarExportacion(
      usuarioId,
      'SolicitudesInstalacion',
      'FILTROS',
      {
        filtros: Object.fromEntries(
          Object.entries(filtros).filter(([, valor]) => valor !== undefined),
        ),
        registros: filas.length - 1,
      },
    );
    return this.aCsv(filas);
  }

  async exportarResultadoImportacion(id: string, usuarioId?: string) {
    const importacion =
      await this.prisma.importacionSolicitudInstalacion.findUnique({
        where: { id },
        include: {
          solicitudes: {
            orderBy: { filaOrigen: 'asc' },
            include: {
              docente: true,
              proyectoCurricular: true,
              items: {
                include: {
                  asignatura: true,
                  aulas: { include: { aula: true } },
                  softwareSolicitado: { include: { software: true } },
                },
              },
            },
          },
        },
      });
    if (!importacion)
      throw new NotFoundException('Importación de solicitudes no encontrada.');
    const filas: string[][] = [
      [
        'Tipo',
        'Fila',
        'Estado',
        'Docente',
        'Proyecto curricular',
        'Asignaturas',
        'Aulas',
        'Software',
        'Detalle',
      ],
    ];
    for (const solicitud of importacion.solicitudes) {
      filas.push([
        'SOLICITUD',
        String(solicitud.filaOrigen),
        solicitud.estado,
        solicitud.docente?.nombre ?? solicitud.docenteNombreOriginal ?? '',
        solicitud.proyectoCurricular?.nombre ??
          solicitud.proyectoCurricularOriginal ??
          '',
        solicitud.items
          .map(
            (item) => item.asignatura?.nombre ?? item.asignaturaOriginal ?? '',
          )
          .filter(Boolean)
          .join(' | '),
        [
          ...new Set(
            solicitud.items.flatMap((item) =>
              item.aulas.map(
                (aula) =>
                  aula.aula?.codigo ??
                  aula.valorNormalizado ??
                  aula.valorOriginal,
              ),
            ),
          ),
        ].join(' | '),
        solicitud.items
          .flatMap((item) =>
            item.softwareSolicitado.map(
              (programa) =>
                programa.software?.nombre ??
                programa.nombreNormalizado ??
                programa.nombreOriginal,
            ),
          )
          .join(' | '),
        this.textoJson(solicitud.alertas),
      ]);
    }
    for (const error of this.erroresImportacion(importacion.errores)) {
      filas.push([
        'ERROR',
        this.textoValorJson(error.fila),
        'RECHAZADA',
        '',
        '',
        '',
        '',
        '',
        this.textoValorJson(
          error.mensaje ?? error.error ?? 'Error de importación',
        ),
      ]);
    }
    await this.registrarExportacion(
      usuarioId,
      'ImportacionSolicitudInstalacion',
      id,
      { nombreArchivo: importacion.nombreArchivo, registros: filas.length - 1 },
    );
    return this.aCsv(filas);
  }

  private crearFiltros(
    filtros: FindSolicitudesInstalacionDto,
  ): Prisma.SolicitudInstalacionWhereInput {
    const and: Prisma.SolicitudInstalacionWhereInput[] = [];
    const vista = filtros.vista ?? 'actuales';
    if (vista === 'actuales') {
      and.push({ historicaAlImportar: false });
      and.push({ estado: { in: ESTADOS_ABIERTOS } });
      and.push({
        OR: [{ periodoId: null }, { periodo: { is: { activo: true } } }],
      });
    } else if (vista === 'historial') {
      and.push({
        OR: [
          { historicaAlImportar: true },
          { estado: { in: ESTADOS_TERMINALES } },
          { periodo: { is: { activo: false } } },
        ],
      });
    }
    if (filtros.estado) and.push({ estado: filtros.estado });
    if (filtros.periodoId) and.push({ periodoId: filtros.periodoId });
    if (filtros.docenteId) and.push({ docenteId: filtros.docenteId });
    if (filtros.proyectoCurricularId)
      and.push({ proyectoCurricularId: filtros.proyectoCurricularId });
    if (filtros.desde || filtros.hasta) {
      and.push({
        fechaPeticion: {
          ...(filtros.desde && { gte: new Date(filtros.desde) }),
          ...(filtros.hasta && { lte: this.finDelDia(filtros.hasta) }),
        },
      });
    }
    if (filtros.docente)
      and.push({
        OR: [
          {
            docenteNombreOriginal: {
              contains: filtros.docente,
              mode: 'insensitive',
            },
          },
          {
            docenteCorreoOriginal: {
              contains: filtros.docente,
              mode: 'insensitive',
            },
          },
          {
            docente: {
              is: {
                nombre: { contains: filtros.docente, mode: 'insensitive' },
              },
            },
          },
        ],
      });
    if (filtros.proyectoCurricular)
      and.push({
        OR: [
          {
            proyectoCurricularOriginal: {
              contains: filtros.proyectoCurricular,
              mode: 'insensitive',
            },
          },
          {
            proyectoCurricular: {
              is: {
                nombre: {
                  contains: filtros.proyectoCurricular,
                  mode: 'insensitive',
                },
              },
            },
          },
        ],
      });
    if (filtros.aulaId || filtros.aula)
      and.push({
        items: {
          some: {
            aulas: {
              some: {
                ...(filtros.aulaId && { aulaId: filtros.aulaId }),
                ...(filtros.aula && {
                  OR: [
                    {
                      valorOriginal: {
                        contains: filtros.aula,
                        mode: 'insensitive',
                      },
                    },
                    {
                      valorNormalizado: {
                        contains: filtros.aula,
                        mode: 'insensitive',
                      },
                    },
                    {
                      aula: {
                        is: {
                          codigo: {
                            contains: filtros.aula,
                            mode: 'insensitive',
                          },
                        },
                      },
                    },
                  ],
                }),
              },
            },
          },
        },
      });
    if (filtros.asignaturaId || filtros.asignatura)
      and.push({
        items: {
          some: {
            ...(filtros.asignaturaId && { asignaturaId: filtros.asignaturaId }),
            ...(filtros.asignatura && {
              OR: [
                {
                  asignaturaOriginal: {
                    contains: filtros.asignatura,
                    mode: 'insensitive',
                  },
                },
                {
                  asignatura: {
                    is: {
                      nombre: {
                        contains: filtros.asignatura,
                        mode: 'insensitive',
                      },
                    },
                  },
                },
              ],
            }),
          },
        },
      });
    if (filtros.softwareId || filtros.software)
      and.push({
        items: {
          some: {
            softwareSolicitado: {
              some: {
                ...(filtros.softwareId && { softwareId: filtros.softwareId }),
                ...(filtros.software && {
                  OR: [
                    {
                      nombreOriginal: {
                        contains: filtros.software,
                        mode: 'insensitive',
                      },
                    },
                    {
                      nombreNormalizado: {
                        contains: filtros.software,
                        mode: 'insensitive',
                      },
                    },
                    {
                      software: {
                        is: {
                          nombre: {
                            contains: filtros.software,
                            mode: 'insensitive',
                          },
                        },
                      },
                    },
                  ],
                }),
              },
            },
          },
        },
      });
    if (filtros.q)
      and.push({
        OR: [
          {
            docenteNombreOriginal: { contains: filtros.q, mode: 'insensitive' },
          },
          {
            docenteCorreoOriginal: { contains: filtros.q, mode: 'insensitive' },
          },
          {
            proyectoCurricularOriginal: {
              contains: filtros.q,
              mode: 'insensitive',
            },
          },
          {
            items: {
              some: {
                asignaturaOriginal: {
                  contains: filtros.q,
                  mode: 'insensitive',
                },
              },
            },
          },
          {
            items: {
              some: {
                aulas: {
                  some: {
                    valorOriginal: { contains: filtros.q, mode: 'insensitive' },
                  },
                },
              },
            },
          },
          {
            items: {
              some: {
                softwareSolicitado: {
                  some: {
                    nombreOriginal: {
                      contains: filtros.q,
                      mode: 'insensitive',
                    },
                  },
                },
              },
            },
          },
        ],
      });
    return and.length ? { AND: and } : {};
  }

  private finDelDia(fecha: string): Date {
    const resultado = new Date(fecha);
    resultado.setUTCHours(23, 59, 59, 999);
    return resultado;
  }

  private aCsv(filas: string[][]) {
    const contenido = filas
      .map((fila) =>
        fila
          .map((valor) => `"${String(valor).replaceAll('"', '""')}"`)
          .join(';'),
      )
      .join('\r\n');
    return `\uFEFF${contenido}`;
  }

  private erroresImportacion(valor: Prisma.JsonValue | null) {
    if (!Array.isArray(valor)) return [];
    return valor.filter(
      (item): item is Prisma.JsonObject =>
        typeof item === 'object' && item !== null && !Array.isArray(item),
    );
  }

  private textoJson(valor: Prisma.JsonValue | null) {
    if (!valor) return '';
    if (Array.isArray(valor))
      return valor.map((item) => this.textoValorJson(item)).join(' | ');
    return typeof valor === 'string' ? valor : JSON.stringify(valor);
  }

  private textoValorJson(valor: Prisma.JsonValue | undefined) {
    if (valor === null || valor === undefined) return '';
    if (
      typeof valor === 'string' ||
      typeof valor === 'number' ||
      typeof valor === 'boolean'
    ) {
      return String(valor);
    }
    return JSON.stringify(valor);
  }

  private registrarExportacion(
    usuarioId: string | undefined,
    entidad: string,
    entidadId: string,
    datos: Prisma.InputJsonValue,
  ) {
    return this.prisma.auditoria.create({
      data: {
        usuarioId: usuarioId ?? null,
        entidad,
        entidadId,
        accion: 'EXPORT',
        datosNuevos: datos,
      },
    });
  }

  private conProgreso<
    T extends {
      items: Array<{
        softwareSolicitado: Array<{
          tareasGeneradas: Array<{ tarea: { estado: string } }>;
        }>;
      }>;
    },
  >(solicitud: T) {
    const relaciones = solicitud.items.flatMap((item) =>
      item.softwareSolicitado.flatMap((programa) => programa.tareasGeneradas),
    );
    return { ...solicitud, progresoTareas: this.calcularProgreso(relaciones) };
  }

  private calcularProgreso(
    relaciones: Array<{
      tarea: { estado: string };
      inventarioConfirmadoEn?: Date | null;
    }>,
  ) {
    const total = relaciones.length;
    const completadas = relaciones.filter(
      (relacion) => relacion.tarea.estado === 'COMPLETADA',
    ).length;
    const enProceso = relaciones.filter(
      (relacion) => relacion.tarea.estado === 'EN_PROCESO',
    ).length;
    const pendientes = relaciones.filter(
      (relacion) => relacion.tarea.estado === 'PENDIENTE',
    ).length;
    const canceladas = relaciones.filter((relacion) =>
      ['CANCELADA', 'RECHAZADA'].includes(relacion.tarea.estado),
    ).length;
    const inventarioConfirmado = relaciones.filter(
      (relacion) => relacion.inventarioConfirmadoEn,
    ).length;
    return {
      total,
      pendientes,
      enProceso,
      completadas,
      canceladas,
      inventarioConfirmado,
      porcentaje: total ? Math.round((completadas / total) * 100) : 0,
    };
  }
}
