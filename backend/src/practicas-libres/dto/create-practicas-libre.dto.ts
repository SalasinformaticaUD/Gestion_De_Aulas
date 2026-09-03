import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ResponsablePracticaLibre {
  MONITOR = 'MONITOR',
  TECNICO = 'TECNICO',
  ASISTENCIAL = 'ASISTENCIAL',
}

export enum TipoSolicitantePracticaLibre { ESTUDIANTE = 'ESTUDIANTE', DOCENTE = 'DOCENTE' }

export class ResponsableSolicitudPracticaDto {
  @IsEnum(TipoSolicitantePracticaLibre) tipo!: TipoSolicitantePracticaLibre;
  @IsString() @Length(3, 50) documento!: string;
  @IsString() @Length(3, 160) nombre!: string;
  @IsOptional() @IsEmail() @MaxLength(160) correo?: string;
}

export class CreatePracticasLibreDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ResponsableSolicitudPracticaDto)
  responsables?: ResponsableSolicitudPracticaDto[];
  @IsString()
  @Length(3, 30)
  codigoEstudiante!: string;

  @IsString()
  @Length(3, 120)
  nombreEstudiante!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  correoEstudiante?: string;

  @IsUUID()
  aulaId!: string;

  @IsOptional()
  @IsUUID()
  softwareId?: string;

  @IsString()
  @Length(1, 160)
  softwareSolicitado!: string;

  @IsEnum(ResponsablePracticaLibre)
  responsableTipo!: ResponsablePracticaLibre;

  @IsISO8601({ strict: true })
  inicio!: string;

  @IsISO8601({ strict: true })
  finEstimada!: string;
}
