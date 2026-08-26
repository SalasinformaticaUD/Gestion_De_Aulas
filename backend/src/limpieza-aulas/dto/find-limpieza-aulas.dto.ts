import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class FindLimpiezaAulasDto {
  @IsOptional()
  @IsUUID()
  aulaId?: string;

  @IsOptional()
  @IsDateString()
  desde?: string;

  @IsOptional()
  @IsDateString()
  hasta?: string;
}

export class ConsultarSugerenciasLimpiezaDto {
  @IsDateString()
  fecha!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite?: number;
}

export class ConsultarMatrizLimpiezaDto extends FindLimpiezaAulasDto {}

export class ConsultarIndicadoresLimpiezaDto extends FindLimpiezaAulasDto {}
