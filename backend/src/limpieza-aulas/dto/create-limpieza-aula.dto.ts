import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateLimpiezaAulaDto {
  @IsUUID()
  aulaId!: string;

  @IsOptional()
  @IsDateString()
  realizadaEn?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  observacion?: string;
}
