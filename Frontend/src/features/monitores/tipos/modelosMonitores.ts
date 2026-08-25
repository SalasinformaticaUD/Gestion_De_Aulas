export type DependenciaMonitor = "Aulas de Software" | "Laboratorios de Ingeniería" | "Soporte Tecnológico";
export type EstadoHoraExtra = "PENDIENTE" | "APROBADA" | "RECHAZADA" | "NO_APLICA";

export type Monitor = {
  id: string;
  nombre: string;
  codigo: string;
  dependencia: DependenciaMonitor;
  correo: string;
};

export type ResumenMonitor = {
  monitorId: string;
  horasNormales: number;
  horasExtraAprobadas: number;
  horasExtraPendientes: number;
  horasAnotaciones: number;
};

export type SesionMonitor = {
  id: string;
  monitorId: string;
  fecha: string;
  entrada: string;
  salida: string;
  horasNormales: number;
  horasExtra: number;
  horasRetraso: number;
  estadoExtra: EstadoHoraExtra;
  retrasoExento?: boolean;
  excepcion?: string;
};

export type AnotacionMonitor = {
  id: string;
  monitorId: string;
  fecha: string;
  tipo: "VIRTUAL" | "PERMISO" | "CORRECCION" | "OTRA";
  accion: "SUMAR" | "DESCONTAR";
  horas: number;
  motivo: string;
  responsable: string;
};

export type ExcepcionHorario = {
  id: string;
  nombre: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  dependencia: DependenciaMonitor | "TODAS";
  ignorarRetrasos: boolean;
  aprobarHorasExtra: boolean;
  activa: boolean;
};

export type RegistroConciliacion = {
  id: string;
  nombreOriginal: string;
  dependencia: DependenciaMonitor;
  fecha: string;
  motivo: string;
};

export type HorarioMonitor = {
  id: string;
  monitorId: string;
  dia: "Lunes" | "Martes" | "Miércoles" | "Jueves" | "Viernes" | "Sábado";
  horaInicio: string;
  horaFin: string;
  activo: boolean;
};

export type ResultadoImportacion = {
  archivo: string;
  monitoresProcesados: number;
  horariosCreados: number;
  reactivados: number;
  filasIgnoradas: number;
  monitoresNoEncontrados: string[];
  monitoresNoAutorizados: string[];
};

export type RegistroCrudo = {
  id: string;
  nombreOriginal: string;
  dependencia: DependenciaMonitor;
  fecha: string;
  estado: "CONCILIADO" | "PENDIENTE" | "IGNORADO";
  monitorId?: string;
};
