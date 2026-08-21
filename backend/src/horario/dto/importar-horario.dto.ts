import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { OmitType } from '@nestjs/mapped-types';
import { CreateClaseProgramadaDto } from './create-clase-programada.dto';

export class DocenteImportacionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  documento!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  correo?: string;
}

export class AsignaturaImportacionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  codigo!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre!: string;
}

export class ClaseImportacionDto extends OmitType(CreateClaseProgramadaDto, [
  'periodoId',
  'docenteId',
  'asignaturaId',
] as const) {
  @IsOptional()
  @IsUUID()
  docenteId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DocenteImportacionDto)
  docente?: DocenteImportacionDto;

  @IsOptional()
  @IsUUID()
  asignaturaId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AsignaturaImportacionDto)
  asignatura?: AsignaturaImportacionDto;
}

export class ImportarHorarioDto {
  @IsIn(['JSON_V1', 'JSON_V2'])
  formato!: 'JSON_V1' | 'JSON_V2';

  @IsUUID()
  periodoId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nombreArchivo?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ClaseImportacionDto)
  clases!: ClaseImportacionDto[];
}
