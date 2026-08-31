import type { DetallePrestamoAudiovisual as PrismaDetallePrestamoAudiovisual } from '@prisma/client';
import type { EquipoAudiovisualEntity } from './equipo-audiovisual.entity';
import type { PrestamoAudiovisualEntity } from './prestamo-audiovisual.entity';

export class DetallePrestamoAudiovisualEntity implements PrismaDetallePrestamoAudiovisual {
  declare prestamoId: string;
  declare equipoId: string;
  declare estadoFisicoSalida: string | null;
  declare estadoFuncionalSalida: string | null;
  declare estadoFisicoDevolucion: string | null;
  declare estadoFuncionalDevolucion: string | null;
  declare prestamo?: PrestamoAudiovisualEntity;
  declare equipo?: EquipoAudiovisualEntity;
}
