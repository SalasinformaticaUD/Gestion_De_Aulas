import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateDocenteDto {
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(160) nombre!: string;
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(50) documento!: string;
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim()
      ? value.trim().toLowerCase()
      : undefined,
  )
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  correo?: string;
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(160) proyecto!: string;
}
