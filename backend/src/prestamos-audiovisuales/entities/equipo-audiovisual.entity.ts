import type { EquipoAudiovisual as PrismaEquipoAudiovisual } from '../../../generated/prisma/client.js';
import type { DetallePrestamoAudiovisualEntity } from './detalle-prestamo-audiovisual.entity';
import type { MantenimientoEquipoAudiovisualEntity } from './mantenimiento-equipo-audiovisual.entity';
import type { ObservacionEquipoAudiovisualEntity } from './observacion-equipo-audiovisual.entity';

export class EquipoAudiovisualEntity implements PrismaEquipoAudiovisual {
  declare id: string;
  declare codigoInventario: string;
  declare nombre: string;
  declare tipo: string;
  declare estado: PrismaEquipoAudiovisual['estado'];
  declare observacion: string | null;
  declare detallesPrestamo?: DetallePrestamoAudiovisualEntity[];
  declare mantenimientos?: MantenimientoEquipoAudiovisualEntity[];
  declare observaciones?: ObservacionEquipoAudiovisualEntity[];
}
