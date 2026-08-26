import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { EstadoCredencial } from '../../../generated/prisma/enums.js';
export class CreateCredencialeDto {
  @IsString() @MinLength(1) @MaxLength(160) nombre!: string;
  @IsString() @MinLength(1) @MaxLength(100) categoria!: string;
  @IsOptional() @IsString() @MaxLength(200) usuario?: string;
  @IsString() @MinLength(1) @MaxLength(4000) secreto!: string;
  @IsOptional() @IsString() @MaxLength(2000) descripcion?: string;
  @IsOptional() @IsEnum(EstadoCredencial) estado?: EstadoCredencial;
}
