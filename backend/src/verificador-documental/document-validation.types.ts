export type EvidenciaDocumental = {
  original: string;
  pagina: number;
  normalizado?: string | null;
};
export type ComprobacionDocumental = {
  campo: string;
  estado: 'OK' | 'INCONSISTENCIA' | 'NO_VERIFICABLE';
  codigo: string;
  observacion: string;
  valores: EvidenciaDocumental[];
  esperado?: string;
};
export type ValidacionPorDocumento = {
  documentoIndice: number;
  tipo: string;
  comprobaciones: ComprobacionDocumental[];
};
export type HallazgoDocumental = {
  documentoIndice: number;
  pagina: number;
  codigo: string;
  campo: string;
  valorEncontrado?: string;
  valorReferencia?: string;
  observacion: string;
  accionSugerida: string;
  requiereRevisionManual: true;
  evidencia: {
    estado: ComprobacionDocumental['estado'];
    paginas: number[];
    originales: string[];
    valores: EvidenciaDocumental[];
  };
};
