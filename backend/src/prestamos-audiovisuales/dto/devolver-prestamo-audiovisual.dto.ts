import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class EquipoDevueltoAudiovisualDto {
  @IsUUID()
  equipoId!: string;

  @IsString()
  @IsNotEmpty()
  estadoFisicoDevolucion!: string;

  @IsString()
  @IsNotEmpty()
  estadoFuncionalDevolucion!: string;
}

export class DevolverPrestamoAudiovisualDto {
  @IsDateString()
  devolucionReal!: string;

  @IsArray()
  @ArrayUnique((equipo: EquipoDevueltoAudiovisualDto) => equipo.equipoId)
  @ValidateNested({ each: true })
  @Type(() => EquipoDevueltoAudiovisualDto)
  equipos!: EquipoDevueltoAudiovisualDto[];

  @IsOptional()
  @IsEnum(['MONITOR', 'TECNICO', 'ASISTENCIAL'])
  recibidoPorTipo?: 'MONITOR' | 'TECNICO' | 'ASISTENCIAL';

  @IsOptional()
  @IsUUID()
  recibidoPorId?: string;

  @IsBoolean()
  devolucionCompleta!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observaciones?: string;
}
