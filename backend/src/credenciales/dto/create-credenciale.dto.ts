import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsArray,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { EstadoCredencial } from '../../../generated/prisma/enums.js';
export class CreateCredencialeDto {
  @IsString() @MinLength(1) @MaxLength(160) nombre!: string;
  @IsOptional() @IsString() @MaxLength(200) usuario?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(4000) secreto?: string;
  @IsOptional() @IsString() @MaxLength(2000) descripcion?: string;
  @IsOptional() @IsEnum(EstadoCredencial) estado?: EstadoCredencial;
  @IsOptional() @IsArray() accesos?: AccesoInicialDto[];
}
export class AccesoInicialDto {
  @IsUUID() usuarioId!: string;
  @IsOptional() @IsBoolean() puedeVer?: boolean;
  @IsOptional() @IsBoolean() puedeEditar?: boolean;
}
