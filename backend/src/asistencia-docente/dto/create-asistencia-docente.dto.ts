import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { EstadoAsistencia } from '../../../generated/prisma/enums.js';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const FECHA_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreateAsistenciaDocenteDto {
  @IsUUID()
  claseId!: string;

  @Matches(FECHA_PATTERN, { message: 'fecha debe tener formato YYYY-MM-DD' })
  @IsDateString()
  fecha!: string;

  @IsOptional()
  @IsEnum(EstadoAsistencia)
  estado?: EstadoAsistencia;

  @IsOptional()
  @IsUUID()
  registradoPorId?: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacion?: string;
}
