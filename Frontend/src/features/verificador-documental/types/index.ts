export type TipoIdentificacion =
  "CC" | "CE" | "TI" | "PASAPORTE" | "PEP" | "PPT" | "OTRO";
export type ModalidadCarga = "PDF_UNIFICADO" | "PDF_SEPARADOS";
export type EstadoVerificacion =
  | "BORRADOR"
  | "PENDIENTE"
  | "PROCESANDO"
  | "SATISFACTORIA"
  | "CON_INCONSISTENCIAS"
  | "INCOMPLETA"
  | "FALLIDA";
export type NuevaVerificacion = {
  tipoIdentificacion: TipoIdentificacion;
  numeroIdentificacion: string;
  nombreCompleto: string;
  fechaSolicitud: string;
  modalidadCarga: ModalidadCarga;
};
export type Verificacion = NuevaVerificacion & {
  id: string;
  estado: EstadoVerificacion;
  creadoEn: string;
  actualizadoEn: string;
  finalizadoEn: string | null;
  versionClasificacion: string | null;
  versionComparacion: string | null;
  resultadoComparacion: ResultadoComparacion | null;
  creadoPor: { id: string; nombreCompleto: string };
  _count?: { archivos: number; hallazgos: number };
};
export type PaginaVerificaciones = {
  data: Verificacion[];
  meta: { pagina: number; limite: number; total: number; totalPaginas: number };
};
export type CatalogosDocumentales = {
  documentosRequeridos: { tipo: string; nombre: string }[];
  validacion: "TODOS_LOS_CAMPOS_DISPONIBLES";
  limitesCarga: LimitesCarga;
};
export type DetalleVerificacion = Verificacion & {
  archivos: {
    id: string;
    nombreOriginal: string;
    tamanoBytes: number;
    ordenCarga: number;
    numeroPaginas: number | null;
    documentos: {
      id: string;
      tipo: string;
      paginaInicio: number;
      paginaFin: number;
      requiereOcr: boolean;
      estadoClasificacion:
        | "PENDIENTE"
        | "IDENTIFICADO"
        | "NO_ESPERADO"
        | "INCIERTO"
        | "SIN_TEXTO"
        | "ERROR_EXTRACCION";
      puntajeClasificacion: number;
      evidenciasClasificacion: {
        senales?: string[];
        candidatos?: string[];
        porContexto?: boolean;
      } | null;
      requiereRevisionManual: boolean;
    }[];
  }[];
  hallazgos: {
    id: string;
    documentoId: string | null;
    codigo: string;
    pagina: number | null;
    evidencia?: { paginas?: number[]; originales?: string[] } | null;
    campo: string;
    valorEncontrado: string | null;
    valorReferencia: string | null;
    observacion: string;
    accionSugerida: string;
    requiereRevisionManual: boolean;
  }[];
};

export type LimitesCarga = {
  maxArchivos: number;
  maxArchivoBytes: number;
  maxTotalBytes: number;
  maxPaginasPorArchivo: number;
};
export type ArchivoSeleccionado = {
  id: string;
  archivo: File;
  estado: "VALIDANDO" | "LISTO" | "ERROR";
  error?: string;
  sha256?: string;
};
export type EstadoCarga =
  "INACTIVO" | "CREANDO" | "SUBIENDO" | "PROCESANDO" | "COMPLETADO" | "ERROR";

export type DatoPersonalExtraido = {
  campo: string;
  original: string;
  pagina: number;
  regla: string;
  ordenNombre?: string;
  formatoFecha?: string;
};
export type ObservacionComparacion = DatoPersonalExtraido & {
  normalizado: string | null;
  documentoIndice: number;
  tipo: string;
  motivo?: string;
};
export type CampoComparado = {
  campo: string;
  estado: string;
  documentosDisponibles: number;
  fuentesIndependientes: number;
  grupos: {
    valor: string;
    votos: number;
    observaciones: ObservacionComparacion[];
  }[];
  noInterpretables: ObservacionComparacion[];
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
export type ResultadoComparacion = {
  version: string;
  campos: CampoComparado[];
  resumen: {
    camposConDiferencias: number;
    camposConEmpate: number;
    camposCoincidentes: number;
    camposInsuficientes: number;
  };
  validacionDocumental?: {
    version: string;
    fechaSolicitud: string;
    periodoEsperado?: string | null;
    resumen: {
      comprobadas: number;
      inconsistencias: number;
      noVerificables: number;
    };
    documentos: {
      documentoIndice: number;
      tipo: string;
      comprobaciones: {
        campo: string;
        estado: "OK" | "INCONSISTENCIA" | "NO_VERIFICABLE";
        codigo: string;
        observacion: string;
        valores: {
          original: string;
          pagina: number;
          normalizado?: string | null;
        }[];
        esperado?: string;
      }[];
    }[];
  };
};
