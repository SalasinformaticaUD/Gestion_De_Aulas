import { Transform } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';

const FECHA_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const HORA_PATTERN = /^([01]\d|2[0-3]):00$/;

export class ConsultarDisponibilidadDto {
  @Matches(FECHA_PATTERN, { message: 'fecha debe tener formato YYYY-MM-DD' })
  @IsDateString()
  fecha!: string;

  @Matches(HORA_PATTERN, {
    message: 'horaInicio debe ser una hora completa con formato HH:00',
  })
  horaInicio!: string;

  @Matches(HORA_PATTERN, {
    message: 'horaFin debe ser una hora completa con formato HH:00',
  })
  horaFin!: string;

  @IsOptional()
  @IsUUID('4')
  softwareId?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsInt()
  @Min(1)
  capacidadMin?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
        : value,
  )
  @IsArray()
  @IsString({ each: true })
  caracteristicas?: string[];
}
