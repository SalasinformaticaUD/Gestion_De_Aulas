import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class ProvisionMonitorUserDto {
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

  @IsOptional()
  @IsUUID('4')
  dependenciaId?: string;
}
