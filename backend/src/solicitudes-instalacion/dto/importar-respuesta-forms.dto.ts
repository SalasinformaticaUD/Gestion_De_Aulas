import {
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ImportarRespuestaFormsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  responseId!: string;

  @IsISO8601({ strict: true })
  fechaRecepcion!: string;

  @IsString()
  @MaxLength(320)
  correoRespondiente!: string;

  @IsString()
  @MaxLength(300)
  nombreRespondiente!: string;

  @IsString()
  @MaxLength(300)
  docenteNombre!: string;

  @IsString()
  @MaxLength(320)
  docenteCorreo!: string;

  @IsString()
  @MaxLength(500)
  proyectoCurricular!: string;

  @IsString()
  @MaxLength(5_000)
  aulasSeleccionadas!: string;

  @IsString()
  @MaxLength(5_000)
  aulasEscritas!: string;

  @IsOptional() @IsString() @MaxLength(500) asignatura1?: string;
  @IsOptional() @IsString() @MaxLength(5_000) software1?: string;
  @IsOptional() @IsString() @MaxLength(100) continuar2?: string;
  @IsOptional() @IsString() @MaxLength(500) asignatura2?: string;
  @IsOptional() @IsString() @MaxLength(5_000) software2?: string;
  @IsOptional() @IsString() @MaxLength(5_000) observacion2?: string;
  @IsOptional() @IsString() @MaxLength(100) continuar3?: string;
  @IsOptional() @IsString() @MaxLength(500) asignatura3?: string;
  @IsOptional() @IsString() @MaxLength(5_000) software3?: string;
  @IsOptional() @IsString() @MaxLength(5_000) observacion3?: string;
  @IsOptional() @IsString() @MaxLength(100) continuar4?: string;
  @IsOptional() @IsString() @MaxLength(500) asignatura4?: string;
  @IsOptional() @IsString() @MaxLength(5_000) software4?: string;
  @IsOptional() @IsString() @MaxLength(5_000) observacion4?: string;
  @IsOptional() @IsString() @MaxLength(100) continuar5?: string;
  @IsOptional() @IsString() @MaxLength(500) asignatura5?: string;
  @IsOptional() @IsString() @MaxLength(5_000) software5?: string;
  @IsOptional() @IsString() @MaxLength(5_000) observacion5?: string;
  @IsOptional() @IsString() @MaxLength(10_000) observacionGeneral?: string;
}
