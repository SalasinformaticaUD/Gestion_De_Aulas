import {
  IsBoolean,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { EstadoCredencial } from '../../../generated/prisma/enums.js';
export class FindCredencialesDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsUUID() responsableId?: string;
  @IsOptional() @IsEnum(EstadoCredencial) estado?: EstadoCredencial;
}
export class GuardarSecretoCredencialDto {
  @IsString() @MaxLength(4000) secreto!: string;
}
export class ActualizarRolesCredencialDto {
  @IsArray() @IsUUID('4', { each: true }) rolIds!: string[];
}
export class ConsultarSecretoCredencialDto {
  @IsString() @MaxLength(200) contrasena!: string;
}
export class CrearAccesoCredencialDto {
  @IsUUID() usuarioId!: string;
  @IsOptional() @IsBoolean() puedeVer?: boolean;
  @IsOptional() @IsBoolean() puedeEditar?: boolean;
}
export class CambiarEstadoCredencialDto {
  @IsEnum(EstadoCredencial) estado!: EstadoCredencial;
  @IsString() @MaxLength(500) motivoCambio!: string;
}
