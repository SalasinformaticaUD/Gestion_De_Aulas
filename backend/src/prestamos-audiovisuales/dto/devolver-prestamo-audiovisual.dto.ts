import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsString,
  IsUUID,
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
  devolucionReal: string | undefined;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique((equipo: EquipoDevueltoAudiovisualDto) => equipo.equipoId)
  @ValidateNested({ each: true })
  @Type(() => EquipoDevueltoAudiovisualDto)
  equipos: EquipoDevueltoAudiovisualDto[] | undefined;
}
