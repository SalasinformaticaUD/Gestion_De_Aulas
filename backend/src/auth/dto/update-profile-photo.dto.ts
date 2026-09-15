import { IsOptional, IsString, MaxLength } from 'class-validator';

/** La foto o GIF se recibe como data URL para persistirlo junto con el perfil. */
export class UpdateProfilePhotoDto {
  @IsOptional()
  @IsString()
  @MaxLength(4_200_000)
  fotoPerfil?: string | null;
}
