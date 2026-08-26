import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
export class CreateTareasOperativaDto {
  @IsOptional() @IsUUID() aulaId?: string;
  @IsOptional() @IsUUID() responsableId?: string;
  @IsString() @MaxLength(200) titulo!: string;
  @IsOptional() @IsString() @MaxLength(2000) descripcion?: string;
  @IsOptional() @IsBoolean() afectaDisponibilidad?: boolean;
  @IsOptional() @IsDateString() inicio?: string;
  @IsOptional() @IsDateString() fin?: string;
}
