import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateLimpiezaAulaDto } from './create-limpieza-aula.dto';

export class UpdateLimpiezaAulaDto extends PartialType(CreateLimpiezaAulaDto) {
  @IsOptional()
  @IsBoolean()
  limpiarObservacion?: boolean;
}
