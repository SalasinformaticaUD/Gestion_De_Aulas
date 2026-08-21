import { IsISO8601, IsOptional } from 'class-validator';

export class FinalizarPracticaLibreDto {
  @IsOptional()
  @IsISO8601({ strict: true })
  finReal?: string;
}
