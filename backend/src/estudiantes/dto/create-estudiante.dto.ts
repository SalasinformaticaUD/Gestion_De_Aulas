import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
export class CreateEstudianteDto {
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(50) codigo!: string;
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(160) nombre!: string;
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(254)
  correo!: string;
}
