import { IsDateString, Matches } from 'class-validator';

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
}
