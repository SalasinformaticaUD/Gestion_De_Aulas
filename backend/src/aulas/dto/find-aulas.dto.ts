import { Transform } from 'class-transformer';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { EstadoAula } from '../../../generated/prisma/enums.js';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class FindAulasDto {
  @IsOptional()
  @IsEnum(EstadoAula)
  estado?: EstadoAula;

  @Transform(trim)
  @IsOptional()
  @IsString()
  ubicacion?: string;

  @IsOptional()
  @IsUUID()
  proyectoCurricularId?: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  codigo?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  capacidadMin?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  capacidadMax?: number;

  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  pendienteIntervencion?: boolean;
}
