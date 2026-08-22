import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  ValidateIf,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateMultaDto {
  @ValidateIf(
    (dto: CreateMultaDto) =>
      dto.codigoEstudiante === undefined || dto.codigoEstudiante === null,
  )
  @IsUUID()
  estudianteId?: string;

  @Transform(trim)
  @ValidateIf(
    (dto: CreateMultaDto) =>
      dto.estudianteId === undefined || dto.estudianteId === null,
  )
  @IsString()
  @Length(3, 30)
  codigoEstudiante?: string;

  @IsUUID()
  motivoId!: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  descripcion?: string;
}
