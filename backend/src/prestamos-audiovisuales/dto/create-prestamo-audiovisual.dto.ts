import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class EquipoPrestamoAudiovisualDto {
  @IsUUID()
  equipoId!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  estadoFisicoSalida?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  estadoFuncionalSalida?: string;
}

export class CreatePrestamoAudiovisualDto {
  @IsUUID()
  docenteId!: string;

  @IsUUID()
  aulaId!: string;

  @IsDateString()
  salidaEn!: string;

  @IsDateString()
  devolucionEstimada!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique((equipo: EquipoPrestamoAudiovisualDto) => equipo.equipoId)
  @ValidateNested({ each: true })
  @Type(() => EquipoPrestamoAudiovisualDto)
  equipos!: EquipoPrestamoAudiovisualDto[];
}
