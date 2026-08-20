import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
  Matches,
} from 'class-validator';
import { EstadoAsistencia } from '../../../generated/prisma/enums.js';

const FECHA_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class FindAsistenciasDto {
  @IsOptional()
  @Matches(FECHA_PATTERN, { message: 'fecha debe tener formato YYYY-MM-DD' })
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsUUID()
  aulaId?: string;

  @IsOptional()
  @IsEnum(EstadoAsistencia)
  estado?: EstadoAsistencia;
}
