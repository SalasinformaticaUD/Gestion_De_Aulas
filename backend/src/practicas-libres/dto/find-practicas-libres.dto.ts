import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
  Matches,
} from 'class-validator';
import { EstadoPrestamo } from '../../../generated/prisma/enums.js';

const FECHA_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class FindPracticasLibresDto {
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
}
