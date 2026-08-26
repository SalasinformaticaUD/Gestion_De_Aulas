import { EstadoAula } from '../../../generated/prisma/enums.js';

export type EstadoCalculadoDisponibilidad =
  'disponible' | 'ocupada' | 'reservada' | 'mantenimiento' | 'bloqueada';

export type TipoFuenteDisponibilidad =
  | 'estado-aula'
  | 'restriccion'
  | 'clase-programada'
  | 'prestamo-docente'
  | 'practica-libre'
  | 'tarea-operativa'
  | 'limpieza-programada';

export class AulaResumenDisponibilidad {
  declare id: string;
  declare codigo: string;
  declare ubicacion: string;
  declare capacidad: number;
  declare estado: EstadoAula;
}

export class FuenteDisponibilidad {
  declare tipo: TipoFuenteDisponibilidad;
  declare id: string;
  declare descripcion: string;
  declare estado?: string;
}

export class SiguienteActividadDisponibilidad extends FuenteDisponibilidad {
  declare horaInicio: string;
  declare horaFin: string | null;
}

export class BloqueDisponibilidad {
  declare fecha: string;
  declare horaInicio: string;
  declare horaFin: string;
  declare duracionHoras: number;
}

export class DisponibilidadAula {
  declare aula: AulaResumenDisponibilidad;
  declare bloque: BloqueDisponibilidad;
  declare estadoCalculado: EstadoCalculadoDisponibilidad;
  declare motivo: string;
  declare bloqueActual: FuenteDisponibilidad | null;
  declare siguienteActividad: SiguienteActividadDisponibilidad | null;
  declare fuentes: FuenteDisponibilidad[];
  declare calculadoEn: Date;
  declare persistido: false;
}

export class ResumenDisponibilidadDia {
  declare fecha: string;
  declare rangoOperativo: {
    horaInicio: string;
    horaFin: string;
    duracionBloqueHoras: number;
  };
  declare bloques: Array<{
    horaInicio: string;
    horaFin: string;
    aulas: DisponibilidadAula[];
  }>;
  declare calculadoEn: Date;
  declare persistido: false;
}
