import type { MantenimientoEquipoAudiovisual as PrismaMantenimientoEquipoAudiovisual } from '@prisma/client';
import type { EquipoAudiovisualEntity } from './equipo-audiovisual.entity';

export class MantenimientoEquipoAudiovisualEntity implements PrismaMantenimientoEquipoAudiovisual {
  declare id: string;
  declare equipoId: string;
  declare inicioEn: Date;
  declare finEn: Date | null;
  declare observacion: string | null;
  declare equipo?: EquipoAudiovisualEntity;
}
