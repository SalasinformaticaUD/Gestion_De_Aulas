import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  ResultadoLecturaSolicitudesExcel,
  SolicitudExcelFila,
} from './solicitudes-instalacion-excel.parser';

type EstadoNormalizacion =
  'PENDIENTE' | 'COINCIDENCIA' | 'NUEVO' | 'AMBIGUO' | 'DESCARTADO';

type Coincidencia = {
  id: string | null;
  estado: EstadoNormalizacion;
  valorNormalizado: string | null;
  alerta?: string;
};

export type SolicitudNormalizada = SolicitudExcelFila & {
  hashContenido: string;
  docenteId: string | null;
  proyectoCurricularId: string | null;
  periodoId: string | null;
  duplicados: string[];
  itemsNormalizados: Array<{
    posicion: number;
    asignaturaId: string | null;
    asignaturaEstado: EstadoNormalizacion;
    aulas: Array<{
      posicion: number;
      valorOriginal: string;
      valorNormalizado: string | null;
      aulaId: string | null;
      estado: EstadoNormalizacion;
      alerta?: string;
    }>;
    software: Array<{
      posicion: number;
      nombreOriginal: string;
      nombreNormalizado: string | null;
      versionNormalizada: string | null;
      softwareId: string | null;
      estado: EstadoNormalizacion;
      alerta?: string;
    }>;
  }>;
};

export type ResultadoNormalizacion = ResultadoLecturaSolicitudesExcel & {
  solicitudesNormalizadas: SolicitudNormalizada[];
  resumen: {
    totalSolicitudes: number;
    listasParaImportar: number;
    observadas: number;
    ambiguas: number;
    posiblesDuplicados: number;
    filasRechazadas: number;
  };
};

export function normalizarClave(valor: string | null | undefined): string {
  return (valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9@._+-]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

type SolicitudParaHuella = Pick<
  SolicitudExcelFila,
  | 'docenteNombreOriginal'
  | 'docenteCorreoOriginal'
  | 'proyectoCurricularOriginal'
  | 'observacionGeneral'
  | 'items'
>;

export function crearHashContenidoSolicitud(
  solicitud: SolicitudParaHuella,
  periodoId: string | null,
): string {
  const docente = solicitud.docenteCorreoOriginal
    ? `CORREO:${normalizarClave(solicitud.docenteCorreoOriginal)}`
    : `NOMBRE:${normalizarClave(solicitud.docenteNombreOriginal)}`;
  const items = solicitud.items
    .map((item) =>
      JSON.stringify({
        asignatura: normalizarClave(item.asignaturaOriginal),
        aulas: item.aulasOriginales.map(normalizarClave).sort(),
        software: item.software
          .map((programa) => normalizarClave(programa.nombreOriginal))
          .sort(),
        observaciones: normalizarClave(item.observaciones),
      }),
    )
    .sort();
  const contenido = JSON.stringify({
    periodo: periodoId ?? 'SIN_PERIODO',
    docente,
    proyecto: normalizarClave(solicitud.proyectoCurricularOriginal),
    observacionGeneral: normalizarClave(solicitud.observacionGeneral),
    items,
  });
  return createHash('sha256').update(contenido).digest('hex');
}

@Injectable()
export class NormalizacionSolicitudesService {
  constructor(private readonly prisma: PrismaService) {}

  async normalizar(
    lectura: ResultadoLecturaSolicitudesExcel,
  ): Promise<ResultadoNormalizacion> {
    const [docentes, aulas, aliasAulas, periodos] = await Promise.all([
      this.prisma.docente.findMany({
        select: { id: true, nombre: true, correo: true },
      }),
      this.prisma.aula.findMany({
        where: { eliminadoEn: null },
        select: { id: true, codigo: true },
      }),
      this.prisma.aliasAula.findMany({
        where: { activo: true },
        select: { aliasNormalizado: true, aulaId: true },
      }),
      this.prisma.periodoAcademico.findMany({
        select: { id: true, fechaInicio: true, fechaFin: true },
      }),
    ]);

    const periodosPorSolicitud = lectura.solicitudes.map((solicitud) =>
      periodos.find(
        (item) =>
          solicitud.fechaPeticion >= item.fechaInicio &&
          solicitud.fechaPeticion <= item.fechaFin,
      ),
    );
    const hashes = lectura.solicitudes.map((solicitud, indice) =>
      crearHashContenidoSolicitud(
        solicitud,
        periodosPorSolicitud[indice]?.id ?? null,
      ),
    );
    const existentes = await this.prisma.solicitudInstalacion.findMany({
      where: {
        OR: [{ hashContenido: { in: hashes } }, { hashContenido: null }],
      },
      select: {
        id: true,
        hashContenido: true,
        periodoId: true,
        docenteNombreOriginal: true,
        docenteCorreoOriginal: true,
        proyectoCurricularOriginal: true,
        observacionGeneral: true,
        items: {
          orderBy: { posicion: 'asc' },
          select: {
            posicion: true,
            asignaturaOriginal: true,
            observaciones: true,
            aulas: {
              orderBy: { posicion: 'asc' },
              select: { valorOriginal: true },
            },
            softwareSolicitado: {
              orderBy: { posicion: 'asc' },
              select: { posicion: true, nombreOriginal: true },
            },
          },
        },
      },
    });
    const idsExistentes = new Map<string, string[]>();
    existentes.forEach((item) => {
      const hash =
        item.hashContenido ??
        crearHashContenidoSolicitud(
          {
            docenteNombreOriginal: item.docenteNombreOriginal,
            docenteCorreoOriginal: item.docenteCorreoOriginal,
            proyectoCurricularOriginal: item.proyectoCurricularOriginal,
            observacionGeneral: item.observacionGeneral,
            items: item.items.map((actual) => ({
              posicion: actual.posicion,
              asignaturaOriginal: actual.asignaturaOriginal,
              observaciones: actual.observaciones,
              aulasOriginales: actual.aulas.map((aula) => aula.valorOriginal),
              software: actual.softwareSolicitado,
              alertas: [],
              datosOriginales: {},
            })),
          },
          item.periodoId,
        );
      idsExistentes.set(hash, [...(idsExistentes.get(hash) ?? []), item.id]);
    });
    const vistosEnArchivo = new Set<string>();

    const solicitudesNormalizadas = lectura.solicitudes.map(
      (solicitud, indice) => {
        const alertas = [...solicitud.alertas];
        const docente = this.resolverDocente(
          solicitud.docenteCorreoOriginal,
          solicitud.docenteNombreOriginal,
          docentes,
        );
        if (docente.alerta) alertas.push(docente.alerta);
        const periodo = periodosPorSolicitud[indice];
        if (!periodo)
          alertas.push(
            'La fecha no coincide con un periodo académico registrado.',
          );

        const hashContenido = hashes[indice];
        const duplicados = [...(idsExistentes.get(hashContenido) ?? [])];
        if (vistosEnArchivo.has(hashContenido)) {
          duplicados.push('MISMO_ARCHIVO');
        }
        vistosEnArchivo.add(hashContenido);
        if (duplicados.length)
          alertas.push(
            'Solicitud duplicada: coincide el docente y las respuestas.',
          );

        const itemsNormalizados = solicitud.items.map((item) => {
          const aulasNormalizadas = item.aulasOriginales.map(
            (valorOriginal, indice) => {
              const clave =
                this.codigosAula(valorOriginal)[0] ??
                normalizarClave(valorOriginal).replace(/^AULA\s+/, '');
              const alias = aliasAulas.find(
                (actual) => actual.aliasNormalizado === clave,
              );
              const coincidencias = alias
                ? aulas.filter((actual) => actual.id === alias.aulaId)
                : aulas.filter((actual) =>
                    this.codigosAula(actual.codigo).includes(clave),
                  );
              const resultado = this.desdeCoincidencias(
                valorOriginal,
                coincidencias,
                'aula',
              );
              if (resultado.alerta) alertas.push(resultado.alerta);
              return {
                posicion: indice + 1,
                valorOriginal,
                valorNormalizado: resultado.valorNormalizado,
                aulaId: resultado.id,
                estado: resultado.estado,
                ...(resultado.alerta && { alerta: resultado.alerta }),
              };
            },
          );

          const softwareNormalizado = item.software.map((programa) => ({
            posicion: programa.posicion,
            nombreOriginal: programa.nombreOriginal,
            nombreNormalizado: programa.nombreOriginal.trim(),
            versionNormalizada: null,
            softwareId: null,
            estado: 'NUEVO' as const,
          }));
          const asignaturaEstado: EstadoNormalizacion = item.asignaturaOriginal
            ? 'NUEVO'
            : 'PENDIENTE';

          return {
            posicion: item.posicion,
            asignaturaId: null,
            asignaturaEstado,
            aulas: aulasNormalizadas,
            software: softwareNormalizado,
          };
        });

        return {
          ...solicitud,
          hashContenido,
          alertas: [...new Set(alertas)],
          docenteId: docente.id,
          proyectoCurricularId: null,
          periodoId: periodo?.id ?? null,
          duplicados,
          itemsNormalizados,
        };
      },
    );

    const ambiguas = solicitudesNormalizadas.filter((solicitud) =>
      solicitud.itemsNormalizados.some((item) =>
        item.aulas.some((aula) => aula.estado === 'AMBIGUO'),
      ),
    ).length;
    const observadas = solicitudesNormalizadas.filter(
      (solicitud) => solicitud.alertas.length > 0,
    ).length;
    const posiblesDuplicados = solicitudesNormalizadas.filter(
      (solicitud) => solicitud.duplicados.length > 0,
    ).length;
    return {
      ...lectura,
      solicitudesNormalizadas,
      resumen: {
        totalSolicitudes: solicitudesNormalizadas.length,
        listasParaImportar: solicitudesNormalizadas.length - observadas,
        observadas,
        ambiguas,
        posiblesDuplicados,
        filasRechazadas: lectura.errores.length,
      },
    };
  }

  private resolverDocente(
    correo: string | null,
    nombre: string | null,
    docentes: Array<{ id: string; nombre: string; correo: string | null }>,
  ): Coincidencia {
    const correoClave = normalizarClave(correo);
    if (correoClave) {
      const porCorreo = docentes.filter(
        (item) => normalizarClave(item.correo) === correoClave,
      );
      if (porCorreo.length === 1)
        return {
          id: porCorreo[0].id,
          estado: 'COINCIDENCIA',
          valorNormalizado: porCorreo[0].nombre,
        };
    }
    return this.resolverSimple(
      nombre,
      docentes.map((item) => ({ ...item, valor: item.nombre })),
      'docente',
    );
  }

  private codigosAula(valor: string): string[] {
    return valor.match(/(?<!\d)\d{3}(?!\d)/g) ?? [];
  }

  private resolverSimple<
    T extends { id: string; valor: string; valoresAlternos?: string[] },
  >(original: string | null, catalogo: T[], etiqueta: string): Coincidencia {
    const clave = normalizarClave(original);
    if (!clave) {
      return {
        id: null,
        estado: 'PENDIENTE',
        valorNormalizado: null,
        alerta: `Falta ${etiqueta} para relacionar.`,
      };
    }
    const coincidencias = catalogo.filter(
      (item) =>
        normalizarClave(item.valor) === clave ||
        item.valoresAlternos?.some((valor) => normalizarClave(valor) === clave),
    );
    return this.desdeCoincidencias(original ?? '', coincidencias, etiqueta);
  }

  private desdeCoincidencias<T extends { id: string }>(
    original: string,
    coincidencias: T[],
    etiqueta: string,
  ): Coincidencia {
    if (coincidencias.length === 1) {
      return {
        id: coincidencias[0].id,
        estado: 'COINCIDENCIA',
        valorNormalizado: normalizarClave(original),
      };
    }
    if (coincidencias.length > 1) {
      return {
        id: null,
        estado: 'AMBIGUO',
        valorNormalizado: normalizarClave(original),
        alerta: `El valor de ${etiqueta} "${original}" tiene varias coincidencias.`,
      };
    }
    return {
      id: null,
      estado: 'NUEVO',
      valorNormalizado: normalizarClave(original),
      alerta: `No existe ${etiqueta} para "${original}".`,
    };
  }
}
