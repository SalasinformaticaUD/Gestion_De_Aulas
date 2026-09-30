import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TipoObservacion } from '@prisma/client';

export class CreateObservacioneDto {
  @IsOptional()
  @IsUUID()
  aulaId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  ubicacionTexto?: string | null;

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
