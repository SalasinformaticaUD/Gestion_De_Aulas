import {
  IsEmail,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';

export enum ResponsablePracticaLibre {
  MONITOR = 'MONITOR',
  TECNICO = 'TECNICO',
  ASISTENCIAL = 'ASISTENCIAL',
}

export class CreatePracticasLibreDto {
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

  @IsUUID()
  softwareId!: string;

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
