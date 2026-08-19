import type { ObservacionEquipoAudiovisual as PrismaObservacionEquipoAudiovisual } from '../../../generated/prisma/client.js';
import type { EquipoAudiovisualEntity } from './equipo-audiovisual.entity';

export class ObservacionEquipoAudiovisualEntity implements PrismaObservacionEquipoAudiovisual {
  declare id: string;
  declare equipoId: string;
  declare contenido: string;
  declare creadoEn: Date;
  declare equipo?: EquipoAudiovisualEntity;
}
