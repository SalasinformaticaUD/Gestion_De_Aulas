import {
  IsEmail,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';

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

  @IsISO8601({ strict: true })
  inicio!: string;

  @IsISO8601({ strict: true })
  finEstimada!: string;
}
