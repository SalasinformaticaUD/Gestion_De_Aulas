import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateEquipoAudiovisualDto } from './create-equipo-audiovisual.dto';

export class UpdateEquipoAudiovisualDto extends PartialType(
  OmitType(CreateEquipoAudiovisualDto, ['estado'] as const),
) {}
