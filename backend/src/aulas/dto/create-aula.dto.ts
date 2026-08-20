import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { EstadoAula } from '../../../generated/prisma/enums.js';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateAulaDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  codigo!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  ubicacion!: string;

  @IsInt()
  @Min(1)
  capacidad!: number;

  @IsOptional()
  @IsObject()
  caracteristicas?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(EstadoAula)
  estado?: EstadoAula;

  @IsOptional()
  @IsUUID()
  proyectoCurricularId?: string;
}
