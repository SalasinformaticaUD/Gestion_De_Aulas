import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class SeleccionSoftwareSolicitudDto {
  @IsUUID() softwareSolicitadoId!: string;
  @IsArray() @ArrayMinSize(1) @IsUUID('4', { each: true }) aulaIds!: string[];
}

export class SeleccionItemSolicitudDto {
  @IsUUID() itemId!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SeleccionSoftwareSolicitudDto)
  software!: SeleccionSoftwareSolicitudDto[];
}

export class AprobarSolicitudInstalacionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SeleccionItemSolicitudDto)
  items!: SeleccionItemSolicitudDto[];
}

export class RechazarSolicitudInstalacionDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(2000)
  motivo!: string;
}
