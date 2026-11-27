import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import {
  ModalidadCargaDocumental,
  TipoIdentificacionContratista,
} from '@prisma/client';

export class CreateVerificacionDto {
  @IsEnum(TipoIdentificacionContratista)
  tipoIdentificacion!: TipoIdentificacionContratista;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 40)
  @Matches(/^[A-Za-z0-9]+$/, {
    message:
      'El número de identificación debe contener solo letras y números, sin espacios ni puntos.',
  })
  numeroIdentificacion!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @IsString()
  @Length(2, 200)
  nombreCompleto!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha de solicitud debe usar el formato AAAA-MM-DD.',
  })
  @IsDateString({ strict: true })
  fechaSolicitud!: string;

  @IsEnum(ModalidadCargaDocumental)
  modalidadCarga!: ModalidadCargaDocumental;
}
