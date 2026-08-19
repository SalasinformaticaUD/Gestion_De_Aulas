import { PartialType } from '@nestjs/mapped-types';
import { CreatePrestamosAudiovisualeDto } from './create-prestamos-audiovisuale.dto';

export class UpdatePrestamosAudiovisualeDto extends PartialType(
  CreatePrestamosAudiovisualeDto,
) {}
