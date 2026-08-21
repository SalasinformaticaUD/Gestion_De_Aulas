export type AulaEstadoFisico =
  | 'OPERATIVA'
  | 'MANTENIMIENTO'
  | 'FUERA_DE_SERVICIO';

export type SoftwareAulaApi = {
  id: string;
  nombre: string;
  version: string;
  descripcion: string | null;
  instaladoEn: string;
};

export type HistorialAulaApi = {
  id: string;
  fecha: string;
  tipo:
    | 'SOFTWARE_INSTALADO'
    | 'OBSERVACION'
    | 'TAREA'
    | 'LIMPIEZA'
    | 'PRACTICA_LIBRE'
    | 'PRESTAMO_DOCENTE';
  descripcion: string;
  responsable: string | null;
};

export type AulaApiResponse = {
  id: string;
  codigo: string;
  ubicacion: string;
  piso: number | null;
  capacidad: number;
  estado: AulaEstadoFisico;
  caracteristicas: Record<string, unknown> | null;
  proyectoCurricular: { id: string; nombre: string } | null;
  software: SoftwareAulaApi[];
  historial: HistorialAulaApi[];
  creadoEn: string;
  actualizadoEn: string;
};
