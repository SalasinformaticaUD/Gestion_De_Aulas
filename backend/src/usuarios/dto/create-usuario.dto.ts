import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateUsuarioDto {
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  nombreCompleto!: string;

  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  nombreUsuario!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  correo!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(128)
  password!: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  cargo?: string;

  @IsOptional()
  @IsUUID('4')
  dependenciaId?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  rolIds?: string[];
}
