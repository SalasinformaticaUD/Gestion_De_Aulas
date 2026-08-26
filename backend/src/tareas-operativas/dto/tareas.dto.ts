import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { EstadoTarea } from '../../../generated/prisma/enums.js';
export class FindTareasDto {
  @IsOptional() @IsEnum(EstadoTarea) estado?: EstadoTarea;
  @IsOptional() @IsUUID() responsableId?: string;
  @IsOptional() @IsUUID() aulaId?: string;
  @IsOptional() @IsDateString() fecha?: string;
}
export class CambiarEstadoTareaDto {
  @IsEnum(EstadoTarea) estado!: EstadoTarea;
}
