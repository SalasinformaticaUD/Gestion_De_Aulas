import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class FindClasesDto {
  @IsOptional()
  @IsUUID()
  aulaId?: string;

  @IsOptional()
  @IsUUID()
  periodoId?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  diaSemana?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(26)
  semana?: number;

  @IsOptional()
  @IsDateString()
  fecha?: string;
}
