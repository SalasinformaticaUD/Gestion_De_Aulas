import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangeUsernameDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  nombreUsuario!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  contrasenaActual!: string;
}
