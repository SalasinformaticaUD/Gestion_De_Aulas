export type EstadoSolicitud =
  | "PENDIENTE_REVISION"
  | "REQUIERE_AJUSTES"
  | "APROBADA_PARCIAL"
  | "APROBADA"
  | "EN_EJECUCION"
  | "FINALIZADA"
  | "RECHAZADA"
  | "CANCELADA";

export type EstadoNormalizacion = "PENDIENTE" | "COINCIDENCIA" | "NUEVO" | "AMBIGUO" | "DESCARTADO";

export type SolicitudInstalacion = {
  id: string;
  fechaPeticion: string;
  docenteId: string | null;
  docenteNombreOriginal: string | null;
  docenteCorreoOriginal: string | null;
  docente: { id: string; nombre: string; correo: string | null } | null;
  proyectoCurricularId: string | null;
  proyectoCurricularOriginal: string | null;
  proyectoCurricular: { id: string; nombre: string } | null;
  periodoId: string | null;
  periodo: { id: string; nombre: string } | null;
  observacionGeneral: string | null;
  consentimientoDatos: boolean | null;
  historicaAlImportar: boolean;
  motivoHistorialInicial: "FECHA_ANTERIOR_CORTE" | "SOFTWARE_MARCADO_VERDE" | null;
  estado: EstadoSolicitud;
  alertas: string[] | null;
  importacion: { id: string; nombreArchivo: string; creadoEn: string };
  items: ItemSolicitud[];
  progresoTareas: ProgresoTareas;
};

export type ProgresoTareas = {
  total: number;
  pendientes: number;
  enProceso: number;
  completadas: number;
  canceladas: number;
  inventarioConfirmado: number;
  porcentaje: number;
};

export type ItemSolicitud = {
  id: string;
  posicion: number;
  asignaturaId: string | null;
  asignaturaOriginal: string | null;
  asignatura: { id: string; nombre: string; codigo: string } | null;
  estadoRevision: "PENDIENTE" | "VALIDADO" | "REQUIERE_AJUSTES" | "DESCARTADO";
  observaciones: string | null;
  aulas: Array<{
    id: string;
    valorOriginal: string;
    valorNormalizado: string | null;
    aulaId: string | null;
    estado: EstadoNormalizacion;
    aula: { id: string; codigo: string; ubicacion: string } | null;
  }>;
  softwareSolicitado: Array<{
    id: string;
    nombreOriginal: string;
    nombreNormalizado: string | null;
    versionNormalizada: string | null;
    softwareId: string | null;
    estado: EstadoNormalizacion;
    software: { id: string; nombre: string; version: string } | null;
    tareasGeneradas: Array<{
      tareaId: string;
      itemAulaId: string;
      inventarioConfirmadoEn: string | null;
      tarea: {
        id: string;
        titulo: string;
        estado: "PENDIENTE" | "EN_PROCESO" | "SUSPENDIDA" | "COMPLETADA" | "RECHAZADA" | "CANCELADA";
      };
    }>;
  }>;
};

export type SeleccionAprobacion = {
  items: Array<{
    itemId: string;
    software: Array<{ softwareSolicitadoId: string; aulaIds: string[] }>;
  }>;
};

export type PrevisualizacionAprobacion = {
  solicitudId: string;
  aprobacion: "TOTAL" | "PARCIAL";
  tareas: Array<{
    softwareSolicitadoId: string;
    itemAulaId: string;
    titulo: string;
    software: string;
    version: string | null;
    aula: string;
    asignatura: string | null;
    yaExiste: boolean;
    tareaId: string | null;
  }>;
};

export type CatalogosNormalizacion = {
  docentes: Array<{ id: string; nombre: string; correo: string | null }>;
  proyectosCurriculares: Array<{ id: string; nombre: string }>;
  asignaturas: Array<{ id: string; codigo: string; nombre: string; proyectoCurricularId: string | null }>;
  aulas: Array<{ id: string; codigo: string; ubicacion: string }>;
  software: Array<{ id: string; nombre: string; version: string }>;
  periodos: Array<{ id: string; nombre: string; activo: boolean }>;
};

export type FiltrosSolicitudes = {
  vista: "actuales" | "historial";
  q?: string;
  desde?: string;
  hasta?: string;
  proyectoCurricular?: string;
  asignatura?: string;
  aula?: string;
  software?: string;
  pagina?: number;
};

export type PrevisualizacionImportacion = {
  nombreArchivo: string;
  importacionExistente: { id: string; creadoEn: string; estado: string } | null;
  resumen: {
    totalSolicitudes: number;
    listasParaImportar: number;
    observadas: number;
    ambiguas: number;
    posiblesDuplicados: number;
    filasRechazadas: number;
  };
  errores: Array<{ fila: number; mensaje: string }>;
  solicitudes: Array<{
    filaOrigen: number;
    fechaPeticion: string;
    docenteOriginal: string | null;
    proyectoOriginal: string | null;
    alertas: string[];
    duplicados: string[];
    items: Array<{
      posicion: number;
      aulas: Array<{ valorOriginal: string; valorNormalizado: string | null; estado: EstadoNormalizacion }>;
      software: Array<{ nombreOriginal: string; nombreNormalizado: string | null; estado: EstadoNormalizacion }>;
    }>;
  }>;
};
