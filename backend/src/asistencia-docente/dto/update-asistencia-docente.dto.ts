import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { EstadoAsistencia } from '../../../generated/prisma/enums.js';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateAsistenciaDocenteDto {
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
