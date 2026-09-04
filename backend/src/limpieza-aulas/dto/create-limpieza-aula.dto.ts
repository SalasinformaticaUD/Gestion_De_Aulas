import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export const estadosLimpieza = ['REALIZADA', 'NOVEDAD'] as const;
export type EstadoLimpiezaDto = (typeof estadosLimpieza)[number];

export class CreateLimpiezaAulaDto {
  @IsUUID()
  aulaId!: string;

  @IsOptional()
  @IsDateString()
  realizadaEn?: string;

  @IsOptional()
  @IsIn(estadosLimpieza)
  estado?: EstadoLimpiezaDto;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  observacion?: string;
}
