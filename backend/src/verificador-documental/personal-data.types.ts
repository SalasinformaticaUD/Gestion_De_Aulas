export const CAMPOS_PERSONALES = [
  'nombreCompleto',
  'primerNombre',
  'segundoNombre',
  'primerApellido',
  'segundoApellido',
  'numeroIdentificacion',
  'tipoIdentificacion',
  'fechaNacimiento',
  'lugarExpedicion',
  'fechaExpedicion',
  'lugarNacimiento',
  'nacionalidad',
  'sexo',
  'correo',
  'telefono',
] as const;
export type CampoPersonal = (typeof CAMPOS_PERSONALES)[number];
export type DatoPersonal = {
  campo: CampoPersonal;
  original: string;
  pagina: number;
  regla: string;
  ordenNombre?: 'NOMBRES_APELLIDOS' | 'APELLIDOS_NOMBRES';
  formatoFecha?: 'DMY' | 'MDY' | 'YMD';
};
export type DatoNormalizado = DatoPersonal & {
  normalizado: string | null;
  motivo?: string;
};
export type DocumentoPersonal = {
  documentoIndice: number;
  tipo: string;
  datos: DatoPersonal[];
};
export type ObservacionPersonal = DatoNormalizado & {
  documentoIndice: number;
  tipo: string;
};
export type GrupoComparacion = {
  valor: string;
  votos: number;
  observaciones: ObservacionPersonal[];
};
export type EstadoComparacion =
  | 'SIN_DATOS'
  | 'INFORMACION_INSUFICIENTE'
  | 'COINCIDENCIA_EXACTA'
  | 'COINCIDENCIA_NORMALIZADA'
  | 'DIFERENCIAS'
  | 'EMPATE'
  | 'MAYORIA_RELATIVA'
  | 'CONFLICTO_INTERNO';
export type ResultadoCampo = {
  campo: CampoPersonal;
  estado: EstadoComparacion;
  documentosDisponibles: number;
  fuentesIndependientes: number;
  grupos: GrupoComparacion[];
  noInterpretables: ObservacionPersonal[];
  tiposEnConflicto: string[];
  mayoritario: {
    valor: string;
    votos: number;
    esMayoriaAbsoluta: boolean;
  } | null;
  referenciaIngresada?: {
    original: string;
    normalizado: string | null;
    coincide: boolean | null;
  };
};
export type HallazgoPersonal = {
  documentoIndice: number;
  pagina: number;
  codigo: string;
  campo: CampoPersonal;
  valorEncontrado: string;
  valorReferencia?: string;
  observacion: string;
  accionSugerida: string;
  requiereRevisionManual: true;
  evidencia: {
    paginas: number[];
    originales: string[];
    grupos: GrupoComparacion[];
  };
};
