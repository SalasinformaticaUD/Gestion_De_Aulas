import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const ESTADOS_NORMALIZACION = [
  'PENDIENTE',
  'COINCIDENCIA',
  'NUEVO',
  'AMBIGUO',
  'DESCARTADO',
] as const;
const ESTADOS_REVISION = [
  'PENDIENTE',
  'VALIDADO',
  'REQUIERE_AJUSTES',
  'DESCARTADO',
] as const;

export class UpdateSolicitudInstalacionDto {
  @IsOptional() @ValidateIf((_, valor) => valor !== null) @IsUUID() docenteId?:
    string | null;
  @IsOptional() @ValidateIf((_, valor) => valor !== null) @IsUUID() periodoId?:
    string | null;
}

export class UpdateAulaSolicitudDto {
  @IsUUID() id!: string;
  @IsOptional() @ValidateIf((_, valor) => valor !== null) @IsUUID() aulaId?:
    string | null;
  @IsOptional()
  @ValidateIf((_, valor) => valor !== null)
  @IsString()
  valorNormalizado?: string | null;
  @IsOptional()
  @IsIn(ESTADOS_NORMALIZACION)
  estado?: (typeof ESTADOS_NORMALIZACION)[number];
  @IsOptional() @IsBoolean() guardarAlias?: boolean;
}

export class UpdateItemSolicitudDto {
  @IsOptional()
  @IsIn(ESTADOS_REVISION)
  estadoRevision?: (typeof ESTADOS_REVISION)[number];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateAulaSolicitudDto)
  aulas?: UpdateAulaSolicitudDto[];
}
