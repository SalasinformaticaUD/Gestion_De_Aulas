import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { ArchivoPdfValidado } from './pdf-validation.service';
import { PdfTextService, type PaginaTexto } from './pdf-text.service';
import {
  REGLAS_DOCUMENTALES,
  normalizarTexto,
  paginacion,
  type TipoEsperado,
} from './document-classification.rules';
import { DOCUMENTOS_REQUERIDOS } from './verificador-documental.constants';

export const VERSION_CLASIFICACION = 'reglas-v3';
export type EstadoClasificacion =
  | 'IDENTIFICADO'
  | 'NO_ESPERADO'
  | 'INCIERTO'
  | 'SIN_TEXTO'
  | 'ERROR_EXTRACCION';
export type DocumentoClasificado = {
  archivoIndice: number;
  tipo: TipoEsperado | 'NO_RECONOCIDO';
  paginaInicio: number;
  paginaFin: number;
  textoExtraido: string;
  paginasTexto: PaginaTexto[];
  requiereOcr: boolean;
  estadoClasificacion: EstadoClasificacion;
  puntajeClasificacion: number;
  evidenciasClasificacion: {
    senales: string[];
    candidatos: string[];
    porContexto: boolean;
  };
  requiereRevisionManual: boolean;
};
export type HallazgoClasificacion = {
  documentoIndice?: number;
  codigo: string;
  campo: string;
  observacion: string;
  accionSugerida: string;
  requiereRevisionManual: boolean;
};
export type ArchivoTexto = { nombreOriginal: string; paginas: PaginaTexto[] };

@Injectable()
export class DocumentClassificationService {
  constructor(private readonly pdfText: PdfTextService) {}

  async clasificar(archivos: ArchivoPdfValidado[]) {
    const entradas: ArchivoTexto[] = [];
    for (const archivo of archivos)
      entradas.push({
        nombreOriginal: archivo.nombreOriginal,
        paginas: await this.pdfText.extraer(
          archivo.contenido,
          archivo.numeroPaginas,
        ),
      });
    return this.clasificarTextos(entradas);
  }

  clasificarPagina(pagina: PaginaTexto) {
    const texto = normalizarTexto(pagina.texto);
    const candidatos = REGLAS_DOCUMENTALES.map((regla) => {
      const anclas = regla.anclas.filter((r) => r.test(texto));
      const apoyos = regla.apoyos.filter((r) => r.test(texto));
      // Un ancla (4) y al menos un apoyo (2) son obligatorios. Se limita
      // el peso de anclas solapadas para no inventar confianza adicional.
      return {
        tipo: regla.tipo,
        puntaje: (anclas.length ? 4 : 0) + apoyos.length * 2,
        anclas: anclas.length,
        contexto: regla.contexto.test(texto),
        senales: [...anclas, ...apoyos].map((r) => r.source),
      };
    })
      .filter((c) => c.anclas > 0 || (c.contexto && c.puntaje >= 2))
      .sort((a, b) => b.puntaje - a.puntaje);
    const mejor = candidatos[0],
      segundo = candidatos[1];
    if (pagina.error)
      return {
        tipo: 'NO_RECONOCIDO' as const,
        estado: 'ERROR_EXTRACCION' as const,
        puntaje: 0,
        senales: [],
        candidatos: [],
      };
    if (texto.length < 40)
      return {
        tipo: 'NO_RECONOCIDO' as const,
        estado: 'SIN_TEXTO' as const,
        puntaje: 0,
        senales: [],
        candidatos: [],
      };
    if (
      mejor &&
      mejor.anclas > 0 &&
      mejor.puntaje >= 6 &&
      (!segundo || mejor.puntaje - segundo.puntaje >= 2)
    )
      return {
        tipo: mejor.tipo,
        estado: 'IDENTIFICADO' as const,
        puntaje: mejor.puntaje,
        senales: mejor.senales,
        candidatos: candidatos.map((c) => c.tipo),
      };
    return {
      tipo: 'NO_RECONOCIDO' as const,
      estado: candidatos.length
        ? ('INCIERTO' as const)
        : ('NO_ESPERADO' as const),
      puntaje: mejor?.puntaje ?? 0,
      senales: mejor?.senales ?? [],
      candidatos: candidatos.map((c) => c.tipo),
    };
  }

  clasificarTextos(archivos: ArchivoTexto[]) {
    const documentos: DocumentoClasificado[] = [];
    const numeraciones = new Map<
      DocumentoClasificado,
      {
        inicio?: ReturnType<typeof paginacion>;
        fin?: ReturnType<typeof paginacion>;
      }
    >();
    const hallazgos: HallazgoClasificacion[] = [];
    const limitesDudosos = new Set<DocumentoClasificado>();
    const nombre = (tipo: string) =>
      DOCUMENTOS_REQUERIDOS.find((d) => d.tipo === tipo)?.nombre ??
      'Documento no reconocido';
    const ubicacion = (d: DocumentoClasificado) =>
      `${archivos[d.archivoIndice].nombreOriginal}, página${d.paginaInicio === d.paginaFin ? '' : 's'} ${d.paginaInicio}${d.paginaInicio === d.paginaFin ? '' : `–${d.paginaFin}`}`;
    archivos.forEach((archivo, archivoIndice) => {
      let previo: DocumentoClasificado | undefined;
      let numeracionPrevia: ReturnType<typeof paginacion>;
      for (const pagina of archivo.paginas) {
        const resultado = this.clasificarPagina(pagina);
        const numero = paginacion(pagina.texto);
        const reglaPrevia = REGLAS_DOCUMENTALES.find(
          (r) => r.tipo === previo?.tipo,
        );
        const sigueNumeracion = !!(
          numero &&
          numeracionPrevia &&
          numero.actual === numeracionPrevia.actual + 1 &&
          numero.total === numeracionPrevia.total
        );
        const mismoContexto =
          reglaPrevia?.contexto.test(normalizarTexto(pagina.texto)) ?? false;
        const tipoCompatible =
          resultado.tipo === previo?.tipo ||
          ((resultado.estado === 'NO_ESPERADO' ||
            (resultado.estado === 'INCIERTO' &&
              resultado.candidatos.length === 1 &&
              resultado.candidatos[0] === previo?.tipo)) &&
            mismoContexto);
        // No se heredan páginas vacías, ambiguas ni páginas de otro tipo.
        const continuar =
          previo?.estadoClasificacion === 'IDENTIFICADO' &&
          previo.paginaFin + 1 === pagina.pagina &&
          sigueNumeracion &&
          tipoCompatible;
        if (continuar && previo) {
          numeraciones.get(previo)!.fin = numero;
          previo.paginasTexto.push(pagina);
          previo.paginaFin = pagina.pagina;
          previo.textoExtraido = (
            previo.textoExtraido +
            '\n\n' +
            pagina.texto
          ).slice(0, 500000);
          if (resultado.tipo === 'NO_RECONOCIDO') {
            previo.evidenciasClasificacion.porContexto = true;
            previo.evidenciasClasificacion.senales.push(
              'Continuación por paginación consecutiva y contexto de la entidad',
            );
          }
        } else {
          const anterior = previo;
          previo = {
            archivoIndice,
            paginasTexto: [pagina],
            tipo: resultado.tipo,
            paginaInicio: pagina.pagina,
            paginaFin: pagina.pagina,
            textoExtraido: pagina.texto.slice(0, 500000),
            requiereOcr:
              resultado.estado === 'SIN_TEXTO' ||
              resultado.estado === 'ERROR_EXTRACCION',
            estadoClasificacion: resultado.estado,
            puntajeClasificacion: resultado.puntaje,
            evidenciasClasificacion: {
              senales: resultado.senales,
              candidatos: resultado.candidatos,
              porContexto: false,
            },
            requiereRevisionManual: resultado.estado !== 'IDENTIFICADO',
          };
          numeraciones.set(previo, { inicio: numero, fin: numero });
          documentos.push(previo);
          if (
            anterior?.tipo === previo.tipo &&
            previo.tipo !== 'NO_RECONOCIDO' &&
            numero?.actual !== 1 &&
            !(
              numeracionPrevia &&
              numeracionPrevia.actual === numeracionPrevia.total
            ) &&
            normalizarTexto(anterior.textoExtraido) !==
              normalizarTexto(pagina.texto)
          ) {
            anterior.requiereRevisionManual = true;
            previo.requiereRevisionManual = true;
            limitesDudosos.add(anterior);
            limitesDudosos.add(previo);
          }
        }
        numeracionPrevia = numero;
      }
    });
    documentos.forEach((doc, documentoIndice) => {
      if (limitesDudosos.has(doc))
        hallazgos.push({
          documentoIndice,
          codigo: 'LIMITES_DOCUMENTO_INCIERTOS',
          campo: 'paginas',
          observacion: `${nombre(doc.tipo)} (${ubicacion(doc)}): no hay paginación suficiente para decidir si los segmentos contiguos pertenecen a uno o varios documentos.`,
          accionSugerida:
            'Confirmar manualmente dónde termina cada documento antes de retirar posibles duplicados.',
          requiereRevisionManual: true,
        });
      if (doc.tipo === 'NO_RECONOCIDO') {
        const codigo =
          doc.estadoClasificacion === 'SIN_TEXTO'
            ? 'PAGINA_SIN_TEXTO'
            : doc.estadoClasificacion === 'ERROR_EXTRACCION'
              ? 'EXTRACCION_INCOMPLETA'
              : doc.estadoClasificacion === 'INCIERTO'
                ? 'CLASIFICACION_INCIERTA'
                : 'PAGINA_NO_ESPERADA';
        hallazgos.push({
          documentoIndice,
          codigo,
          campo: 'clasificacion',
          observacion: `${ubicacion(doc)}: ${doc.requiereOcr ? 'no se obtuvo texto suficiente para clasificar.' : doc.estadoClasificacion === 'INCIERTO' ? 'las señales no permiten elegir un tipo con suficiente certeza.' : 'no corresponde a ningún tipo documental esperado según las reglas disponibles.'}`,
          accionSugerida: doc.requiereOcr
            ? 'Revisar la legibilidad y realizar OCR o aportar un PDF con texto seleccionable.'
            : 'Revisar manualmente el contenido y retirar o reemplazar páginas ajenas al expediente.',
          requiereRevisionManual: true,
        });
      } else {
        const inicio = numeraciones.get(doc)?.inicio;
        const todas = numeraciones.get(doc)?.fin;
        if (
          (inicio && inicio.actual > 1) ||
          (todas && todas.actual < todas.total)
        ) {
          doc.requiereRevisionManual = true;
          hallazgos.push({
            documentoIndice,
            codigo: 'LIMITES_DOCUMENTO_INCIERTOS',
            campo: 'paginas',
            observacion: `${nombre(doc.tipo)} (${ubicacion(doc)}): la paginación indica que podría faltar parte del documento.`,
            accionSugerida:
              'Comprobar el inicio y el final del documento y aportar las páginas faltantes.',
            requiereRevisionManual: true,
          });
        }
      }
    });
    for (const requerido of DOCUMENTOS_REQUERIDOS) {
      const encontrados = documentos
        .map((doc, index) => ({ doc, index }))
        .filter(({ doc }) => doc.tipo === requerido.tipo);
      if (!encontrados.length)
        hallazgos.push({
          codigo: 'DOCUMENTO_FALTANTE',
          campo: requerido.tipo,
          observacion: `No se identificó con certeza: ${requerido.nombre}.${documentos.some((d) => d.tipo === 'NO_RECONOCIDO') ? ' Podría estar entre las páginas pendientes de clasificación.' : ''}`,
          accionSugerida:
            'Aportar el documento o confirmar su presencia mediante revisión manual.',
          requiereRevisionManual: true,
        });
      if (encontrados.length > 1) {
        const vistos = new Set<string>();
        encontrados.forEach(({ doc, index }, n) => {
          const hash = createHash('sha256')
            .update(normalizarTexto(doc.textoExtraido))
            .digest('hex');
          const exacto = doc.textoExtraido.length < 500000 && vistos.has(hash);
          vistos.add(hash);
          if (n === 0) return;
          hallazgos.push({
            documentoIndice: index,
            codigo: encontrados.some(({ doc: d }) => limitesDudosos.has(d))
              ? 'POSIBLE_DOCUMENTO_DUPLICADO'
              : 'DOCUMENTO_DUPLICADO',
            campo: requerido.tipo,
            observacion: `${requerido.nombre}: se identificaron ${encontrados.length} segmentos del mismo tipo. ${ubicacion(doc)}${exacto ? ' tiene el mismo texto normalizado que otro ejemplar.' : '; revisar si es un certificado adicional o una copia.'}`,
            accionSugerida:
              'Conservar el ejemplar que corresponda y retirar duplicados tras revisión.',
            requiereRevisionManual: true,
          });
        });
      }
    }
    return { documentos, hallazgos, version: VERSION_CLASIFICACION };
  }
}
