import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EstadoEquipo } from '../../../generated/prisma/enums.js';

export class CreateEquipoAudiovisualDto {
  @IsString()
  @IsNotEmpty()
  codigoInventario!: string;

  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  tipo!: string;

  @IsOptional()
  @IsEnum(EstadoEquipo)
  estado?: EstadoEquipo;

  @IsOptional()
  @IsString()
  observacion?: string;
}
