import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TipoObservacion } from '../../../generated/prisma/enums.js';

export class CreateObservacioneDto {
  @IsUUID()
  aulaId!: string;

  @IsOptional()
  @IsEnum(TipoObservacion)
  tipo?: TipoObservacion;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  contenido!: string;

  @IsOptional()
  @IsDateString()
  vigenteHasta?: string | null;
}
