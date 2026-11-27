import { Injectable } from '@nestjs/common';
import type { DocumentoClasificado } from './document-classification.service';
import type {
  CampoPersonal,
  DatoPersonal,
  HallazgoPersonal,
} from './personal-data.types';
import {
  normalizarDato,
  normalizarFecha,
  textoNormalizado,
} from './personal-data.normalization';
import { DOCUMENTOS_REQUERIDOS } from './verificador-documental.constants';
import { REQUISITOS_CERTIFICADOS } from './document-validation.rules';
import type {
  ComprobacionDocumental,
  EvidenciaDocumental,
  HallazgoDocumental,
  ValidacionPorDocumento,
} from './document-validation.types';

export const VERSION_VALIDACION_DOCUMENTAL = 'particulares-v2';
const FECHA = String.raw`(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4}|\d{1,2}\s+(?:de\s+)?[\p{L}]+\s+(?:de[l]?\s+)?\d{4})`;
const vacio = (v: string) =>
  !v.trim() ||
  /^[_\s.-]+$/.test(v) ||
  /^(?:N\/?A|NO APLICA|SIN INFORMACION|PENDIENTE)$/i.test(textoNormalizado(v));

function capturar(
  doc: DocumentoClasificado,
  patron: RegExp,
): EvidenciaDocumental[] {
  return doc.paginasTexto.flatMap((p) =>
    Array.from(p.texto.matchAll(patron))
      .filter((m) => m[1].length <= 250)
      .map((m) => ({
        original: m[1],
        pagina: p.pagina,
      })),
  );
}
function unicos(valores: EvidenciaDocumental[]) {
  return new Set(valores.map((v) => v.normalizado ?? v.original.trim()));
}
@Injectable()
export class DocumentValidationService {
  validar(
    documentos: DocumentoClasificado[],
    extracciones: { datos: DatoPersonal[] }[],
    fechaSolicitud: string,
    hallazgosComparacion: HallazgoPersonal[] = [],
  ) {
    const resultados: ValidacionPorDocumento[] = [];
    const hallazgos: HallazgoDocumental[] = [];
    const esperado = normalizarFecha(fechaSolicitud).valor;
    documentos.forEach((doc, documentoIndice) => {
      if (
        doc.tipo === 'NO_RECONOCIDO' ||
        !DOCUMENTOS_REQUERIDOS.some((d) => d.tipo === doc.tipo) ||
        doc.estadoClasificacion !== 'IDENTIFICADO'
      )
        return;
      const checks: ComprobacionDocumental[] = [];
      const datos = extracciones[documentoIndice]?.datos ?? [];
      const agregar = (
        campo: string,
        estado: ComprobacionDocumental['estado'],
        codigo: string,
        observacion: string,
        valores: EvidenciaDocumental[] = [],
        referencia?: string,
      ) => {
        checks.push({
          campo,
          estado,
          codigo,
          observacion,
          valores,
          ...(referencia ? { esperado: referencia } : {}),
        });
      };
      const personal = (campo: CampoPersonal) => {
        const values = datos
          .filter((d) => d.campo === campo)
          .map((d) => ({
            original: d.original,
            pagina: d.pagina,
            normalizado: normalizarDato(d).normalizado,
          }));
        const invalidos = values.filter(
          (v) => v.normalizado === null || vacio(v.original),
        );
        const incidencia = hallazgosComparacion.find(
          (h) => h.documentoIndice === documentoIndice && h.campo === campo,
        );
        if (incidencia) {
          const diferencia = [
            'DIFERENCIA_NUMERICA',
            'DIFERENCIA_IDENTIFICACION',
            'DIFERENCIA_TIPO_IDENTIFICACION',
            'DIFERENCIA_FECHA',
            'DIFERENCIA_ORTOGRAFICA',
            'VALOR_PERSONAL_DIFERENTE',
            'CONFLICTO_INTERNO_CAMPO',
          ].includes(incidencia.codigo);
          agregar(
            campo,
            diferencia ? 'INCONSISTENCIA' : 'NO_VERIFICABLE',
            incidencia.codigo,
            incidencia.observacion,
            values,
            incidencia.valorReferencia,
          );
          return;
        }
        agregar(
          campo,
          !values.length || invalidos.length ? 'NO_VERIFICABLE' : 'OK',
          !values.length
            ? 'CAMPO_OBLIGATORIO_NO_EXTRAIDO'
            : invalidos.length
              ? 'CAMPO_OBLIGATORIO_NO_INTERPRETABLE'
              : 'CAMPO_IDENTIFICADO',
          !values.length
            ? 'No se pudo identificar el dato del titular en el contexto esperado; su ausencia en el texto no demuestra que falte en el PDF.'
            : invalidos.length
              ? 'El campo del titular contiene un valor vacío o no interpretable.'
              : 'Dato del titular extraído; las diferencias con otras fuentes se evalúan en el motor de comparación.',
          values,
        );
      };
      const fechas = (
        campo: string,
        valores: EvidenciaDocumental[],
        formato?: 'DMY',
      ) => {
        const values = valores.map((v) => ({
          ...v,
          normalizado:
            v.normalizado !== undefined
              ? v.normalizado
              : normalizarFecha(v.original, formato).valor,
        }));
        let estado: ComprobacionDocumental['estado'] = 'OK';
        let codigo = 'FECHA_DOCUMENTAL_IDENTIFICADA';
        let observacion =
          campo === 'validaHasta'
            ? 'Fecha de vigencia impresa interpretable; no se han supuesto plazos legales.'
            : 'Fecha del documento interpretable y no posterior a la solicitud.';
        if (!values.length) {
          estado = 'NO_VERIFICABLE';
          codigo = 'FECHA_DOCUMENTAL_NO_EXTRAIDA';
          observacion =
            'No se pudo identificar la fecha propia de emisión o diligenciamiento del documento.';
        } else if (values.some((v) => !v.normalizado)) {
          estado = 'NO_VERIFICABLE';
          codigo = 'FECHA_DOCUMENTAL_NO_INTERPRETABLE';
          observacion =
            'La fecha es inválida o su formato es ambiguo; requiere confirmar el original.';
        } else if (unicos(values).size > 1) {
          estado = 'INCONSISTENCIA';
          codigo = 'FECHAS_DOCUMENTALES_CONTRADICTORIAS';
          observacion =
            'Se encontraron fechas diferentes para el mismo campo en el documento.';
        } else if (!esperado) {
          estado = 'NO_VERIFICABLE';
          codigo = 'FECHA_SOLICITUD_NO_VERIFICABLE';
          observacion =
            'No hay una fecha de solicitud válida para comprobar la cronología.';
        } else if (
          campo !== 'validaHasta' &&
          values.some((v) => v.normalizado! > fechaSolicitud)
        ) {
          estado = 'INCONSISTENCIA';
          codigo = 'FECHA_POSTERIOR_SOLICITUD';
          observacion =
            'La fecha del documento es posterior a la solicitud de contratación.';
        }
        agregar(
          campo,
          estado,
          codigo,
          observacion,
          values,
          campo !== 'validaHasta' ? fechaSolicitud : undefined,
        );
        return values;
      };
      personal('numeroIdentificacion');
      personal('tipoIdentificacion');
      const requisitos = REQUISITOS_CERTIFICADOS[doc.tipo];
      if (requisitos) {
        if (requisitos.nombre) personal('nombreCompleto');
        const generales = capturar(
          doc,
          new RegExp(
            String.raw`(?:Fecha\s+de\s+(?:expedici[oó]n|emisi[oó]n|consulta))(?!\s+(?:del\s+documento|de\s+la\s+c[ée]dula))\s*(?:\((?:DD/MM/(?:AAAA|YYYY))\))?\s*:\s*${FECHA}`,
            'giu',
          ),
        );
        const especificos: Record<string, RegExp> = {
          PERSONERIA: new RegExp(
            String.raw`Bogot[aá]\s+D\.?\s*C\.?,\s*${FECHA}`,
            'giu',
          ),
          PROCURADURIA: new RegExp(
            String.raw`Bogot[aá]\s+D\.?\s*C\.?,\s*${FECHA}`,
            'giu',
          ),
          CONTRALORIA: new RegExp(
            String.raw`\bhoy\s+(?:[\p{L}]+\s+)?${FECHA}`,
            'giu',
          ),
          POLICIA_JUDICIAL: new RegExp(
            String.raw`horas\s+del\s+${FECHA}`,
            'giu',
          ),
          MEDIDAS_CORRECTIVAS: new RegExp(
            String.raw`Que\s+a\s+la\s+fecha,?\s*${FECHA}`,
            'giu',
          ),
          DELITOS_SEXUALES: new RegExp(
            String.raw`horas\s+del\s+${FECHA}`,
            'giu',
          ),
          REDAM: new RegExp(
            String.raw`Se\s+expide\s+en\s+[^\n]{1,60}?\s+el\s+${FECHA}`,
            'giu',
          ),
        };
        const formatoExplicito =
          /Fecha\s+de\s+(?:expedici[oó]n|emisi[oó]n|consulta)\s*\(DD\/MM\/(?:AAAA|YYYY)\)/iu.test(
            doc.textoExtraido,
          );
        fechas(
          'fechaCertificado',
          [...generales, ...capturar(doc, especificos[doc.tipo])],
          formatoExplicito ? 'DMY' : undefined,
        );
        const caducidad = capturar(
          doc,
          new RegExp(
            String.raw`(?:V[aá]lid[ao]\s+hasta|Fecha\s+de\s+vencimiento)\s*:\s*${FECHA}`,
            'giu',
          ),
        );
        if (caducidad.length) {
          const vencimientos = fechas('validaHasta', caducidad);
          const emisiones =
            checks.find((c) => c.campo === 'fechaCertificado')?.valores ?? [];
          if (
            vencimientos.some(
              (v) =>
                v.normalizado &&
                (v.normalizado < fechaSolicitud ||
                  emisiones.some(
                    (e) => e.normalizado && e.normalizado > v.normalizado!,
                  )),
            )
          )
            agregar(
              'validaHasta',
              'INCONSISTENCIA',
              'VIGENCIA_EXPRESA_INCONSISTENTE',
              'La vigencia impresa vence antes de la solicitud o antes de la emisión. No se han supuesto plazos legales.',
              vencimientos,
              fechaSolicitud,
            );
        }
        // Solo el cuerpo de la certificación: se excluyen advertencias legales,
        // citas del resultado y ejemplos de uso que pueden repetir la leyenda.
        const cuerpo = {
          ...doc,
          paginasTexto: doc.paginasTexto.map((p) => ({
            ...p,
            texto: p.texto.split(
              /ADVERTENCIAS?:|En\s+cumplimiento\s+de\s+la\s+Sentencia|De\s+conformidad\s+con/iu,
            )[0],
          })),
        };
        const values = cuerpo.paginasTexto.flatMap((p) =>
          Array.from(p.texto.matchAll(requisitos.resultado), (m) => ({
            original: m[0],
            pagina: p.pagina,
          })),
        );
        agregar(
          'resultadoConsulta',
          values.length ? 'OK' : 'NO_VERIFICABLE',
          values.length
            ? 'RESULTADO_TEXTUAL_IDENTIFICADO'
            : 'RESULTADO_NO_EXTRAIDO',
          values.length
            ? 'Leyenda textual identificada. No acredita autenticidad ni determina habilitación jurídica.'
            : 'No se identificó una leyenda de resultado reconocible en el cuerpo del certificado.',
          values,
        );
        if (values.some((v) => !/^NO\b/i.test(v.original)))
          agregar(
            'resultadoConsulta',
            'NO_VERIFICABLE',
            'RESULTADO_REQUIERE_REVISION',
            'El certificado contiene una anotación que requiere evaluación humana. No se determina la habilitación jurídica del contratista.',
            values,
          );
      }
      if (doc.tipo === 'DECLARACION_VERACIDAD') {
        personal('nombreCompleto');
        personal('lugarExpedicion');
        const codigo = capturar(doc, /C[oó]digo\s*:\s*([^\n]+)/giu);
        const correcto =
          codigo.length &&
          codigo.every((v) => /^GC-PR-002-FR-038$/i.test(v.original.trim()));
        agregar(
          'codigoFormato',
          correcto ? 'OK' : codigo.length ? 'INCONSISTENCIA' : 'NO_VERIFICABLE',
          correcto ? 'FORMATO_IDENTIFICADO' : 'CODIGO_FORMATO_NO_VALIDO',
          'El formato esperado es GC-PR-002-FR-038; no se presupone una versión específica.',
          codigo,
          'GC-PR-002-FR-038',
        );
        const juramento =
          /bajo\s+la\s+gravedad\s+del\s+juramento/iu.test(doc.textoExtraido) &&
          /no\s+me\s+encuentro\s+incurso/iu.test(doc.textoExtraido);
        agregar(
          'declaracion',
          juramento ? 'OK' : 'NO_VERIFICABLE',
          juramento ? 'DECLARACION_IDENTIFICADA' : 'DECLARACION_NO_EXTRAIDA',
          juramento
            ? 'Se identificó el texto de declaración y juramento.'
            : 'No se pudo comprobar el texto de declaración; revisar integridad del formato.',
        );
        const dadas = capturar(doc, /Dada\s+en\s+([^\n]+)/giu);
        const fechasDadas: EvidenciaDocumental[] = [];
        for (const dada of dadas) {
          const m =
            /^(.+?),\s*a\s+los\s+([\d_ .-]+)\s+d[ií]as\s+del\s+mes\s+de\s+([\p{L}_ ]+)\s+del\s+a[ñn]o\s+([\d_]+)\.?/iu.exec(
              dada.original.trim(),
            );
          if (!m || vacio(m[2]) || !/\d/.test(m[4]))
            agregar(
              'fechaDeclaracion',
              'INCONSISTENCIA',
              'DECLARACION_FECHA_INCOMPLETA',
              'La línea de diligenciamiento de la declaración contiene espacios pendientes o una fecha incompleta.',
              [dada],
            );
          else {
            fechasDadas.push({
              ...dada,
              normalizado: normalizarFecha(
                `${m[2].trim()} de ${m[3].replace(/_/g, '').trim()} de ${m[4].replace(/_/g, '')}`,
              ).valor,
            });
            agregar(
              'lugarDeclaracion',
              vacio(m[1]) ? 'INCONSISTENCIA' : 'OK',
              vacio(m[1]) ? 'CAMPO_OBLIGATORIO_VACIO' : 'CAMPO_IDENTIFICADO',
              'Lugar de diligenciamiento de la declaración.',
              [{ ...dada, original: m[1] }],
            );
          }
        }
        const etiquetadas = capturar(
          doc,
          new RegExp(
            String.raw`Fecha\s+de\s+(?:diligenciamiento|declaraci[oó]n)\s*:\s*${FECHA}`,
            'giu',
          ),
        );
        if (fechasDadas.length || etiquetadas.length || !dadas.length)
          fechas('fechaDeclaracion', [...fechasDadas, ...etiquetadas]);
        // Una línea "Firma" o una imagen no permite inferir ausencia ni autenticidad.
        agregar(
          'firmaDeclaracion',
          'NO_VERIFICABLE',
          'FIRMA_REQUIERE_REVISION',
          'La firma requiere revisión visual o validación especializada. El texto extraído no permite acreditar su presencia, titularidad o autenticidad.',
          capturar(
            doc,
            /(?:^|\n)[ \t]*(Firma(?:[ \t]*:[^\n]*)?)[ \t]*(?=\n|$)/giu,
          ),
        );
        for (const label of [
          'Direcci[oó]n',
          'Correo electr[oó]nico',
          'Tel[ée]fono',
          'Lugar de expedici[oó]n',
          'Nombre completo',
          'Primer nombre',
          'Primer apellido',
        ]) {
          const blanks = capturar(
            doc,
            new RegExp(
              String.raw`(?:^|\n)[ \t]*(${label}[ \t]*:[ \t]*(?:[_ .-]*|N/A|NO APLICA))[ \t]*(?=\n|$)`,
              'gimu',
            ),
          );
          if (blanks.length)
            agregar(
              'camposFormato',
              'INCONSISTENCIA',
              'CAMPO_OBLIGATORIO_VACIO',
              'Hay campos personales identificables sin diligenciar. Revisar la etiqueta y el valor original.',
              blanks,
            );
        }
      }
      resultados.push({
        documentoIndice,
        tipo: doc.tipo,
        comprobaciones: checks,
      });
      for (const check of checks.filter((c) => c.estado !== 'OK')) {
        // La comprobación del documento muestra el resultado del comparador,
        // cuyo hallazgo ya se conserva con sus grupos y fuentes completas.
        if (
          hallazgosComparacion.some(
            (h) =>
              h.documentoIndice === documentoIndice &&
              h.campo === check.campo &&
              h.codigo === check.codigo,
          )
        )
          continue;
        const paginas = [...new Set(check.valores.map((v) => v.pagina))];
        hallazgos.push({
          documentoIndice,
          pagina: paginas[0] ?? doc.paginaInicio,
          codigo: check.codigo,
          campo: check.campo,
          ...(check.valores.length
            ? {
                valorEncontrado: check.valores
                  .map((v) => v.original)
                  .join(' | '),
              }
            : {}),
          ...(check.esperado ? { valorReferencia: check.esperado } : {}),
          observacion: `${DOCUMENTOS_REQUERIDOS.find((d) => d.tipo === doc.tipo)?.nombre}: ${check.observacion}`,
          accionSugerida:
            'Revisar el campo y su procedencia en el PDF original; completar o corregir solo después de confirmar la información. La validación textual no acredita autenticidad.',
          requiereRevisionManual: true,
          evidencia: {
            estado: check.estado,
            paginas: paginas.length ? paginas : [doc.paginaInicio],
            originales: check.valores.map((v) => v.original),
            valores: check.valores,
          },
        });
      }
    });
    return {
      version: VERSION_VALIDACION_DOCUMENTAL,
      fechaSolicitud,
      documentos: resultados,
      hallazgos,
      resumen: {
        comprobadas: resultados
          .flatMap((d) => d.comprobaciones)
          .filter((c) => c.estado === 'OK').length,
        inconsistencias: resultados
          .flatMap((d) => d.comprobaciones)
          .filter((c) => c.estado === 'INCONSISTENCIA').length,
        noVerificables: resultados
          .flatMap((d) => d.comprobaciones)
          .filter((c) => c.estado === 'NO_VERIFICABLE').length,
      },
    };
  }
}
