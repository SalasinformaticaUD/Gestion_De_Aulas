import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  IsBoolean,
  IsArray,
  Max,
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

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  proyectosCurricularesIds?: string[];

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  anioAdquisicion?: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  marca?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  modelo?: string;

  @IsOptional()
  @IsBoolean()
  renovacionTecnologica?: boolean;

  @IsOptional()
  @IsBoolean()
  pendienteIntervencion?: boolean;
}
