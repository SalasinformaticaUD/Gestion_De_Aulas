import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class FilaImportacionSoftwareDto {
  @IsString()
  @IsNotEmpty()
  aulaCodigo!: string;

  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  version!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}

export class ImportarSoftwareDto {
  @IsOptional()
  @IsUUID()
  usuarioId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombreArchivo?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => FilaImportacionSoftwareDto)
  filas!: FilaImportacionSoftwareDto[];
}
