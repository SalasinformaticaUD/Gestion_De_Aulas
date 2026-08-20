import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const HORA_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

export class CreateClaseProgramadaDto {
  @IsUUID()
  periodoId!: string;

  @IsUUID()
  aulaId!: string;

  @IsUUID()
  docenteId!: string;

  @IsUUID()
  asignaturaId!: string;

  @IsOptional()
  @IsUUID()
  proyectoCurricularId?: string;

  @IsInt()
  @Min(1)
  @Max(6)
  diaSemana!: number;

  @Matches(HORA_PATTERN, {
    message: 'horaInicio debe tener formato HH:mm o HH:mm:ss',
  })
  horaInicio!: string;

  @Matches(HORA_PATTERN, {
    message: 'horaFin debe tener formato HH:mm o HH:mm:ss',
  })
  horaFin!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  grupo!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  inscritos?: number;
}
