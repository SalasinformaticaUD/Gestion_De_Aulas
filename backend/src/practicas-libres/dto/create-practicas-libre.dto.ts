import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ResponsablePracticaLibre {
  MONITOR = 'MONITOR',
  TECNICO = 'TECNICO',
  ASISTENCIAL = 'ASISTENCIAL',
}

export enum TipoSolicitantePracticaLibre {
  ESTUDIANTE = 'ESTUDIANTE',
  DOCENTE = 'DOCENTE',
}

export class ResponsableSolicitudPracticaDto {
  @IsEnum(TipoSolicitantePracticaLibre) tipo!: TipoSolicitantePracticaLibre;
  @IsString() @Length(3, 50) documento!: string;
  @IsString() @Length(3, 160) nombre!: string;
  @ValidateIf((item: ResponsableSolicitudPracticaDto) => item.tipo === TipoSolicitantePracticaLibre.ESTUDIANTE)
  @IsEmail() @IsNotEmpty() @MaxLength(160) correo?: string;
  @ValidateIf((item: ResponsableSolicitudPracticaDto) => item.tipo === TipoSolicitantePracticaLibre.DOCENTE)
  @IsString() @IsNotEmpty() @MaxLength(160) proyecto?: string;
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

  @ValidateIf((item: CreatePracticasLibreDto) => !item.responsables?.length)
  @IsEmail()
  @IsNotEmpty()
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

  @IsOptional()
  @IsUUID()
  atendidoPorId?: string;

  @IsISO8601({ strict: true })
  inicio!: string;

  @IsISO8601({ strict: true })
  finEstimada!: string;
}
