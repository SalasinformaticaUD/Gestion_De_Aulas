import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class AsignarSoftwareAulaDto {
  @IsUUID()
  softwareId!: string;

  @IsOptional()
  @IsDateString()
  instaladoEn?: string;
}

export class CreateAulaSoftwareDto extends AsignarSoftwareAulaDto {
  @IsUUID()
  aulaId!: string;
}
