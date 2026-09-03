import {
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreatePrestamosDocenteDto {
  @IsOptional()
  @IsUUID()
  docenteId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  docenteNuevoNombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  docenteNuevoDocumento?: string;

  @IsUUID()
  aulaId!: string;

  @IsOptional()
  @IsUUID()
  softwareId?: string;

  @IsISO8601({ strict: true })
  inicio!: string;

  @IsISO8601({ strict: true })
  fin!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}
