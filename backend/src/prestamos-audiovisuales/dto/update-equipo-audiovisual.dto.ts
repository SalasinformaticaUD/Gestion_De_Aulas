import { PartialType } from '@nestjs/mapped-types';
import { CreateEquipoAudiovisualDto } from './create-equipo-audiovisual.dto';

export class UpdateEquipoAudiovisualDto extends PartialType(
  CreateEquipoAudiovisualDto,
) {}
