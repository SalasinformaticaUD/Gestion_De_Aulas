import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { EstadoCredencial } from '../../../generated/prisma/enums.js';
export class FindCredencialesDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() categoria?: string;
  @IsOptional() @IsUUID() responsableId?: string;
  @IsOptional() @IsEnum(EstadoCredencial) estado?: EstadoCredencial;
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
