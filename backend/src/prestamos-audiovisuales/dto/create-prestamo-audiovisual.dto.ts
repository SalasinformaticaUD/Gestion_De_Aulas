import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
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
  @IsOptional()
  @IsDateString()
  salidaEn?: string;

  @IsOptional()
  @IsUUID()
  docenteId?: string;

  @IsOptional()
  @IsUUID()
  aulaId?: string;

  @IsEnum(['MONITOR', 'TECNICO', 'ASISTENCIAL'])
  responsableTipo!: 'MONITOR' | 'TECNICO' | 'ASISTENCIAL';

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  docenteNombre!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  docenteDocumento!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  salonTexto!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  elementosAdicionales?: string[];

  @IsDateString()
  devolucionEstimada!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique((equipo: EquipoPrestamoAudiovisualDto) => equipo.equipoId)
  @ValidateNested({ each: true })
  @Type(() => EquipoPrestamoAudiovisualDto)
  equipos!: EquipoPrestamoAudiovisualDto[];
}
