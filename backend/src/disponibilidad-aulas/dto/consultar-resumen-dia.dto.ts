import { IsDateString, Matches } from 'class-validator';

const FECHA_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class ConsultarResumenDiaDto {
  @Matches(FECHA_PATTERN, { message: 'fecha debe tener formato YYYY-MM-DD' })
  @IsDateString()
  fecha!: string;
}
