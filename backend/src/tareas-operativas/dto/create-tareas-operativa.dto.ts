import {
  IsBoolean,
  IsArray,
  IsDateString,
  IsOptional,
  IsEnum,
  IsString,
  IsUUID,
  ArrayMaxSize,
  MaxLength,
} from 'class-validator';
import { PrioridadTarea } from '@prisma/client';
export class CreateTareasOperativaDto {
  @IsOptional() @IsUUID() aulaId?: string;
  /** Aulas para una misma tarea agrupada. Cada aula conserva su propio seguimiento. */
  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsUUID('4', { each: true }) aulaIds?: string[];
  @IsOptional() @IsUUID() responsableId?: string;
  @IsString() @MaxLength(200) titulo!: string;
  @IsOptional() @IsString() @MaxLength(2000) descripcion?: string;
  @IsOptional() @IsString() @MaxLength(100) tipo?: string;
  @IsOptional() @IsEnum(PrioridadTarea) prioridad?: PrioridadTarea;
  @IsOptional() @IsString() @MaxLength(2000) observaciones?: string;
  @IsOptional() @IsBoolean() afectaDisponibilidad?: boolean;
  @IsOptional() @IsDateString() inicio?: string;
  @IsOptional() @IsDateString() fin?: string;
}
