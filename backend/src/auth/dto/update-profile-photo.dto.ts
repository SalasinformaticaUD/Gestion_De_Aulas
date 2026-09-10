import { IsOptional, IsString, MaxLength } from 'class-validator';

/** La foto se recibe como data URL para persistirla junto con el perfil. */
export class UpdateProfilePhotoDto {
  @IsOptional()
  @IsString()
  @MaxLength(2_800_000)
  fotoPerfil?: string | null;
}
