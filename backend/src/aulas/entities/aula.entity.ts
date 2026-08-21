import { EstadoAula } from '../../../generated/prisma/enums.js';

export type HistorialAula = {
  id: string;
  fecha: Date;
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

export class Aula {
  declare id: string;
  declare codigo: string;
  declare ubicacion: string;
  declare piso: number | null;
  declare capacidad: number;
  declare estado: EstadoAula;
  declare caracteristicas: unknown;
  declare proyectoCurricular: { id: string; nombre: string } | null;
  declare software: Array<{
    id: string;
    nombre: string;
    version: string;
    descripcion: string | null;
    instaladoEn: Date;
  }>;
  declare historial: HistorialAula[];
  declare creadoEn: Date;
  declare actualizadoEn: Date;
}
