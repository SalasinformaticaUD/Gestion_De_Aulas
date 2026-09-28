import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { leerSolicitudesExcel } from './solicitudes-instalacion-excel.parser';
import {
  NormalizacionSolicitudesService,
  SolicitudNormalizada,
} from './normalizacion-solicitudes.service';

type ArchivoExcel = { buffer: Buffer; originalname: string; mimetype?: string };

@Injectable()
export class ImportacionSolicitudesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly normalizacion: NormalizacionSolicitudesService,
  ) {}

  async previsualizarExcel(archivo: ArchivoExcel | undefined) {
    this.validarArchivo(archivo);
    const hashArchivo = createHash('sha256')
      .update(archivo.buffer)
      .digest('hex');
    const importacionExistente =
      await this.prisma.importacionSolicitudInstalacion.findUnique({
        where: { hashArchivo },
        select: { id: true, creadoEn: true, estado: true },
      });
    const lectura = this.leerArchivo(archivo.buffer);
    const resultado = await this.normalizacion.normalizar(lectura);
    return {
      hashArchivo,
      nombreArchivo: archivo.originalname,
      importacionExistente,
      resumen: resultado.resumen,
      errores: resultado.errores,
      solicitudes: resultado.solicitudesNormalizadas.map((solicitud) => ({
        filaOrigen: solicitud.filaOrigen,
        identificadorOrigen: solicitud.identificadorOrigen,
        fechaPeticion: solicitud.fechaPeticion,
        docenteOriginal: solicitud.docenteNombreOriginal,
        docenteId: solicitud.docenteId,
        proyectoOriginal: solicitud.proyectoCurricularOriginal,
        proyectoCurricularId: solicitud.proyectoCurricularId,
        periodoId: solicitud.periodoId,
        historicaAlImportar: solicitud.historicaAlImportar,
        motivoHistorialInicial: solicitud.motivoHistorialInicial,
        alertas: solicitud.alertas,
        duplicados: solicitud.duplicados,
        items: solicitud.itemsNormalizados,
      })),
    };
  }

  async importarExcel(archivo: ArchivoExcel | undefined, usuarioId?: string) {
    this.validarArchivo(archivo);
    const archivoValido = archivo;
    const hashArchivo = createHash('sha256')
      .update(archivoValido.buffer)
      .digest('hex');
    const existente =
      await this.prisma.importacionSolicitudInstalacion.findUnique({
        where: { hashArchivo },
        select: { id: true, creadoEn: true, estado: true },
      });
    if (existente) {
      throw new ConflictException({
        message: 'Este archivo ya fue importado.',
        importacion: existente,
      });
    }

    const lectura = this.leerArchivo(archivoValido.buffer);

    if (!lectura.solicitudes.length) {
      throw new BadRequestException({
        message: 'El archivo no contiene solicitudes válidas.',
        errores: lectura.errores,
      });
    }

    const normalizacion = await this.normalizacion.normalizar(lectura);
    const duplicadas = normalizacion.solicitudesNormalizadas.filter(
      (solicitud) => solicitud.duplicados.length,
    ).length;
    const solicitudesNuevas = normalizacion.solicitudesNormalizadas.filter(
      (solicitud) => !solicitud.duplicados.length,
    );
    const observadas = solicitudesNuevas.filter(
      (solicitud) => solicitud.alertas.length,
    ).length;
    const estado =
      lectura.errores.length || observadas || duplicadas
        ? 'PARCIAL'
        : 'COMPLETA';

    return this.prisma.$transaction(
      async (tx) => {
        const importacion = await tx.importacionSolicitudInstalacion.create({
          data: {
            usuarioId: usuarioId ?? null,
            nombreArchivo: archivoValido.originalname,
            hashArchivo,
            estado,
            totalFilas: lectura.totalFilas,
            solicitudesCreadas: solicitudesNuevas.length,
            filasDuplicadas: duplicadas,
            filasObservadas: observadas,
            filasRechazadas: lectura.errores.length,
            errores: lectura.errores,
            finalizadoEn: new Date(),
          },
        });

        for (const solicitud of solicitudesNuevas) {
          await tx.solicitudInstalacion.create({
            data: this.datosSolicitud(importacion.id, solicitud),
          });
        }

        await tx.auditoria.create({
          data: {
            usuarioId: usuarioId ?? null,
            entidad: 'ImportacionSolicitudInstalacion',
            entidadId: importacion.id,
            accion: 'CREATE',
            datosNuevos: {
              nombreArchivo: importacion.nombreArchivo,
              totalFilas: importacion.totalFilas,
              solicitudesCreadas: importacion.solicitudesCreadas,
              filasObservadas: importacion.filasObservadas,
              filasRechazadas: importacion.filasRechazadas,
              estado: importacion.estado,
            },
          },
        });

        return {
          importacion,
          resumen: {
            totalFilas: lectura.totalFilas,
            solicitudesCreadas: solicitudesNuevas.length,
            filasDuplicadas: duplicadas,
            filasObservadas: observadas,
            filasRechazadas: lectura.errores.length,
          },
          errores: lectura.errores,
        };
      },
      { maxWait: 30_000, timeout: 180_000 },
    );
  }

  private datosSolicitud(
    importacionId: string,
    solicitud: SolicitudNormalizada,
  ): Prisma.SolicitudInstalacionCreateInput {
    return {
      importacion: { connect: { id: importacionId } },
      hashContenido: solicitud.hashContenido,
      identificadorOrigen: solicitud.identificadorOrigen,
      filaOrigen: solicitud.filaOrigen,
      fechaInicioFormulario: solicitud.fechaInicioFormulario,
      fechaPeticion: solicitud.fechaPeticion,
      correoRespondienteOriginal: solicitud.correoRespondienteOriginal,
      nombreRespondienteOriginal: solicitud.nombreRespondienteOriginal,
      docenteNombreOriginal: solicitud.docenteNombreOriginal,
      docenteCorreoOriginal: solicitud.docenteCorreoOriginal,
      proyectoCurricularOriginal:
        solicitud.proyectoCurricularOriginal?.toLocaleUpperCase('es-CO') ??
        null,
      observacionGeneral: solicitud.observacionGeneral,
      consentimientoDatos: solicitud.consentimientoDatos,
      historicaAlImportar: solicitud.historicaAlImportar,
      motivoHistorialInicial: solicitud.motivoHistorialInicial,
      estado: solicitud.alertas.length
        ? 'REQUIERE_AJUSTES'
        : 'PENDIENTE_REVISION',
      ...(solicitud.docenteId && {
        docente: { connect: { id: solicitud.docenteId } },
      }),
      ...(solicitud.periodoId && {
        periodo: { connect: { id: solicitud.periodoId } },
      }),
      ...(solicitud.alertas.length && {
        alertas: solicitud.alertas,
      }),
      datosOriginales: solicitud.datosOriginales as Prisma.InputJsonValue,
      items: {
        create: solicitud.items.map((item) => {
          const normalizado = solicitud.itemsNormalizados.find(
            (actual) => actual.posicion === item.posicion,
          );
          return {
            posicion: item.posicion,
            asignaturaOriginal: item.asignaturaOriginal,
            observaciones: item.observaciones,
            estadoRevision: item.alertas.length
              ? 'REQUIERE_AJUSTES'
              : 'PENDIENTE',
            ...(item.alertas.length && {
              alertas: item.alertas,
            }),
            datosOriginales: item.datosOriginales as Prisma.InputJsonValue,
            aulas: {
              create:
                normalizado?.aulas.map((aula) => ({
                  posicion: aula.posicion,
                  valorOriginal: aula.valorOriginal,
                  valorNormalizado: aula.valorNormalizado,
                  estado: aula.estado,
                  ...(aula.aulaId && {
                    aula: { connect: { id: aula.aulaId } },
                  }),
                })) ?? [],
            },
            softwareSolicitado: {
              create:
                normalizado?.software.map((programa) => ({
                  posicion: programa.posicion,
                  nombreOriginal: programa.nombreOriginal,
                  nombreNormalizado: programa.nombreNormalizado,
                  versionNormalizada: programa.versionNormalizada,
                  estado: programa.estado,
                })) ?? [],
            },
          };
        }),
      },
    };
  }

  private leerArchivo(buffer: Buffer) {
    try {
      return leerSolicitudesExcel(buffer);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : 'No fue posible leer el archivo Excel.',
      );
    }
  }

  private validarArchivo(
    archivo: ArchivoExcel | undefined,
  ): asserts archivo is ArchivoExcel {
    if (!archivo?.buffer.length)
      throw new BadRequestException('Debe adjuntar un archivo Excel.');
    if (!/\.(xlsx|xls)$/i.test(archivo.originalname)) {
      throw new BadRequestException(
        'El archivo debe tener extensión .xlsx o .xls.',
      );
    }
  }
}
