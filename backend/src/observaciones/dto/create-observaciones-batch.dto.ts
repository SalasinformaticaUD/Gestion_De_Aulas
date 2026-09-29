import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TipoObservacion } from '@prisma/client';

export class CreateObservacionesBatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  aulaIds!: string[];

  @IsOptional()
  @IsEnum(TipoObservacion)
  tipo?: TipoObservacion;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  contenido!: string;

  @IsOptional()
  @IsDateString()
  vigenteDesde?: string | null;

  @IsOptional()
  @IsDateString()
  vigenteHasta?: string | null;
}
