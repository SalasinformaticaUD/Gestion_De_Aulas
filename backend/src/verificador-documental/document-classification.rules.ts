export type TipoEsperado =
  | 'PERSONERIA'
  | 'PROCURADURIA'
  | 'CONTRALORIA'
  | 'POLICIA_JUDICIAL'
  | 'MEDIDAS_CORRECTIVAS'
  | 'DELITOS_SEXUALES'
  | 'REDAM'
  | 'DECLARACION_VERACIDAD';
export type ReglaDocumento = {
  tipo: TipoEsperado;
  anclas: RegExp[];
  apoyos: RegExp[];
  contexto: RegExp;
};

// Las anclas describen al emisor o al encabezado propio. Una referencia
// incidental a otra entidad en las advertencias no basta para clasificar.
export const REGLAS_DOCUMENTALES: ReglaDocumento[] = [
  {
    tipo: 'PERSONERIA',
    anclas: [
      /LA PERSONERIA DE (?:BOGOTA|BOGOTA D C|DISTRITAL)/,
      /PERSONERIA (?:DISTRITAL|DE BOGOTA).*CERTIFICA/,
    ],
    apoyos: [
      /ANTECEDENTES DISCIPLINARIOS/,
      /REGISTRO DE SANCIONES E INHABILIDADES/,
      /CERTIFICADO ORDINARIO/,
    ],
    contexto: /PERSONERIABOGOTA|PERSONERIA/,
  },
  {
    tipo: 'PROCURADURIA',
    anclas: [
      /LA PROCURADURIA GENERAL DE LA NACION CERTIFICA/,
      /PROCURADURIA GENERAL DE LA NACION/,
    ],
    apoyos: [
      /CERTIFICADO DE ANTECEDENTES/,
      /\bSIRI\b/,
      /REGISTRO DE SANCIONES E INHABILIDADES/,
    ],
    contexto: /PROCURADURIA|\bSIRI\b/,
  },
  {
    tipo: 'CONTRALORIA',
    anclas: [
      /CONTRALORIA DELEGADA PARA RESPONSABILIDAD FISCAL/,
      /CONTRALORIA GENERAL DE LA (?:NACION|REPUBLICA)/,
    ],
    apoyos: [
      /RESPONSABLES FISCALES|RESPONSABLE FISCAL/,
      /\bSIBOR\b/,
      /COBRO COACTIVO/,
    ],
    contexto: /CONTRALORIA|SIBOR/,
  },
  {
    tipo: 'POLICIA_JUDICIAL',
    anclas: [
      /CONSULTA EN LINEA DE ANTECEDENTES PENALES Y REQUERIMIENTOS JUDICIALES/,
      /ANTECEDENTES PENALES Y REQUERIMIENTOS JUDICIALES/,
    ],
    apoyos: [/POLICIA NACIONAL/, /AUTORIDADES JUDICIALES/, /WEBJUDICIAL/],
    contexto: /ANTECEDENTES POLICIA|WEBJUDICIAL|AUTORIDADES JUDICIALES/,
  },
  {
    tipo: 'MEDIDAS_CORRECTIVAS',
    anclas: [
      /REGISTRO NACIONAL DE MEDIDAS CORRECTIVAS/,
      /SISTEMA REGISTRO NACIONAL DE MEDIDAS CORRECTIVAS/,
    ],
    apoyos: [/\bRNMC\b/, /POLICIA NACIONAL/, /MEDIDAS CORRECTIVAS PENDIENTES/],
    contexto: /RNMC|MEDIDAS CORRECTIVAS|SRVCNPC/,
  },
  {
    tipo: 'DELITOS_SEXUALES',
    anclas: [
      /INHABILIDADES DE QUIENES HAYAN SIDO CONDENADOS/,
      /DELITOS SEXUALES COMETIDOS CONTRA MENORES/,
    ],
    apoyos: [
      /CONSULTA (?:EN LINEA DE )?INHABILIDADES/,
      /POLICIA NACIONAL/,
      /REGISTRA INHABILIDAD/,
      /INHABILIDADES POLICIA/,
    ],
    contexto: /DELITOS SEXUALES|INHABILIDADES POLICIA/,
  },
  {
    tipo: 'REDAM',
    anclas: [
      /REGISTRO DE DEUDORES ALIMENTARIOS MOROSOS/,
      /DEUDORES ALIMENTARIOS MOROSOS REDAM/,
    ],
    apoyos: [
      /\bREDAM\b/,
      /MINISTERIO DE TECNOLOGIAS|MINTIC/,
      /CERTIFICA QUE/,
      /INSCRITO EN EL REGISTRO/,
    ],
    contexto: /REDAM|DEUDORES ALIMENTARIOS/,
  },
  {
    tipo: 'DECLARACION_VERACIDAD',
    anclas: [/GC PR 002 FR 038/, /DECLARACION DE VERACIDAD Y CAPACIDAD/],
    apoyos: [
      /PARA CONTRATAR/,
      /UNIVERSIDAD DISTRITAL/,
      /GRAVEDAD DEL JURAMENTO/,
    ],
    contexto: /GC PR 002 FR 038|DECLARACION DE VERACIDAD/,
  },
];

export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
export function paginacion(
  texto: string,
): { actual: number; total: number } | undefined {
  const n = normalizarTexto(texto);
  const explicita =
    /\b(?:PAGINA|PAG|HOJA)\s*(\d{1,3})\s*(?:DE|OF)\s*(\d{1,3})\b/.exec(n);
  const pie = /(?:^|\s)(\d{1,3})\s*\/\s*(\d{1,3})\s*$/.exec(texto.trim());
  const match = explicita ?? pie;
  if (!match) return undefined;
  const actual = Number(match[1]),
    total = Number(match[2]);
  return actual > 0 && actual <= total && total <= 500
    ? { actual, total }
    : undefined;
}
