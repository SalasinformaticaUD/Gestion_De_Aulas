import { ArrayUnique, IsArray, IsBoolean, IsUUID } from 'class-validator';

export class UpdateConfiguracionDistribucionPdfDto {
  @IsBoolean()
  activa!: boolean;

  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  usuarioIds!: string[];
}
