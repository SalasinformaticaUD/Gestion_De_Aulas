import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Matches,
  Min,
} from 'class-validator';
import { EstadoPrestamo } from '../../../generated/prisma/enums.js';

const FECHA_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class FindPracticasLibresDto {
  @IsOptional()
  @IsIn(['actuales', 'historial'])
  vista?: 'actuales' | 'historial';

  @IsOptional()
  @IsEnum(EstadoPrestamo)
  estado?: EstadoPrestamo;

  @IsOptional()
  @Matches(FECHA_PATTERN, { message: 'fecha debe tener formato YYYY-MM-DD' })
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsUUID()
  aulaId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite?: number;
}
