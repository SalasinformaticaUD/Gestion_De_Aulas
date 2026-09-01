import {
  IsBoolean,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class FinalizarPracticaLibreDto {
  @IsOptional()
  @IsISO8601({ strict: true })
  finReal?: string;

  @IsOptional()
  @IsBoolean()
  cumplioReglas?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacionesIncumplimiento?: string;
}
