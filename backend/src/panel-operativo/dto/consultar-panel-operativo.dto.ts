import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';

const HORA_PATTERN = /^([01]\d|2[0-3]):00$/;

export class ConsultarPanelOperativoDto {
  @IsDateString()
  fecha!: string;

  @IsOptional()
  @Matches(HORA_PATTERN)
  horaInicio?: string;
}

export class ConsultarAulasPanelOperativoDto extends ConsultarPanelOperativoDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsInt()
  @Min(1)
  pagina = 1;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limite = 20;
}
