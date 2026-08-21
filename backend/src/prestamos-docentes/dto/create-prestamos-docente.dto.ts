import {
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreatePrestamosDocenteDto {
  @IsUUID()
  docenteId!: string;

  @IsUUID()
  aulaId!: string;

  @IsISO8601({ strict: true })
  inicio!: string;

  @IsISO8601({ strict: true })
  fin!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}
