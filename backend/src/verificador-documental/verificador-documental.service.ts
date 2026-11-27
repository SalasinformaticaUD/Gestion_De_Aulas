import { PersonalDataExtractionService } from './personal-data-extraction.service';
import { DocumentValidationService } from './document-validation.service';
import {
  determinarResultadoDocumental,
  comprobarCierrePersistido,
} from './document-result';
import { PersonalDataComparisonService } from './personal-data-comparison.service';
import { randomUUID } from 'node:crypto';
import { DocumentClassificationService } from './document-classification.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVerificacionDto } from './dto/create-verificacion.dto';
import { FindVerificacionesDto } from './dto/find-verificaciones.dto';
import { PdfValidationService } from './pdf-validation.service';
import type { ArchivoPdfRecibido } from './pdf-validation.service';
import { descartarPdfs } from './descartar-pdf.interceptor';
import {
  DOCUMENTOS_REQUERIDOS,
  LIMITES_CARGA,
} from './verificador-documental.constants';

const creadoPor = { select: { id: true, nombreCompleto: true } } as const;

@Injectable()
export class VerificadorDocumentalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfValidation: PdfValidationService,
    private readonly classifier: DocumentClassificationService,
    private readonly extractor: PersonalDataExtractionService,
    private readonly comparador: PersonalDataComparisonService,
    private readonly validadorDocumental: DocumentValidationService,
  ) {}

  catalogos() {
    return {
      documentosRequeridos: DOCUMENTOS_REQUERIDOS,
      limitesCarga: LIMITES_CARGA,
      validacion: 'TODOS_LOS_CAMPOS_DISPONIBLES',
    };
  }

  // El cliente no puede asignar un estado ni crear resultados de validación.
  create(dto: CreateVerificacionDto, usuarioId: string) {
    return this.prisma.$transaction(async (tx) => {
      const verificacion = await tx.verificacionDocumental.create({
        data: {
          tipoIdentificacion: dto.tipoIdentificacion,
          numeroIdentificacion: dto.numeroIdentificacion,
          nombreCompleto: dto.nombreCompleto,
          fechaSolicitud: new Date(`${dto.fechaSolicitud}T00:00:00.000Z`),
          modalidadCarga: dto.modalidadCarga,
          creadoPorId: usuarioId,
          estado: 'BORRADOR',
        },
        include: { creadoPor },
      });
      // Creación e historial de auditoría atómicos; sin copiar datos personales al evento.
      await tx.auditoria.create({
        data: {
          usuarioId,
          entidad: 'VerificacionDocumental',
          entidadId: verificacion.id,
          accion: 'CREATE',
          datosNuevos: { estado: 'BORRADOR' },
        },
      });
      return verificacion;
    });
  }

  async procesar(
    id: string,
    archivos: ArchivoPdfRecibido[] | undefined,
    usuarioId: string,
  ) {
    try {
      return await this.procesarEnMemoria(id, archivos, usuarioId);
    } finally {
      descartarPdfs(archivos);
    }
  }

  private async procesarEnMemoria(
    id: string,
    archivos: ArchivoPdfRecibido[] | undefined,
    usuarioId: string,
  ) {
    const registro = await this.prisma.verificacionDocumental.findUnique({
      where: { id },
      select: {
        id: true,
        estado: true,
        modalidadCarga: true,
        nombreCompleto: true,
        numeroIdentificacion: true,
        tipoIdentificacion: true,
        fechaSolicitud: true,
      },
    });
    if (!registro)
      throw new NotFoundException('Verificación documental no encontrada.');
    if (registro.estado !== 'BORRADOR')
      throw new ConflictException(
        'Esta verificación ya finalizó. Cree una nueva verificación y adjunte todos los documentos nuevamente; los PDF no se conservan.',
      );
    const validados = await this.pdfValidation.validar(
      archivos,
      registro.modalidadCarga,
    );
    const clasificacion = await this.classifier.clasificar(validados);
    const extracciones = clasificacion.documentos.map(
      (doc, documentoIndice) => ({
        documentoIndice,
        tipo: doc.tipo,
        datos: this.extractor.extraer(doc),
      }),
    );
    const comparacion = this.comparador.comparar(extracciones, {
      nombreCompleto: registro.nombreCompleto,
      numeroIdentificacion: registro.numeroIdentificacion,
      tipoIdentificacion: registro.tipoIdentificacion,
    });
    const { hallazgos: hallazgosPersonales, ...resultadoComparacion } =
      comparacion;
    const { hallazgos: hallazgosDocumentales, ...validacionDocumental } =
      this.validadorDocumental.validar(
        clasificacion.documentos,
        extracciones,
        registro.fechaSolicitud?.toISOString().slice(0, 10) ?? '',
        hallazgosPersonales,
      );
    const estadoFinal = determinarResultadoDocumental({
      documentos: clasificacion.documentos,
      hallazgos: [
        ...clasificacion.hallazgos,
        ...hallazgosPersonales,
        ...hallazgosDocumentales,
      ],
      comparacion,
      validacion: validacionDocumental,
    });
    const archivoIds = validados.map(() => randomUUID());
    const documentoIds = clasificacion.documentos.map(() => randomUUID());
    await this.prisma.$transaction(
      async (tx) => {
        // Reclamo condicional para impedir cargas simultáneas sobre el mismo borrador.
        const actualizado = await tx.verificacionDocumental.updateMany({
          where: { id, estado: 'BORRADOR' },
          data: { estado: 'PROCESANDO' },
        });
        if (actualizado.count !== 1)
          throw new ConflictException(
            'Otra carga está procesando este borrador. Actualice el historial antes de reintentar.',
          );
        await tx.archivoVerificacionDocumental.createMany({
          data: validados.map((archivo, index) => ({
            nombreOriginal: archivo.nombreOriginal,
            tamanoBytes: archivo.tamanoBytes,
            sha256: archivo.sha256,
            numeroPaginas: archivo.numeroPaginas,
            id: archivoIds[index],
            verificacionId: id,
            mimeType: 'application/pdf',
            ordenCarga: index + 1,
          })),
        });
        await tx.documentoVerificacionDocumental.createMany({
          data: clasificacion.documentos.map((doc, index) => ({
            id: documentoIds[index],
            archivoId: archivoIds[doc.archivoIndice],
            tipo: doc.tipo,
            paginaInicio: doc.paginaInicio,
            paginaFin: doc.paginaFin,
            requiereOcr: doc.requiereOcr,
            estadoClasificacion: doc.estadoClasificacion,
            puntajeClasificacion: doc.puntajeClasificacion,
            evidenciasClasificacion: doc.evidenciasClasificacion,
            requiereRevisionManual: doc.requiereRevisionManual,
          })),
        });
        if (hallazgosPersonales.length)
          await tx.hallazgoVerificacionDocumental.createMany({
            data: hallazgosPersonales.map(
              ({ documentoIndice, evidencia, ...hallazgo }) => ({
                ...hallazgo,
                documentoId: documentoIds[documentoIndice],
                verificacionId: id,
                evidencia: JSON.parse(
                  JSON.stringify(evidencia),
                ) as Prisma.InputJsonValue,
              }),
            ),
          });
        if (hallazgosDocumentales.length)
          await tx.hallazgoVerificacionDocumental.createMany({
            data: hallazgosDocumentales.map(
              ({ documentoIndice, evidencia, ...hallazgo }) => ({
                ...hallazgo,
                documentoId: documentoIds[documentoIndice],
                verificacionId: id,
                evidencia: JSON.parse(
                  JSON.stringify(evidencia),
                ) as Prisma.InputJsonValue,
              }),
            ),
          });
        if (clasificacion.hallazgos.length)
          await tx.hallazgoVerificacionDocumental.createMany({
            data: clasificacion.hallazgos.map(
              ({ documentoIndice, ...hallazgo }) => ({
                ...hallazgo,
                verificacionId: id,
                documentoId:
                  documentoIndice === undefined
                    ? undefined
                    : documentoIds[documentoIndice],
              }),
            ),
          });
        await tx.verificacionDocumental.update({
          where: { id },
          data: {
            estado: estadoFinal,
            versionComparacion: comparacion.version,
            resultadoComparacion: JSON.parse(
              JSON.stringify({ ...resultadoComparacion, validacionDocumental }),
            ) as Prisma.InputJsonValue,
            finalizadoEn: new Date(),
            versionClasificacion: clasificacion.version,
          },
        });
        await tx.auditoria.create({
          data: {
            usuarioId,
            entidad: 'VerificacionDocumental',
            entidadId: id,
            accion: 'UPDATE',
            datosPrevios: { estado: 'BORRADOR' },
            datosNuevos: {
              estado: estadoFinal,
              archivosRecibidos: validados.length,
            },
          },
        });
      },
      { timeout: 30000 },
    );
    return this.findOne(id);
  }

  async eliminar(id: string, usuarioId: string) {
    return this.prisma.$transaction(async (tx) => {
      const resultado = await tx.verificacionDocumental.deleteMany({
        where: { id, estado: { not: 'PROCESANDO' } },
      });
      if (!resultado.count) {
        const registro = await tx.verificacionDocumental.findUnique({
          where: { id },
          select: { id: true },
        });
        if (!registro)
          throw new NotFoundException('Verificación documental no encontrada.');
        throw new ConflictException(
          'La verificación está en procesamiento. Espere a que termine antes de eliminarla.',
        );
      }
      // Las relaciones del módulo eliminan sus resultados asociados en cascada.
      // La auditoría no copia nombres ni datos documentales.
      await tx.auditoria.create({
        data: {
          usuarioId,
          entidad: 'VerificacionDocumental',
          entidadId: id,
          accion: 'DELETE',
        },
      });
      return { id, eliminado: true };
    });
  }

  async findAll(filtros: FindVerificacionesDto) {
    const { pagina = 1, limite = 20, estado, q } = filtros;
    const where: Prisma.VerificacionDocumentalWhereInput = {
      ...(estado && { estado }),
      ...(q && {
        OR: [
          { nombreCompleto: { contains: q, mode: 'insensitive' } },
          { numeroIdentificacion: { contains: q, mode: 'insensitive' } },
        ],
      }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.verificacionDocumental.findMany({
        where,
        include: {
          creadoPor,
          _count: { select: { archivos: true, hallazgos: true } },
        },
        orderBy: [{ creadoEn: 'desc' }, { id: 'desc' }],
        skip: (pagina - 1) * limite,
        take: limite,
      }),
      this.prisma.verificacionDocumental.count({ where }),
    ]);
    const exitosos = data
      .filter((v) => v.estado === 'SATISFACTORIA')
      .map((v) => v.id);
    const documentos = exitosos.length
      ? await this.prisma.documentoVerificacionDocumental.findMany({
          where: { archivo: { verificacionId: { in: exitosos } } },
          select: {
            tipo: true,
            estadoClasificacion: true,
            requiereOcr: true,
            requiereRevisionManual: true,
            archivo: { select: { verificacionId: true } },
          },
        })
      : [];
    return {
      data: data.map((v) =>
        v.estado !== 'SATISFACTORIA'
          ? v
          : {
              ...v,
              estado: comprobarCierrePersistido({
                versionClasificacion: v.versionClasificacion,
                versionComparacion: v.versionComparacion,
                resultadoComparacion: v.resultadoComparacion,
                documentos: documentos.filter(
                  (d) => d.archivo.verificacionId === v.id,
                ),
                hallazgos: v._count.hallazgos
                  ? [{ codigo: 'REVISION_PENDIENTE' }]
                  : [],
              }),
            },
      ),
      meta: {
        pagina,
        limite,
        total,
        totalPaginas: Math.max(1, Math.ceil(total / limite)),
      },
    };
  }

  async findOne(id: string) {
    const registro = await this.prisma.verificacionDocumental.findUnique({
      where: { id },
      include: {
        creadoPor,
        // Solo resultados y metadatos: no hay PDF ni texto completo persistidos.
        archivos: {
          orderBy: { ordenCarga: 'asc' },
          select: {
            id: true,
            nombreOriginal: true,
            tamanoBytes: true,
            ordenCarga: true,
            numeroPaginas: true,
            documentos: {
              orderBy: { paginaInicio: 'asc' },
              select: {
                id: true,
                tipo: true,
                paginaInicio: true,
                paginaFin: true,
                requiereOcr: true,
                estadoClasificacion: true,
                puntajeClasificacion: true,
                evidenciasClasificacion: true,
                requiereRevisionManual: true,
              },
            },
          },
        },
        hallazgos: { orderBy: [{ creadoEn: 'asc' }, { id: 'asc' }] },
      },
    });
    if (!registro)
      throw new NotFoundException('Verificación documental no encontrada.');
    return registro.estado !== 'SATISFACTORIA'
      ? registro
      : {
          ...registro,
          estado: comprobarCierrePersistido({
            versionClasificacion: registro.versionClasificacion,
            versionComparacion: registro.versionComparacion,
            resultadoComparacion: registro.resultadoComparacion,
            documentos: registro.archivos.flatMap((a) => a.documentos),
            hallazgos: registro.hallazgos,
          }),
        };
  }
}
