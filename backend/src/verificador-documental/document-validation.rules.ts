import type { TipoEsperado } from './document-classification.rules';

// Requisitos del trámite y estructuras observadas. No son reglas de
// autenticidad, habilitación jurídica ni plazos legales de vigencia.
export const REQUISITOS_CERTIFICADOS: Partial<
  Record<TipoEsperado, { nombre: boolean; resultado: RegExp }>
> = {
  PERSONERIA: {
    nombre: true,
    resultado:
      /\b(?:NO\s+)?REGISTRA\s+SANCIONES\s+(?:NI|E|Y)\s+INHABILIDADES(?:\s+VIGENTES)?/giu,
  },
  PROCURADURIA: {
    nombre: true,
    resultado:
      /\b(?:NO\s+)?REGISTRA\s+SANCIONES\s+(?:NI|E|Y)\s+INHABILIDADES(?:\s+VIGENTES)?/giu,
  },
  CONTRALORIA: {
    nombre: false,
    resultado:
      /\b(?:NO\s+)?SE\s+ENCUENTRA\s+REPORTADO\s+COMO\s+RESPONSABLE\s+FISCAL/giu,
  },
  POLICIA_JUDICIAL: {
    nombre: true,
    resultado:
      /\b(?:NO\s+)?TIENE\s+ASUNTOS\s+PENDIENTES\s+CON\s+LAS\s+AUTORIDADES\s+JUDICIALES/giu,
  },
  MEDIDAS_CORRECTIVAS: {
    nombre: false,
    resultado:
      /\b(?:NO\s+)?TIENE\s+MEDIDAS\s+CORRECTIVAS\s+PENDIENTES(?:\s+POR\s+CUMPLIR)?/giu,
  },
  DELITOS_SEXUALES: {
    nombre: true,
    resultado: /\b(?:NO\s+)?REGISTRA\s+INHABILIDAD(?:ES)?\b/giu,
  },
  REDAM: {
    nombre: false,
    resultado:
      /\b(?:NO\s+)?SE\s+ENCUENTRA\s+INSCRITO\s+EN\s+EL\s+REGISTRO\s+DE\s+DEUDORES\s+ALIMENTARIOS\s+MOROSOS/giu,
  },
};
