import { IsArray, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { EstadoTarea, DecisionTarea } from '@prisma/client';
export class FindTareasDto {
  @IsOptional() @IsEnum(EstadoTarea) estado?: EstadoTarea;
  @IsOptional() @IsUUID() responsableId?: string;
  @IsOptional() @IsUUID() aulaId?: string;
  @IsOptional() @IsDateString() fechaDesde?: string;
  @IsOptional() @IsDateString() fechaHasta?: string;
  // Compatibilidad con la consulta previa de un solo día.
  @IsOptional() @IsDateString() fecha?: string;
}
export class CambiarEstadoTareaDto {
  @IsEnum(EstadoTarea) estado!: EstadoTarea;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(2000) motivoCancelacion?: string;
}
export class DecidirTareaDto {
  @IsEnum(DecisionTarea) decision!: DecisionTarea;
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) responsableIds?: string[];
}
export class CrearInformeSeguimientoDto {
  @IsString() @IsNotEmpty() actividadesRealizadas!: string;
  @IsOptional() @IsString() accionesPendientes?: string;
}
