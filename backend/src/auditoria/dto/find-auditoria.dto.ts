import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class FindAuditoriaDto {
  @IsOptional() @IsString() @MaxLength(100) entidad?: string;
  @IsOptional() @IsString() @MaxLength(100) entidadId?: string;
  @IsOptional() @IsUUID('4') usuarioId?: string;
  @IsOptional() @IsDateString() desde?: string;
  @IsOptional() @IsDateString() hasta?: string;
}
