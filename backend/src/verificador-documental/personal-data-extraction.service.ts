import { DOCUMENTOS_REQUERIDOS } from './verificador-documental.constants';
import { Injectable } from '@nestjs/common';
import type { DocumentoClasificado } from './document-classification.service';
import type { CampoPersonal, DatoPersonal } from './personal-data.types';

const TIPO = String.raw`(?:c[ée]dula\s+de\s+ciudadan[ií]a|c[ée]dula\s+de\s+extranjer[ií]a|tarjeta\s+de\s+identidad|pasaporte|C\.?C\.?|C\.?E\.?|T\.?I\.?|PPT|PEP)`;
const ID = String.raw`((?=[\p{L}\d.-]*\d)[\p{L}\d][\p{L}\d.-]*(?: [\d]{3}(?!\d))*)`;
const NUMERO = String.raw`(?:(?:N[úu]mero|N[º°]|No\.?|N[úu]m\.?)\s*[:.]?\s*)?`;
const ETIQUETAS: Array<[CampoPersonal, string]> = [
  ['primerNombre', 'primer nombre'],
  ['segundoNombre', 'segundo nombre'],
  ['primerApellido', 'primer apellido'],
  ['segundoApellido', 'segundo apellido'],
  ['nombreCompleto', 'nombre completo|nombres y apellidos'],
  ['fechaNacimiento', 'fecha de nacimiento'],
  ['lugarNacimiento', 'lugar de nacimiento'],
  [
    'lugarExpedicion',
    'lugar de expedici[oó]n(?: del documento de identidad| de la c[ée]dula)',
  ],
  [
    'fechaExpedicion',
    'fecha de expedici[oó]n(?: del documento de identidad| de la c[ée]dula)',
  ],
  ['nacionalidad', 'nacionalidad'],
  ['sexo', 'sexo'],
];

@Injectable()
export class PersonalDataExtractionService {
  extraer(documento: DocumentoClasificado): DatoPersonal[] {
    if (
      documento.estadoClasificacion !== 'IDENTIFICADO' ||
      !DOCUMENTOS_REQUERIDOS.some((d) => d.tipo === documento.tipo)
    )
      return [];
    const datos: DatoPersonal[] = [];
    const add = (
      campo: CampoPersonal,
      original: string,
      pagina: number,
      regla: string,
      extra: Partial<DatoPersonal> = {},
    ) => {
      if (original.length > 250 || !original.trim()) return;
      if (
        !datos.some(
          (d) =>
            d.campo === campo && d.original === original && d.pagina === pagina,
        )
      )
        datos.push({ campo, original, pagina, regla, ...extra });
    };
    for (const pagina of documento.paginasTexto) {
      const text = pagina.texto;
      for (const match of text.matchAll(
        new RegExp(String.raw`\b(${TIPO})\s*${NUMERO}${ID}`, 'giu'),
      )) {
        if (!/\d/.test(match[2])) continue;
        add(
          'tipoIdentificacion',
          match[1],
          pagina.pagina,
          'tipo-junto-a-identificacion',
        );
        add(
          'numeroIdentificacion',
          match[2],
          pagina.pagina,
          'identificacion-del-titular',
        );
        if (['PERSONERIA', 'DECLARACION_VERACIDAD'].includes(documento.tipo)) {
          const after = text.slice((match.index ?? 0) + match[0].length);
          const place = /^[ \t]+de[ \t]+([^\n,]{2,80})/iu.exec(after);
          if (place)
            add(
              'lugarExpedicion',
              place[1],
              pagina.pagina,
              'lugar-junto-a-identificacion',
            );
        }
      }
      for (const match of text.matchAll(
        /(?:No\.?|N[úu]mero)\s*(?:de\s+)?Identificaci[oó]n\s*[:.]?\s*([\d][\d.-]*)/giu,
      ))
        add(
          'numeroIdentificacion',
          match[1],
          pagina.pagina,
          'numero-identificacion-etiquetado',
        );
      for (const match of text.matchAll(
        new RegExp(
          String.raw`Tipo\s+(?:de\s+)?Documento\s*:?\s*(${TIPO})`,
          'giu',
        ),
      ))
        add(
          'tipoIdentificacion',
          match[1],
          pagina.pagina,
          'tipo-documento-etiquetado',
        );
      for (const match of text.matchAll(
        /(?:se[ñn]or\s*\(a\)|Yo,)\s+([\p{L}'’ .-]+?)(?=,?\s*(?:quien se identifica|identificado\s*\(a\)))/giu,
      ))
        add('nombreCompleto', match[1], pagina.pagina, 'nombre-del-titular', {
          ordenNombre: 'NOMBRES_APELLIDOS',
        });
      if (['POLICIA_JUDICIAL', 'DELITOS_SEXUALES'].includes(documento.tipo))
        for (const match of text.matchAll(
          /Apellidos\s+y\s+Nombres\s*:?\s*([^\n]+)/giu,
        ))
          add(
            'nombreCompleto',
            match[1],
            pagina.pagina,
            'apellidos-antes-de-nombres',
            { ordenNombre: 'APELLIDOS_NOMBRES' },
          );
      const etiquetas: Array<[CampoPersonal, string]> = [...ETIQUETAS];
      if (documento.tipo === 'DECLARACION_VERACIDAD')
        etiquetas.push(
          ['lugarExpedicion', 'lugar de expedici[oó]n'],
          ['fechaExpedicion', 'fecha de expedici[oó]n'],
        );
      for (const [campo, label] of etiquetas) {
        const regex = new RegExp(
          String.raw`(?:^|[\n;|])\s*(?:${label})(?:\s*\((DD\/MM\/(?:AAAA|YYYY)|MM\/DD\/(?:AAAA|YYYY))\))?[ \t]*(?::|[ \t]{2,})[ \t]*([^\n;|]+)`,
          'gimu',
        );
        for (const match of text.matchAll(regex)) {
          // No absorber el siguiente campo en formularios con varias etiquetas por línea.
          const original = match[2].split(
            /\s+(?:(?:Primer|Segundo) (?:Nombre|Apellido)|Fecha de nacimiento|Lugar de expedici[oó]n)\s*:/iu,
          )[0];
          add(campo, original, pagina.pagina, 'campo-personal-etiquetado', {
            ...(campo === 'nombreCompleto'
              ? { ordenNombre: 'NOMBRES_APELLIDOS' as const }
              : {}),
            ...(match[1]
              ? {
                  formatoFecha: match[1].toUpperCase().startsWith('DD')
                    ? ('DMY' as const)
                    : ('MDY' as const),
                }
              : {}),
          });
        }
      }
      if (documento.tipo === 'DECLARACION_VERACIDAD')
        for (const [campo, label] of [
          ['correo', 'correo electr[oó]nico'],
          ['telefono', 'tel[ée]fono'],
        ] as const) {
          for (const match of text.matchAll(
            new RegExp(
              String.raw`(?:^|\n)\s*${label}[ \t]*:[ \t]*([^\n]+)`,
              'gimu',
            ),
          ))
            add(campo, match[1], pagina.pagina, 'contacto-personal-etiquetado');
        }
    }
    return datos;
  }
}
