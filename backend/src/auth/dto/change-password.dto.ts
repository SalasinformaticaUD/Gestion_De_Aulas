import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  contrasenaActual!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(128)
  nuevaContrasena!: string;
}
