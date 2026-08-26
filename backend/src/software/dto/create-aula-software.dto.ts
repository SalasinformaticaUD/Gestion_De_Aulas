import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class AsignarSoftwareAulaDto {
  @ValidateIf((dto: AsignarSoftwareAulaDto) => !dto.nombre)
  @IsUUID()
  @IsOptional()
  softwareId?: string;

  @ValidateIf((dto: AsignarSoftwareAulaDto) => !dto.softwareId)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre?: string;

  @ValidateIf((dto: AsignarSoftwareAulaDto) => !dto.softwareId)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  version?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descripcion?: string;

  @IsOptional()
  @IsDateString()
  instaladoEn?: string;
}

export class CreateAulaSoftwareDto extends AsignarSoftwareAulaDto {
  @IsUUID()
  aulaId!: string;
}
